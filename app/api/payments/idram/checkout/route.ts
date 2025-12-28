import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrebookState, getSessionFromCookie } from "@/app/api/aoryx/_shared";
import { parseBookingPayload, validatePrebookState } from "@/lib/aoryx-booking";
import { calculateBookingTotal } from "@/lib/booking-total";
import { convertToAmd, getEffectiveAmdRates } from "@/lib/pricing";
import type { AoryxBookingPayload } from "@/types/aoryx";

export const runtime = "nodejs";

const IDRAM_ACTION = "https://banking.idram.am/Payment/GetPayment";
const DEFAULT_LANGUAGE = "EN";

const parseSessionId = (input: unknown): string | undefined => {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildBillNo = () => {
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${Date.now()}${suffix}`;
};

const formatAmount = (value: number) => value.toFixed(2);

const normalizeLanguage = (value: string | undefined) => {
  const normalized = (value ?? DEFAULT_LANGUAGE).trim().toUpperCase();
  if (normalized === "AM" || normalized === "RU" || normalized === "EN") return normalized;
  return DEFAULT_LANGUAGE;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId =
      parseSessionId((body as { sessionId?: unknown }).sessionId) ??
      getSessionFromCookie(request);

    let payload: AoryxBookingPayload;
    try {
      payload = parseBookingPayload(body, sessionId);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid booking payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const prebookState = getPrebookState(request);
    try {
      validatePrebookState(prebookState, payload);
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : "Rate selection changed. Please prebook again.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const recAccount = typeof process.env.IDRAM_REC_ACCOUNT === "string"
      ? process.env.IDRAM_REC_ACCOUNT.trim()
      : "";
    if (!recAccount) {
      return NextResponse.json(
        { error: "Idram is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const baseAmount = calculateBookingTotal(payload);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return NextResponse.json({ error: "Invalid booking total." }, { status: 400 });
    }

    let amountValue = baseAmount;
    let amountCurrency = payload.currency;

    try {
      const rates = await getEffectiveAmdRates();
      const converted = convertToAmd(baseAmount, payload.currency, rates);
      if (converted === null) {
        throw new Error("Missing exchange rate");
      }
      amountValue = Math.round(converted);
      amountCurrency = "AMD";
    } catch (error) {
      console.error("[Idram][checkout] Failed to convert amount", error);
      return NextResponse.json(
        { error: "Failed to calculate AMD total. Please try again." },
        { status: 500 }
      );
    }

    const amountFormatted = formatAmount(amountValue);
    const billNo = buildBillNo();
    const language = normalizeLanguage(process.env.IDRAM_LANGUAGE);
    const description = `Hotel booking ${payload.hotelCode} (${payload.customerRefNumber})`;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? null;

    const now = new Date();
    const db = await getDb();

    await db.collection("idram_payments").insertOne({
      billNo,
      status: "created",
      recAccount,
      amount: {
        value: amountValue,
        formatted: amountFormatted,
        currency: amountCurrency,
        baseValue: baseAmount,
        baseCurrency: payload.currency,
      },
      description,
      payload,
      prebookState,
      userId,
      userEmail,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      action: IDRAM_ACTION,
      billNo,
      fields: {
        EDP_LANGUAGE: language,
        EDP_REC_ACCOUNT: recAccount,
        EDP_DESCRIPTION: description,
        EDP_AMOUNT: amountFormatted,
        EDP_BILL_NO: billNo,
        ...(userEmail ? { EDP_EMAIL: userEmail } : {}),
      },
    });
  } catch (error) {
    console.error("[Idram][checkout] Failed to initialize payment", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
