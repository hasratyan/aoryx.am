import { NextRequest, NextResponse } from "next/server";
import { fetchTransferRates } from "@/lib/aoryx-addons";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const destinationLocationCode =
      typeof body.destinationLocationCode === "string" ? body.destinationLocationCode.trim() : "";
    const destinationName =
      typeof body.destinationName === "string" ? body.destinationName.trim() : "";
    const transferType =
      typeof body.transferType === "string" && body.transferType.trim().length > 0
        ? body.transferType.trim().toUpperCase()
        : undefined;
    const paxCount = Number(body.paxCount);
    const travelDate = body.travelDate;

    if (!destinationLocationCode && !destinationName) {
      return NextResponse.json(
        { error: "destinationLocationCode or destinationName is required" },
        { status: 400 }
      );
    }

    const transfers = await fetchTransferRates({
      destinationLocationCode,
      destinationName,
      transferType,
      paxCount,
      travelDate,
    });

    return NextResponse.json({
      transfers,
      destinationLocationCode,
      destinationName: destinationName || null,
    });
  } catch (error) {
    console.error("[Transfers] Failed to fetch transfer options", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer options" },
      { status: 500 }
    );
  }
}
