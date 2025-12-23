import { NextResponse } from "next/server";
import { getEffectiveAmdRates } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rates = await getEffectiveAmdRates();
    return NextResponse.json(rates);
  } catch (error) {
    console.error("[ExchangeRates] Failed to load rates", error);
    return NextResponse.json(
      { error: "Failed to load exchange rates" },
      { status: 500 }
    );
  }
}
