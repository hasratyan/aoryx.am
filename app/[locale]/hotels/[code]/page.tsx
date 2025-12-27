import HotelClient from "./hotel-client";
import { hotelInfo, hotelsInfoByDestinationId, roomDetails, AoryxClientError, AoryxServiceError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import { parseSearchParams } from "@/lib/search-query";
import { obfuscateRoomOptions } from "@/lib/aoryx-rate-tokens";
import { getEffectiveAmdRates } from "@/lib/pricing";
import type { AoryxHotelInfoResult, AoryxRoomOption, AoryxSearchParams } from "@/types/aoryx";

const toFinite = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const buildSearchParams = (input: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string") params.append(key, entry);
      });
      return;
    }
    if (typeof value === "string") params.set(key, value);
  });
  return params;
};

type SafeRoomDetails = {
  currency: string | null;
  rooms: AoryxRoomOption[];
};

type PageProps = {
  params: Promise<{ locale: string; code?: string | string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HotelPage({ params, searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const resolvedParams = await params;
  const hotelCode = Array.isArray(resolvedParams.code) ? resolvedParams.code[0] : resolvedParams.code;
  const parsed = parseSearchParams(buildSearchParams(resolvedSearchParams));
  const payload = parsed.payload
    ? {
        ...parsed.payload,
        customerCode: AORYX_TASSPRO_CUSTOMER_CODE,
        regionId: AORYX_TASSPRO_REGION_ID,
      }
    : null;
  if (payload && hotelCode) {
    payload.hotelCode = hotelCode;
  }
  const ratesPromise = hotelCode
    ? getEffectiveAmdRates().catch((error) => {
        console.error("[ExchangeRates] Failed to load rates", error);
        return null;
      })
    : Promise.resolve(null);

  let hotelInfoResult: AoryxHotelInfoResult | null = null;
  let hotelError: string | null = null;
  let roomDetailsResult: SafeRoomDetails | null = null;
  let roomsError: string | null = null;
  let fallbackCoordinates: { lat: number; lon: number } | null = null;

  if (hotelCode) {
    try {
      hotelInfoResult = await hotelInfo(hotelCode);
    } catch (error) {
      if (error instanceof AoryxServiceError) {
        hotelError = error.message;
      } else if (error instanceof AoryxClientError) {
        hotelError = error.message;
      } else {
        hotelError = "Failed to load hotel details.";
      }
    }
  }

  if (payload && hotelCode) {
    const paramsWithHotel: AoryxSearchParams = { ...payload, hotelCode };
    try {
      const result = await roomDetails(paramsWithHotel);
      const obfuscatedRooms = obfuscateRoomOptions(result.rooms, {
        sessionId: result.sessionId,
        hotelCode,
      });
      roomDetailsResult = {
        currency: result.currency ?? null,
        rooms: obfuscatedRooms,
      };
    } catch (error) {
      if (error instanceof AoryxServiceError) {
        roomsError = error.message;
      } else if (error instanceof AoryxClientError) {
        roomsError = error.message;
      } else {
        roomsError = "Failed to load room options.";
      }
    }
  }

  const infoLat = toFinite(hotelInfoResult?.geoCode?.lat);
  const infoLon = toFinite(hotelInfoResult?.geoCode?.lon);
  if (infoLat === null || infoLon === null) {
    const destinationCode = payload?.destinationCode;
    if (destinationCode) {
      try {
        const hotels = await hotelsInfoByDestinationId(destinationCode);
        const match = hotels.find((hotel) => hotel.systemId === hotelCode);
        const lat = toFinite(match?.latitude);
        const lon = toFinite(match?.longitude);
        fallbackCoordinates = lat !== null && lon !== null ? { lat, lon } : null;
      } catch {
        fallbackCoordinates = null;
      }
    }
  }

  const initialAmdRates = await ratesPromise;

  return (
    <HotelClient
      initialHotelInfo={hotelInfoResult}
      initialRoomDetails={roomDetailsResult}
      initialHotelError={hotelError}
      initialRoomsError={roomsError}
      initialFallbackCoordinates={fallbackCoordinates}
      initialAmdRates={initialAmdRates}
    />
  );
}
