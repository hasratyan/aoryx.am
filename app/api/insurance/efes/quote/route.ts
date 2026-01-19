import { NextRequest, NextResponse } from "next/server";
import { EfesClientError, EfesServiceError, quoteEfesTravelCost } from "@/lib/efes-client";
import type { EfesQuoteRequest } from "@/types/efes";

export const runtime = "nodejs";

const parseString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startDate = parseString((body as { startDate?: unknown }).startDate);
    const endDate = parseString((body as { endDate?: unknown }).endDate);
    const territoryCode = parseString((body as { territoryCode?: unknown }).territoryCode);
    const riskAmount = parseNumber((body as { riskAmount?: unknown }).riskAmount);
    const riskCurrency = parseString((body as { riskCurrency?: unknown }).riskCurrency);
    const riskLabel = parseString((body as { riskLabel?: unknown }).riskLabel);
    const promoCode = parseString((body as { promoCode?: unknown }).promoCode);
    const days = parseNumber((body as { days?: unknown }).days);
    const subrisksRaw = (body as { subrisks?: unknown }).subrisks;
    const travelersRaw = (body as { travelers?: unknown }).travelers;

    if (!startDate || !endDate || !territoryCode || !riskAmount || !riskCurrency) {
      return NextResponse.json(
        { error: "Missing required EFES quote fields." },
        { status: 400 }
      );
    }

    if (!Array.isArray(travelersRaw) || travelersRaw.length === 0) {
      return NextResponse.json(
        { error: "Missing travelers for EFES quote." },
        { status: 400 }
      );
    }

    const travelers = travelersRaw
      .map((traveler) => {
        if (!traveler || typeof traveler !== "object") return null;
        const record = traveler as Record<string, unknown>;
        const age = parseNumber(record.age);
        if (age === null) return null;
        const travelerSubrisks = Array.isArray(record.subrisks)
          ? record.subrisks
              .map((entry) => parseString(entry))
              .filter((entry): entry is string => Boolean(entry))
          : undefined;
        return {
          id: parseString(record.id) || null,
          age,
          passportNumber: parseString(record.passportNumber) || null,
          socialCard: parseString(record.socialCard) || null,
          subrisks: travelerSubrisks,
        };
      })
      .filter((traveler): traveler is NonNullable<typeof traveler> => Boolean(traveler));

    if (travelers.length === 0) {
      return NextResponse.json(
        { error: "Travelers are missing required EFES quote details." },
        { status: 400 }
      );
    }

    const subrisks = Array.isArray(subrisksRaw)
      ? subrisksRaw
          .map((entry) => parseString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : undefined;

    const payload: EfesQuoteRequest = {
      startDate,
      endDate,
      territoryCode,
      riskAmount,
      riskCurrency,
      travelers,
      riskLabel: riskLabel || undefined,
      promoCode: promoCode || undefined,
      days: typeof days === "number" ? days : undefined,
      subrisks,
    };

    const result = await quoteEfesTravelCost(payload);
    const { raw: _raw, ...safe } = result;
    return NextResponse.json(safe);
  } catch (error) {
    if (error instanceof EfesClientError || error instanceof EfesServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to calculate insurance premium." },
      { status: 500 }
    );
  }
}
