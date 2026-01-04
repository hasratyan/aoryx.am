import { NextRequest, NextResponse } from "next/server";
import { getAmdRates } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    void request;
    const rates = await getAmdRates();
    return NextResponse.json(rates);
  } catch (error) {
    console.error("[ExchangeRates] Failed to load rates", error);
    return NextResponse.json(
      { error: "Failed to load exchange rates" },
      { status: 500 }
    );
  }
}
