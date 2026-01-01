import { NextRequest, NextResponse } from "next/server";
import { book, AoryxServiceError, AoryxClientError } from "@/lib/aoryx-client";
import type { AoryxBookingPayload } from "@/types/aoryx";
import { clearPrebookCookie, getPrebookState, getSessionFromCookie } from "../_shared";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserBooking } from "@/lib/user-data";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { parseBookingPayload, validatePrebookState } from "@/lib/aoryx-booking";
import { obfuscateBookingResult } from "@/lib/aoryx-rate-tokens";

export const runtime = "nodejs";

const parseSessionId = (input: unknown): string | undefined => {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale =
      typeof (body as { locale?: unknown }).locale === "string"
        ? (body as { locale?: string }).locale?.trim()
        : null;

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

    const result = await book(payload);
    const response = NextResponse.json(obfuscateBookingResult(result));
    clearPrebookCookie(response);

    try {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      if (userId) {
        await recordUserBooking({ userId, payload, result, source: "aoryx" });
      }
      if (session?.user?.email) {
        await sendBookingConfirmationEmail({
          to: session.user.email,
          name: session.user.name ?? null,
          payload,
          result,
          locale,
        });
      }
    } catch (error) {
      console.error("[Aoryx][book] Failed to record user booking", error);
    }
    return response;
  } catch (error) {
    console.error("Booking error:", error);

    if (error instanceof AoryxServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    if (error instanceof AoryxClientError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: "Failed to complete booking" },
      { status: 500 }
    );
  }
}
