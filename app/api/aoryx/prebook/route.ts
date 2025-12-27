import { NextRequest, NextResponse } from "next/server";
import { preBook, AoryxServiceError, AoryxClientError } from "@/lib/aoryx-client";
import { getSessionFromCookie, setPrebookCookie } from "../_shared";
import { decodeRateToken, hashRateKey, isRateToken } from "@/lib/aoryx-rate-tokens";

export const runtime = "nodejs";

const parseRateKeys = (input: unknown): string[] => {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("rateKeys must be a non-empty array");
  }
  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim().length > 0
        ? body.sessionId.trim()
        : getSessionFromCookie(request);

    const hotelCode =
      typeof body.hotelCode === "string" && body.hotelCode.trim().length > 0
        ? body.hotelCode.trim()
        : "";
    if (!hotelCode) {
      return NextResponse.json({ error: "hotelCode is required" }, { status: 400 });
    }

    let rateKeys: string[] = [];
    try {
      rateKeys = parseRateKeys(body.rateKeys);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid rateKeys payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const hasToken = rateKeys.some(isRateToken);
    const hasRaw = rateKeys.some((value) => !isRateToken(value));
    if (hasToken && hasRaw) {
      return NextResponse.json(
        { error: "Invalid rate selection. Please search again." },
        { status: 400 }
      );
    }

    let groupCodeFromTokens: number | null = null;
    if (hasToken) {
      try {
        const decoded = rateKeys.map((token) => decodeRateToken(token));
        const tokenSessionIds = new Set<string>();
        decoded.forEach((payload) => {
          if (payload.sessionId) tokenSessionIds.add(payload.sessionId);
          if (payload.sessionId && sessionId && payload.sessionId !== sessionId) {
            throw new Error("Rate token session mismatch.");
          }
          if (payload.hotelCode && payload.hotelCode !== hotelCode) {
            throw new Error("Rate token hotel mismatch.");
          }
        });
        const groupCodes = new Set(decoded.map((payload) => payload.groupCode));
        if (groupCodes.size !== 1) {
          throw new Error("Rate token group mismatch.");
        }
        groupCodeFromTokens = Array.from(groupCodes)[0];
        const tokenSessionId = tokenSessionIds.size === 1 ? Array.from(tokenSessionIds)[0] : null;
        if (!sessionId && tokenSessionId) {
          sessionId = tokenSessionId;
        }
        if (tokenSessionIds.size > 1) {
          throw new Error("Rate token session mismatch.");
        }
        rateKeys = decoded.map((payload) => payload.rateKey);
      } catch (tokenError) {
        console.error("[Aoryx][prebook] Invalid rate token", tokenError);
        return NextResponse.json(
          { error: "Invalid rate selection. Please search again." },
          { status: 400 }
        );
      }
    }

    const parsedGroupCode = Number(body.groupCode);
    const resolvedGroupCode = Number.isFinite(parsedGroupCode) ? parsedGroupCode : groupCodeFromTokens;
    if (resolvedGroupCode === null || !Number.isFinite(resolvedGroupCode)) {
      return NextResponse.json(
        { error: "Missing rate group. Please search again." },
        { status: 400 }
      );
    }
    if (groupCodeFromTokens !== null && groupCodeFromTokens !== resolvedGroupCode) {
      return NextResponse.json(
        { error: "Rate selection changed. Please search again." },
        { status: 409 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing Aoryx session. Please search again." },
        { status: 400 }
      );
    }

    const currency = typeof body.currency === "string" ? body.currency.trim() : undefined;

    const result = await preBook(sessionId, hotelCode, resolvedGroupCode, rateKeys, currency);

    const resolvedSessionId = result.sessionId || sessionId;
    const rooms = result.rooms.map((room) => ({
      roomIdentifier: typeof room.roomIdentifier === "number" ? room.roomIdentifier : null,
      policies: Array.isArray(room.policies) ? room.policies : [],
      remarks: Array.isArray(room.remarks) ? room.remarks : [],
      cancellationPolicy: room.cancellationPolicy ?? null,
    }));

    const response = NextResponse.json({
      isBookable: result.isBookable ?? null,
      isSoldOut: result.isSoldOut ?? null,
      isPriceChanged: result.isPriceChanged ?? null,
      currency: result.currency ?? null,
      rooms,
    });
    setPrebookCookie(response, {
      sessionId: resolvedSessionId,
      hotelCode,
      groupCode: resolvedGroupCode,
      rateKeyHashes: rateKeys.map(hashRateKey),
      isBookable: result.isBookable,
      isPriceChanged: result.isPriceChanged,
      recordedAt: Date.now(),
    });

    return response;
  } catch (error) {
    console.error("Prebook error:", error);

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
      { error: "Failed to prebook rate" },
      { status: 500 }
    );
  }
}
