import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "@/lib/db";
import { book } from "@/lib/aoryx-client";
import { recordUserBooking } from "@/lib/user-data";
import { sendBookingConfirmationEmail } from "@/lib/email";
import type { AoryxBookingPayload, AoryxBookingResult } from "@/types/aoryx";

export const runtime = "nodejs";

type IdramPaymentRecord = {
  billNo: string;
  status?: string;
  recAccount?: string;
  amount?: {
    value?: number;
    formatted?: string;
    currency?: string;
  };
  payload?: AoryxBookingPayload;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  locale?: string | null;
};

const textResponse = (message: string, status = 200) =>
  new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

const readField = (formData: FormData, key: string) => {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};

const parseAmount = (value: string): number | null => {
  if (!value) return null;
  const normalized = value.replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAmount = (value: number) => value.toFixed(2);

const checksumFor = (parts: string[]) =>
  createHash("md5").update(parts.join(":"), "utf8").digest("hex");

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const billNo = readField(formData, "EDP_BILL_NO");
  const recAccount = readField(formData, "EDP_REC_ACCOUNT");
  const amountRaw = readField(formData, "EDP_AMOUNT");
  const precheckFlag = readField(formData, "EDP_PRECHECK");

  if (!billNo || !recAccount || !amountRaw) {
    return textResponse("Missing payment details", 400);
  }

  const amountParsed = parseAmount(amountRaw);
  if (amountParsed === null) {
    return textResponse("Invalid payment amount", 400);
  }

  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb();
  } catch (error) {
    console.error("[Idram][result] Failed to connect to database", error);
    return textResponse("Payment lookup failed", 500);
  }

  const collection = db.collection("idram_payments");
  const record = (await collection.findOne({ billNo })) as IdramPaymentRecord | null;

  if (!record) {
    return textResponse("Unknown bill", 400);
  }

  if (record.recAccount && record.recAccount !== recAccount) {
    return textResponse("Account mismatch", 400);
  }

  const normalizedAmount = formatAmount(amountParsed);
  const amountMatches =
    (typeof record.amount?.formatted === "string" && record.amount.formatted === normalizedAmount) ||
    (typeof record.amount?.value === "number" && Math.abs(record.amount.value - amountParsed) < 0.01);

  if (!amountMatches) {
    return textResponse("Amount mismatch", 400);
  }

  if (precheckFlag.toUpperCase() === "YES") {
    try {
      await collection.updateOne(
        { billNo },
        {
          $set: {
            status: record.status === "created" ? "prechecked" : record.status ?? "prechecked",
            precheckAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    } catch (error) {
      console.error("[Idram][result] Failed to store precheck", error);
    }
    return textResponse("OK", 200);
  }

  const payerAccount = readField(formData, "EDP_PAYER_ACCOUNT");
  const transId = readField(formData, "EDP_TRANS_ID");
  const transDate = readField(formData, "EDP_TRANS_DATE");
  const checksum = readField(formData, "EDP_CHECKSUM");

  if (!payerAccount || !transId || !transDate || !checksum) {
    return textResponse("Missing confirmation details", 400);
  }

  const secretKey = typeof process.env.IDRAM_SECRET_KEY === "string"
    ? process.env.IDRAM_SECRET_KEY.trim()
    : "";
  if (!secretKey) {
    console.error("[Idram][result] Missing IDRAM_SECRET_KEY");
    return textResponse("Missing secret key", 500);
  }

  const expectedChecksum = checksumFor([
    recAccount,
    amountRaw,
    secretKey,
    billNo,
    payerAccount,
    transId,
    transDate,
  ]);

  if (expectedChecksum.toLowerCase() !== checksum.toLowerCase()) {
    return textResponse("Checksum mismatch", 400);
  }

  if (record.status === "booking_complete" || record.status === "booking_failed") {
    return textResponse("OK", 200);
  }

  const now = new Date();
  const lock = await collection.findOneAndUpdate(
    { billNo, status: { $nin: ["booking_complete", "booking_failed", "booking_in_progress"] } },
    {
      $set: {
        status: "booking_in_progress",
        paidAt: now,
        updatedAt: now,
        idram: {
          payerAccount,
          transId,
          transDate,
          checksum,
          amount: amountRaw,
        },
      },
    },
    { returnDocument: "after" }
  );

  const lockedRecord = (lock?.value ?? null) as IdramPaymentRecord | null;
  if (!lockedRecord) {
    return textResponse("OK", 200);
  }

  const payload = lockedRecord.payload as AoryxBookingPayload | undefined;
  if (!payload) {
    await collection.updateOne(
      { billNo },
      {
        $set: {
          status: "booking_failed",
          bookingError: "Missing booking payload",
          updatedAt: new Date(),
        },
      }
    );
    return textResponse("OK", 200);
  }

  try {
    const result: AoryxBookingResult = await book(payload);
    await collection.updateOne(
      { billNo },
      {
        $set: {
          status: "booking_complete",
          bookingResult: result,
          updatedAt: new Date(),
        },
      }
    );

    if (lockedRecord.userId) {
      try {
        await recordUserBooking({
          userId: lockedRecord.userId,
          payload,
          result,
          source: "aoryx-idram",
        });
      } catch (error) {
        console.error("[Idram][result] Failed to record user booking", error);
      }
    }

    if (lockedRecord.userEmail) {
      await sendBookingConfirmationEmail({
        to: lockedRecord.userEmail,
        name: lockedRecord.userName ?? null,
        payload,
        result,
        locale: lockedRecord.locale ?? null,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete booking";
    await collection.updateOne(
      { billNo },
      {
        $set: {
          status: "booking_failed",
          bookingError: message,
          updatedAt: new Date(),
        },
      }
    );
    console.error("[Idram][result] Booking failed", error);
  }

  return textResponse("OK", 200);
}
