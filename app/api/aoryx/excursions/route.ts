import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAoryxExcursionFee } from "@/lib/pricing";

export const runtime = "nodejs";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body.limit);
    const maxDocs = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 200;

    const db = await getDb();
    const query = { isActive: { $ne: false } };

    const [excursions, excursionFee] = await Promise.all([
      db
        .collection("aoryxExcursionTickets")
        .find(query)
        .sort({ name: 1, "pricing.adult": 1 })
        .limit(maxDocs)
        .toArray(),
      getAoryxExcursionFee(),
    ]);

    const applyFee = (value: unknown) => {
      const num = toNumber(value);
      return num !== null ? num + excursionFee : null;
    };

    const sanitizedExcursions = excursions.map((ex) => {
      const pricing = (ex as { pricing?: Record<string, unknown> }).pricing ?? {};
      const adult = applyFee(pricing.adult);
      const child = applyFee(pricing.child ?? pricing.adult);
      return {
        ...ex,
        pricing: {
          ...pricing,
          adult,
          child,
          feeApplied: true,
        },
      };
    });

    return NextResponse.json({
      excursions: sanitizedExcursions,
      destinationName: null,
      excursionFee,
    });
  } catch (error) {
    console.error("[Excursions] Failed to fetch excursion options", error);
    return NextResponse.json(
      { error: "Failed to fetch excursion options" },
      { status: 500 }
    );
  }
}
