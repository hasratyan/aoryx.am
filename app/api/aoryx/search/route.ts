import { NextRequest, NextResponse } from "next/server";
import { search, AoryxServiceError, AoryxClientError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import { getAoryxHotelPlatformFee } from "@/lib/pricing";
import { applyMarkup } from "@/lib/pricing-utils";
import type { AoryxSearchParams, AoryxRoomSearch } from "@/types/aoryx";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserSearch } from "@/lib/user-data";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate required fields
    const destinationCode =
      typeof body.destinationCode === "string" ? body.destinationCode.trim() : undefined;
    const hotelCode =
      typeof body.hotelCode === "string" && body.hotelCode.trim().length > 0
        ? body.hotelCode.trim()
        : undefined;
    const countryCode =
      typeof body.countryCode === "string" ? body.countryCode.trim() : "AE";
    const nationality =
      typeof body.nationality === "string" ? body.nationality.trim() : "AM";
    const currency =
      typeof body.currency === "string" ? body.currency.trim() : "USD";
    const checkInDate =
    typeof body.checkInDate === "string" && body.checkInDate.trim().length
        ? body.checkInDate.trim()
        : undefined;
    const checkOutDate =
    typeof body.checkOutDate === "string" && body.checkOutDate.trim().length
        ? body.checkOutDate.trim()
        : undefined;

    // Validate dates
    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: "checkInDate and checkOutDate are required" },
        { status: 400 }
      );
    }

    // Validate destination or hotel
    if (!destinationCode && !hotelCode) {
      return NextResponse.json(
        { error: "Either destinationCode or hotelCode is required" },
        { status: 400 }
      );
    }

    // Parse rooms
    let rooms: AoryxRoomSearch[] = [];
    if (Array.isArray(body.rooms) && body.rooms.length > 0) {
      rooms = body.rooms.map((room: Record<string, unknown>, index: number) => ({
        roomIdentifier: typeof room.roomIdentifier === "number" ? room.roomIdentifier : index + 1,
        adults: typeof room.adults === "number" ? room.adults : 2,
        childrenAges: Array.isArray(room.childrenAges) ? room.childrenAges.filter((age): age is number => typeof age === "number") : [],
      }));
    } else {
      // Default to 1 room with 2 adults
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

    const result = await search(params);

    const { sessionId: _sessionId, ...safeResult } = result;
    const hotelMarkup = await getAoryxHotelPlatformFee();
    const markedHotels =
      hotelMarkup && Array.isArray(safeResult.hotels)
        ? safeResult.hotels.map((hotel) => ({
            ...hotel,
            minPrice: applyMarkup(hotel.minPrice, hotelMarkup) ?? hotel.minPrice,
          }))
        : safeResult.hotels;
    const response = NextResponse.json({ ...safeResult, hotels: markedHotels });

    try {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      if (userId) {
        await recordUserSearch({
          userId,
          params,
          resultSummary: {
            propertyCount: result.propertyCount ?? null,
            destinationCode: result.destination?.code ?? null,
            destinationName: result.destination?.name ?? null,
          },
          source: "aoryx",
        });
      }
    } catch (error) {
      console.error("[Aoryx][search] Failed to record user search", error);
    }

    return response;
  } catch (error) {
    console.error("Search error:", error);

    if (error instanceof AoryxServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    if (error instanceof AoryxClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
