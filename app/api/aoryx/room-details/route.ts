import { NextRequest, NextResponse } from "next/server";
import { roomDetails, AoryxServiceError, AoryxClientError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import type { AoryxSearchParams, AoryxRoomSearch } from "@/types/aoryx";
import { obfuscateRoomOptions } from "@/lib/aoryx-rate-tokens";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const hotelCode =
      typeof body.hotelCode === "string" && body.hotelCode.trim().length > 0
        ? body.hotelCode.trim()
        : undefined;
    const destinationCode =
      typeof body.destinationCode === "string" && body.destinationCode.trim().length > 0
        ? body.destinationCode.trim()
        : undefined;
    const countryCode =
      typeof body.countryCode === "string" ? body.countryCode.trim() : "AE";
    const nationality =
      typeof body.nationality === "string" ? body.nationality.trim() : "AM";
    const currency =
      typeof body.currency === "string" ? body.currency.trim() : "USD";
    const checkInDate =
      typeof body.checkInDate === "string" && body.checkInDate.trim().length > 0
        ? body.checkInDate.trim()
        : undefined;
    const checkOutDate =
      typeof body.checkOutDate === "string" && body.checkOutDate.trim().length > 0
        ? body.checkOutDate.trim()
        : undefined;

    if (!hotelCode) {
      return NextResponse.json({ error: "hotelCode is required" }, { status: 400 });
    }

    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: "checkInDate and checkOutDate are required" },
        { status: 400 }
      );
    }

    let rooms: AoryxRoomSearch[] = [];
    if (Array.isArray(body.rooms) && body.rooms.length > 0) {
      rooms = body.rooms.map((room: Record<string, unknown>, index: number) => ({
        roomIdentifier: typeof room.roomIdentifier === "number" ? room.roomIdentifier : index + 1,
        adults: typeof room.adults === "number" ? room.adults : 2,
        childrenAges: Array.isArray(room.childrenAges)
          ? room.childrenAges.filter((age): age is number => typeof age === "number")
          : [],
      }));
    } else {
      rooms = [{ roomIdentifier: 1, adults: 2, childrenAges: [] }];
    }

    const params: AoryxSearchParams = {
      destinationCode,
      hotelCode,
      countryCode,
      nationality,
      checkInDate,
      checkOutDate,
      currency,
      regionId: AORYX_TASSPRO_REGION_ID,
      customerCode: AORYX_TASSPRO_CUSTOMER_CODE,
      rooms,
    };

    const result = await roomDetails(params);
    const obfuscatedRooms = obfuscateRoomOptions(result.rooms, {
      sessionId: result.sessionId,
      hotelCode,
    });
    const response = NextResponse.json({
      currency: result.currency ?? null,
      rooms: obfuscatedRooms,
    });

    return response;
  } catch (error) {
    console.error("Room details error:", error);

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
      { error: "Failed to load room options" },
      { status: 500 }
    );
  }
}
