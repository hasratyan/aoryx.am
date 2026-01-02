import { NextRequest, NextResponse } from "next/server";
import { searchFlydubai, FlydubaiClientError, FlydubaiServiceError } from "@/lib/flydubai-client";
import type { FlydubaiSearchRequest } from "@/types/flydubai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const origin = typeof body.origin === "string" ? body.origin.trim() : "";
    const destination = typeof body.destination === "string" ? body.destination.trim() : "";
    const departureDate =
      typeof body.departureDate === "string" ? body.departureDate.trim() : "";
    const returnDate = typeof body.returnDate === "string" ? body.returnDate.trim() : "";
    const cabinClass = typeof body.cabinClass === "string" ? body.cabinClass.trim() : "";
    const adults = typeof body.adults === "number" ? body.adults : undefined;
    const children = typeof body.children === "number" ? body.children : undefined;
    const currency = typeof body.currency === "string" ? body.currency.trim() : undefined;

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: "origin, destination, and departureDate are required" },
        { status: 400 }
      );
    }

    const payload: FlydubaiSearchRequest = {
      origin,
      destination,
      departureDate,
      returnDate: returnDate || null,
      cabinClass: cabinClass || null,
      adults,
      children,
      currency,
    };

    const result = await searchFlydubai(payload, { allowMock: true });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Flydubai][search] Failed to search flights", error);

    if (error instanceof FlydubaiServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof FlydubaiClientError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: "Failed to search flights" },
      { status: 500 }
    );
  }
}
