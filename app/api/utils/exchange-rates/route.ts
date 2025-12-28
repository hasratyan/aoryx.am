import { NextRequest, NextResponse } from "next/server";
import { getAmdRates, getEffectiveAmdExcursionRates, getEffectiveAmdRates } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const rates =
      scope === "excursions"
        ? await getEffectiveAmdExcursionRates()
        : scope === "transfers"
          ? await getAmdRates()
          : await getEffectiveAmdRates();
    return NextResponse.json(rates);
  } catch (error) {
    console.error("[ExchangeRates] Failed to load rates", error);
    return NextResponse.json(
      { error: "Failed to load exchange rates" },
      { status: 500 }
    );
  }
}
