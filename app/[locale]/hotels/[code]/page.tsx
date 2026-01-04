import { cache } from "react";
import HotelClient from "./hotel-client";
import { hotelInfo, hotelsInfoByDestinationId, roomDetails, AoryxClientError, AoryxServiceError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import { parseSearchParams } from "@/lib/search-query";
import { obfuscateRoomOptions } from "@/lib/aoryx-rate-tokens";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { getAmdRates, getAoryxHotelPlatformFee, type AmdRates } from "@/lib/pricing";
import { applyMarkup } from "@/lib/pricing-utils";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import { fetchExcursions, fetchTransferRates } from "@/lib/aoryx-addons";
import type {
  AoryxExcursionTicket,
  AoryxHotelInfoResult,
  AoryxRoomOption,
  AoryxSearchParams,
  AoryxTransferRate,
} from "@/types/aoryx";

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

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const getHotelInfoCached = cache(async (code: string) => hotelInfo(code));

type SafeRoomDetails = {
  currency: string | null;
  rooms: AoryxRoomOption[];
};

type PageProps = {
  params: Promise<{ locale: string; code?: string | string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code?: string | string[] }> }) {
  const resolvedParams = await params;
  const resolvedLocale = resolveLocale(resolvedParams.locale);
  const t = getTranslations(resolvedLocale);
  const hotelCode = Array.isArray(resolvedParams.code) ? resolvedParams.code[0] : resolvedParams.code;

  if (!hotelCode) {
    return buildLocalizedMetadata({
      locale: resolvedLocale,
      title: t.results.hotel.fallbackName,
      description: t.hero.subtitle,
      path: "/hotels",
    });
  }

  try {
    const info = await getHotelInfoCached(hotelCode);
    if (info?.name) {
      return buildLocalizedMetadata({
        locale: resolvedLocale,
        title: info.name,
        description: t.hero.subtitle,
        path: `/hotels/${hotelCode}`,
      });
    }
  } catch (error) {
    console.error("[Metadata] Failed to load hotel name", error);
  }

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: `${t.results.hotel.fallbackName} ${hotelCode}`,
    description: t.hero.subtitle,
    path: `/hotels/${hotelCode}`,
  });
}

export default async function HotelPage({ params, searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const resolvedParams = await params;
  const resolvedLocale = resolveLocale(resolvedParams.locale);
  const t = getTranslations(resolvedLocale);
  const hotelCode = Array.isArray(resolvedParams.code) ? resolvedParams.code[0] : resolvedParams.code;
  const parsed = parseSearchParams(buildSearchParams(resolvedSearchParams), {
    missingDates: t.search.errors.missingDates,
    missingLocation: t.search.errors.missingLocation,
    invalidRooms: t.search.errors.invalidRooms,
  });
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
  const ratesPromise: Promise<AmdRates | null> = hotelCode
    ? getAmdRates().catch((error) => {
        console.error("[ExchangeRates] Failed to load rates", error);
        return null;
      })
    : Promise.resolve(null);
  const markupPromise: Promise<number | null> = hotelCode
    ? getAoryxHotelPlatformFee().catch((error) => {
        console.error("[Pricing] Failed to load hotel platform fee", error);
        return null;
      })
    : Promise.resolve(null);
  const initialAmdRates = await ratesPromise;
  const hotelMarkup = await markupPromise;

  let hotelInfoResult: AoryxHotelInfoResult | null = null;
  let hotelError: string | null = null;
  let roomDetailsResult: SafeRoomDetails | null = null;
  let roomsError: string | null = null;
  let fallbackCoordinates: { lat: number; lon: number } | null = null;
  let transferOptionsResult: AoryxTransferRate[] | null = null;
  let transferError: string | null = null;
  let excursionOptionsResult: AoryxExcursionTicket[] | null = null;
  let excursionError: string | null = null;
  let excursionFee: number | null = null;

  if (hotelCode) {
    try {
      hotelInfoResult = await getHotelInfoCached(hotelCode);
    } catch (error) {
      if (error instanceof AoryxServiceError) {
        hotelError =
          error.code === "MISSING_SESSION_ID"
            ? t.search.errors.missingSession
            : error.message;
      } else if (error instanceof AoryxClientError) {
        hotelError = error.message;
      } else {
        hotelError = t.hotel.errors.loadHotelFailed;
      }
    }
  }

  if (payload && !payload.destinationCode && hotelInfoResult?.destinationId) {
    payload.destinationCode = hotelInfoResult.destinationId;
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
        roomsError =
          error.code === "MISSING_SESSION_ID"
            ? t.search.errors.missingSession
            : error.message;
      } else if (error instanceof AoryxClientError) {
        roomsError = error.message;
      } else {
        roomsError = t.hotel.errors.loadRoomOptionsFailed;
      }
    }
  }

  if (roomDetailsResult && typeof hotelMarkup === "number") {
    roomDetailsResult = {
      ...roomDetailsResult,
      rooms: roomDetailsResult.rooms.map((room) => ({
        ...room,
        displayTotalPrice:
          typeof room.totalPrice === "number" && Number.isFinite(room.totalPrice)
            ? applyMarkup(room.totalPrice, hotelMarkup) ?? room.totalPrice
            : room.totalPrice,
      })),
    };
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

  if (payload && hotelCode) {
    const destinationLocationCode = payload.destinationCode ?? "";
    const destinationName = hotelInfoResult?.address?.cityName ?? "";
    const totalGuests = payload.rooms.reduce(
      (sum, room) => sum + room.adults + room.childrenAges.length,
      0
    );
    const paxCount = totalGuests > 0 ? totalGuests : undefined;
    if (destinationLocationCode || destinationName) {
      try {
        transferOptionsResult = await fetchTransferRates({
          destinationLocationCode,
          destinationName,
          paxCount,
          travelDate: payload.checkInDate,
        });
      } catch (error) {
        console.error("[Transfers] Failed to load transfer options", error);
        transferError = "Failed to load transfer options.";
        transferOptionsResult = [];
      }
    } else {
      transferOptionsResult = [];
    }
  }

  if (hotelCode) {
    try {
      const result = await fetchExcursions(200);
      excursionOptionsResult = result.excursions;
      excursionFee = result.excursionFee;
    } catch (error) {
      console.error("[Excursions] Failed to load excursion options", error);
      excursionError = "Failed to load excursion options.";
      excursionOptionsResult = [];
    }
  }

  return (
    <HotelClient
      initialHotelInfo={hotelInfoResult}
      initialRoomDetails={roomDetailsResult}
      initialHotelError={hotelError}
      initialRoomsError={roomsError}
      initialFallbackCoordinates={fallbackCoordinates}
      initialAmdRates={initialAmdRates}
      initialTransferOptions={transferOptionsResult}
      initialTransferError={transferError}
      initialExcursionOptions={excursionOptionsResult}
      initialExcursionError={excursionError}
      initialExcursionFee={excursionFee}
    />
  );
}
