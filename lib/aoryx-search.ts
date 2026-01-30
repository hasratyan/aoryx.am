import { search, AoryxClientError, AoryxServiceError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import { getAoryxHotelPlatformFee } from "@/lib/pricing";
import { applyMarkup } from "@/lib/pricing-utils";
import type { AoryxSearchParams, AoryxSearchResult } from "@/types/aoryx";

export type SafeSearchResult = Omit<AoryxSearchResult, "sessionId">;

export const withAoryxDefaults = (payload: AoryxSearchParams): AoryxSearchParams => ({
  ...payload,
  customerCode: payload.customerCode ?? AORYX_TASSPRO_CUSTOMER_CODE,
  regionId: payload.regionId ?? AORYX_TASSPRO_REGION_ID,
});

export async function runAoryxSearch(payload: AoryxSearchParams): Promise<SafeSearchResult> {
  const params = withAoryxDefaults(payload);
  const result = await search(params);
  const { sessionId: _sessionId, ...safeResult } = result;
  const hotelMarkup = await getAoryxHotelPlatformFee();
  if (hotelMarkup && Array.isArray(safeResult.hotels)) {
    return {
      ...safeResult,
      hotels: safeResult.hotels.map((hotel) => ({
        ...hotel,
        minPrice: applyMarkup(hotel.minPrice, hotelMarkup) ?? hotel.minPrice,
      })),
    };
  }
  return safeResult;
}

export type SearchErrorInfo = { message: string; code?: string };

export function normalizeSearchError(error: unknown): SearchErrorInfo {
  if (error instanceof AoryxServiceError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof AoryxClientError) {
    return { message: error.message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Failed to perform search" };
}
