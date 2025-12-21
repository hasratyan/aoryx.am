// Aoryx API Client
import {
  AORYX_API_KEY,
  AORYX_BASE_URL,
  AORYX_CUSTOMER_CODE,
  AORYX_TIMEOUT_MS,
  AORYX_DEFAULT_CURRENCY,
  AORYX_TASSPRO_CUSTOMER_CODE,
  AORYX_TASSPRO_REGION_ID,
} from "./env";
import type {
  AoryxSearchParams,
  AoryxSearchRequest,
  AoryxSearchResponse,
  AoryxSearchResult,
  AoryxHotelSummary,
  AoryxSearchHotel,
  AoryxHotelsInfoByDestinationIdRequest,
  AoryxHotelsInfoByDestinationIdResponse,
  HotelInfo,
  AoryxHotelInfoRequest,
  AoryxHotelInfoResponse,
  AoryxHotelInfoResult,
  AoryxRoomDetailsRequest,
  AoryxRoomDetailsResponse,
  AoryxRoomOption,
} from "@/types/aoryx";

// Endpoint configurations
const DISTRIBUTION_ENDPOINTS = {
  search: "Search",
  roomDetails: "RoomDetails",
  priceBreakup: "PriceBreakup",
  cancellationPolicy: "CancellationPolicy",
  preBook: "PreBook",
  book: "Book",
  cancel: "Cancel",
  bookingDetails: "BookingDetails",
} as const;

const STATIC_ENDPOINTS = {
  destinationInfo: "destination-info",
  hotelsInfoByDestinationId: "HotelsInfoByDestinationId",
  hotelInfo: "hotel-Info",
  countryInfo: "country-info",
} as const;

type AoryxDistributionEndpoint = (typeof DISTRIBUTION_ENDPOINTS)[keyof typeof DISTRIBUTION_ENDPOINTS];
type AoryxStaticEndpoint = (typeof STATIC_ENDPOINTS)[keyof typeof STATIC_ENDPOINTS];

// Request options
interface AoryxRequestOptions {
  timeoutMs?: number;
}

// Error classes
export class AoryxClientError extends Error {
  constructor(
    message: string,
    public endpoint?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "AoryxClientError";
  }
}

export class AoryxServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public errors?: unknown
  ) {
    super(message);
    this.name = "AoryxServiceError";
  }
}

// Utility functions
function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toInteger(value: unknown): number | null {
  const num = toNumber(value);
  return num !== null ? Math.round(num) : null;
}

// Convert camelCase keys to PascalCase for Aoryx API
function pascalizeKeys(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(pascalizeKeys);
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      result[pascalKey] = pascalizeKeys(val);
    }
    return result;
  }
  return value;
}

// Ensure base URL is available
function ensureBaseUrl(): string {
  if (!AORYX_BASE_URL) {
    throw new AoryxClientError("Missing AORYX_BASE_URL configuration");
  }
  return AORYX_BASE_URL.replace(/\/$/, "");
}

// Core request function
async function coreRequest<TRequest, TResponse>(
  endpoint: AoryxDistributionEndpoint | AoryxStaticEndpoint,
  payload: TRequest,
  options: AoryxRequestOptions = {}
): Promise<TResponse> {
  if (!AORYX_API_KEY) {
    throw new AoryxClientError("Missing AORYX_API_KEY configuration", endpoint);
  }

  const baseUrl = ensureBaseUrl();
  const url = `${baseUrl}/${endpoint}`;
  const timeoutMs = options.timeoutMs ?? AORYX_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Convert camelCase keys to PascalCase for Aoryx API
  const pascalizedPayload = pascalizeKeys(payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ApiKey: AORYX_API_KEY,
        ...(AORYX_CUSTOMER_CODE ? { CustomerCode: AORYX_CUSTOMER_CODE } : {}),
      },
      body: JSON.stringify(pascalizedPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AoryxClientError(
        `Aoryx API error: ${response.status} ${response.statusText}`,
        endpoint,
        response.status
      );
    }

    const data = await response.json();
    // Normalize response keys to PascalCase (API may return camelCase)
    return pascalizeKeys(data) as TResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AoryxClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AoryxClientError(`Request timeout after ${timeoutMs}ms`, endpoint);
    }

    throw new AoryxClientError(
      error instanceof Error ? error.message : "Unknown error",
      endpoint
    );
  }
}

// Normalize hotel from search response
function normalizeSearchHotel(hotel: AoryxSearchHotel, currency: string | null): AoryxHotelSummary {
  const info = hotel.HotelInfo;
  // Prioritize HotelInfo.Name as it contains the actual hotel name
  // hotel.Name at the top level may contain the hotel code instead
  return {
    code: toStringValue(hotel.Code),
    name: toStringValue(info?.Name) ?? toStringValue(hotel.Name),
    minPrice: toNumber(hotel.MinPrice),
    currency: currency,
    rating: toNumber(info?.StarRating), // API uses "StarRating" as string
    address: toStringValue(info?.Add1), // API uses "Add1" for address
    city: toStringValue(info?.City),
    imageUrl: toStringValue(info?.Image), // API uses "Image" not "imageUrl"
    latitude: toNumber(info?.Lat), // Direct string, not in geoCode
    longitude: toNumber(info?.Lon), // Direct string, not in geoCode
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
  }
  return null;
}

function extractMoney(value: unknown): { amount: number | null; currency: string | null } {
  if (typeof value === "number" || typeof value === "string") {
    return { amount: toNumber(value), currency: null };
  }
  if (isRecord(value)) {
    const amount = toNumber(
      value.Amount ?? value.TotalAmount ?? value.Value ?? value.Price ?? value.Net ?? value.NetAmount
    );
    const currency = toStringValue(value.Currency ?? value.CurrencyCode ?? value.Curr);
    return { amount, currency };
  }
  return { amount: null, currency: null };
}

function extractCancellationPolicy(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractCancellationPolicy(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(" ") : null;
  }
  if (isRecord(value)) {
    return (
      toStringValue(value.Text ?? value.Policy ?? value.Description ?? value.Remark) ??
      null
    );
  }
  return null;
}

function hasRoomSignature(record: Record<string, unknown>): boolean {
  return Object.keys(record).some((key) => {
    const normalized = key.toLowerCase();
    return (
      normalized.includes("room") ||
      normalized.includes("rate") ||
      normalized.includes("board") ||
      normalized.includes("meal") ||
      normalized.includes("refundable")
    );
  });
}

function findRoomCandidates(value: unknown): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[][] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      const records = node.filter(isRecord);
      if (records.length > 0 && records.some(hasRoomSignature)) {
        candidates.push(records);
      }
      node.forEach(visit);
      return;
    }
    if (isRecord(node)) {
      Object.values(node).forEach(visit);
    }
  };

  visit(value);

  if (candidates.length === 0) return [];
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function normalizeRoomOptions(response: AoryxRoomDetailsResponse): AoryxRoomOption[] {
  const sources = [
    response.RoomDetails?.RoomDetail,
    response.HotelRooms?.HotelRoom,
    isRecord(response.Rooms) ? response.Rooms.Room : response.Rooms,
  ];

  const roomItems = sources.reduce<Record<string, unknown>[]>((acc, source) => {
    if (acc.length > 0) return acc;
    const candidates = normalizeArray(source).filter(isRecord);
    return candidates.length > 0 ? candidates : acc;
  }, []);
  const resolvedRoomItems = roomItems.length > 0 ? roomItems : findRoomCandidates(response);

  return resolvedRoomItems.map((room, index) => {
    const id =
      toStringValue(room.RoomCode ?? room.RateKey ?? room.RoomIndex ?? room.Id) ??
      `room-${index + 1}`;
    const name = toStringValue(room.RoomName ?? room.RoomType ?? room.Name ?? room.Room);
    const boardType = toStringValue(
      room.BoardType ?? room.MealType ?? room.MealPlan ?? room.Meal ?? room.Board
    );

    const refundableValue = toBoolean(room.Refundable ?? room.IsRefundable);
    const nonRefundableValue = toBoolean(room.NonRefundable);
    const refundable =
      refundableValue !== null
        ? refundableValue
        : nonRefundableValue !== null
        ? !nonRefundableValue
        : null;

    const priceCandidates = [
      room.TotalPrice,
      room.TotalAmount,
      room.RoomRate,
      room.NetRate,
      room.Price,
      room.NetPrice,
      room.Amount,
    ];
    let amount: number | null = null;
    let currency: string | null = null;
    for (const candidate of priceCandidates) {
      const money = extractMoney(candidate);
      if (money.amount !== null) {
        amount = money.amount;
        currency = money.currency ?? currency;
        break;
      }
    }

    if (!currency) {
      currency = toStringValue(room.Currency ?? room.CurrencyCode ?? room.Curr);
    }

    const availableRooms = toInteger(room.AvailableRooms ?? room.RoomAvailable ?? room.Availability);
    const cancellationPolicy = extractCancellationPolicy(
      room.CancellationPolicy ?? room.CancelPolicy ?? room.CancellationText
    );

    return {
      id,
      name,
      boardType,
      refundable,
      currency,
      totalPrice: amount,
      availableRooms,
      cancellationPolicy,
    };
  });
}

// Normalize date to include time component (matches megatours implementation)
function normalizeDate(value: string): string {
  if (!value) return value;
  return value.includes("T") ? value : `${value}T00:00:00`;
}

// Build search request from params
function buildSearchRequest(params: AoryxSearchParams): AoryxSearchRequest {
  const currency = params.currency ?? AORYX_DEFAULT_CURRENCY;
  
  const rooms = params.rooms.map((room) => ({
    RoomIdentifier: room.roomIdentifier,
    Adult: room.adults, // API uses "Adult" (singular)
    Children: room.childrenAges.length > 0
      ? {
          Count: room.childrenAges.length,
          ChildAge: room.childrenAges.map((age, index) => ({
            Identifier: index + 1,
            Text: age.toString(),
          })),
        }
      : undefined,
  }));

  const tassProInfo: {
    CustomerCode?: string;
    RegionID?: string;
  } = {};

  const resolvedCustomerCode = params.customerCode ?? AORYX_TASSPRO_CUSTOMER_CODE;
  const resolvedRegionId = params.regionId ?? AORYX_TASSPRO_REGION_ID;

  if (resolvedCustomerCode) {
    tassProInfo.CustomerCode = resolvedCustomerCode;
  }
  if (resolvedRegionId) {
    tassProInfo.RegionID = resolvedRegionId;
  }

  return {
    SearchParameter: {
      DestinationCode: params.destinationCode,
      HotelCode: params.hotelCode,
      CountryCode: params.countryCode.toUpperCase(),
      Nationality: params.nationality.toUpperCase(),
      Currency: currency,
      CheckInDate: normalizeDate(params.checkInDate),
      CheckOutDate: normalizeDate(params.checkOutDate),
      Rooms: {
        Room: rooms, // Must always be an array
      },
      ...(Object.keys(tassProInfo).length > 0 ? { TassProInfo: tassProInfo } : {}),
    },
  };
}

// Extract session ID from response
function extractSessionId(generalInfo?: { SessionId?: string | null }): string {
  const sessionId = toStringValue(generalInfo?.SessionId);
  if (!sessionId) {
    throw new AoryxServiceError("No session ID in search response", "MISSING_SESSION_ID");
  }
  return sessionId;
}

// Validate search params
function validateSearchParams(params: AoryxSearchParams): void {
  if (!params.destinationCode && !params.hotelCode) {
    throw new AoryxServiceError("Either destinationCode or hotelCode is required", "INVALID_PARAMS");
  }
  if (!params.checkInDate || !params.checkOutDate) {
    throw new AoryxServiceError("Check-in and check-out dates are required", "INVALID_PARAMS");
  }
  if (!params.rooms || params.rooms.length === 0) {
    throw new AoryxServiceError("At least one room is required", "INVALID_PARAMS");
  }
}

// Service functions

/**
 * Search for hotels
 */
export async function search(params: AoryxSearchParams): Promise<AoryxSearchResult> {
  validateSearchParams(params);
  const request = buildSearchRequest(params);

  const response = await coreRequest<AoryxSearchRequest, AoryxSearchResponse>(
    DISTRIBUTION_ENDPOINTS.search,
    request,
    { timeoutMs: 60000 } // Search can take longer
  );

  if (!response.IsSuccess && response.ExceptionMessage) {
    throw new AoryxServiceError(
      response.ExceptionMessage,
      "SEARCH_ERROR",
      response.StatusCode ?? undefined,
      response.Errors
    );
  }

  const sessionId = extractSessionId(response.GeneralInfo ?? undefined);
  const currency = toStringValue(response.Monetary?.Currency?.Code);
  const hotelsRaw = response.Hotels?.Hotel ?? [];
  const hotelsArray = Array.isArray(hotelsRaw) ? hotelsRaw : hotelsRaw ? [hotelsRaw] : [];
  const hotels = hotelsArray.map((h) => normalizeSearchHotel(h, currency));

  return {
    sessionId,
    currency,
    propertyCount: toInteger(response.Audit?.PropertyCount),
    responseTime: toStringValue(response.Audit?.ResponseTime),
    destination: response.Audit?.Destination
      ? {
          code: toStringValue(response.Audit.Destination.Code),
          name: toStringValue(response.Audit.Destination.Text),
        }
      : null,
    hotels,
  };
}

/**
 * Get room options for a hotel (requires search parameters for availability).
 */
export async function roomDetails(params: AoryxSearchParams): Promise<AoryxRoomOption[]> {
  validateSearchParams(params);
  if (!params.hotelCode) {
    throw new AoryxServiceError("Hotel code is required for room details", "INVALID_PARAMS");
  }

  const { sessionId } = await search(params);
  const searchRequest = buildSearchRequest(params);
  const request: AoryxRoomDetailsRequest = {
    hotelCode: params.hotelCode,
    searchParameter: searchRequest.SearchParameter,
    sessionId,
  };

  const response = await coreRequest<AoryxRoomDetailsRequest, AoryxRoomDetailsResponse>(
    DISTRIBUTION_ENDPOINTS.roomDetails,
    request,
    { timeoutMs: 60000 }
  );

  if (response.IsSuccess === false) {
    throw new AoryxServiceError(
      response.ExceptionMessage ?? "RoomDetails request failed",
      "ROOM_DETAILS_ERROR",
      response.StatusCode ?? undefined,
      response.Errors
    );
  }

  return normalizeRoomOptions(response);
}

/**
 * Get hotels info by destination ID
 */
export async function hotelsInfoByDestinationId(destinationId: string): Promise<HotelInfo[]> {
  const request: AoryxHotelsInfoByDestinationIdRequest = { destinationId };

  // Note: coreRequest applies pascalizeKeys to the response, so we need to use PascalCase keys
  const response = await coreRequest<
    AoryxHotelsInfoByDestinationIdRequest,
    Record<string, unknown>
  >(STATIC_ENDPOINTS.hotelsInfoByDestinationId, request);

  // Access with PascalCase keys (after pascalizeKeys transformation)
  const isSuccess = response.IsSuccess as boolean | undefined;
  const exceptionMessage = response.ExceptionMessage as string | null | undefined;
  const statusCode = response.StatusCode as number | undefined;
  const errors = response.Errors;
  const hotelsInformation = (response.HotelsInformation ?? []) as Array<Record<string, unknown>>;

  if (!isSuccess) {
    throw new AoryxServiceError(
      exceptionMessage ?? "HotelsInfoByDestinationId request failed",
      "HOTELS_INFO_ERROR",
      statusCode ?? undefined,
      errors
    );
  }

  return hotelsInformation.map((item) => {
    const geoCode = item.GeoCode as Record<string, unknown> | null | undefined;
    return {
      destinationId: toStringValue(item.DestinationId),
      name: toStringValue(item.Name),
      systemId: toStringValue(item.SystemId),
      rating: toNumber(item.Rating),
      city: toStringValue(item.City),
      address: toStringValue(item.Address1),
      imageUrl: toStringValue(item.ImageUrl),
      latitude: toNumber(geoCode?.Lat),
      longitude: toNumber(geoCode?.Lon),
    };
  });
}

/**
 * Get detailed hotel info by hotel code (includes image gallery).
 */
export async function hotelInfo(hotelCode: string): Promise<AoryxHotelInfoResult | null> {
  const request: AoryxHotelInfoRequest = { hotelCode };
  const response = await coreRequest<AoryxHotelInfoRequest, AoryxHotelInfoResponse>(
    STATIC_ENDPOINTS.hotelInfo,
    request
  );

  const isSuccess = response.IsSuccess as boolean | undefined;
  const exceptionMessage = response.ExceptionMessage as string | null | undefined;
  const statusCode = response.StatusCode as number | undefined;
  const errors = response.Errors;

  if (!isSuccess) {
    throw new AoryxServiceError(
      exceptionMessage ?? "HotelInfo request failed",
      "HOTEL_INFO_ERROR",
      statusCode ?? undefined,
      errors
    );
  }

  const info = response.HotelInformation ?? null;
  if (!info) return null;

  return {
    systemId: toStringValue(info.SystemId),
    name: toStringValue(info.Name),
    rating: toNumber(info.Rating),
    tripAdvisorRating: toNumber(info.TripAdvisorRating),
    tripAdvisorUrl: toStringValue(info.TripAdvisorUrl),
    currencyCode: toStringValue(info.CurrencyCode),
    imageUrl: toStringValue(info.ImageUrl),
    imageUrls: Array.isArray(info.ImageUrls)
      ? info.ImageUrls.map(toStringValue).filter((value): value is string => Boolean(value))
      : [],
    address: info.Address
      ? {
          line1: toStringValue(info.Address.Line1),
          line2: toStringValue(info.Address.Line2),
          countryCode: toStringValue(info.Address.CountryCode),
          countryName: toStringValue(info.Address.CountryName),
          cityName: toStringValue(info.Address.CityName),
          stateCode: toStringValue(info.Address.StateCode),
          zipCode: toStringValue(info.Address.ZipCode),
        }
      : null,
    geoCode: info.GeoCode
      ? {
          lat: toNumber(info.GeoCode.Lat),
          lon: toNumber(info.GeoCode.Lon),
        }
      : null,
    contact: info.Contact
      ? {
          phone: toStringValue(info.Contact.PhoneNo),
          fax: toStringValue(info.Contact.FaxNo),
          website: toStringValue(info.Contact.Website),
        }
      : null,
  };
}

/**
 * Normalize parent destination ID (ensures format like "160-0")
 */
export function normalizeParentDestinationId(rawId?: string): string | null {
  if (!rawId) return null;
  const trimmed = rawId.trim();
  if (!trimmed) return null;

  // If already has format "XXX-Y", return as is
  if (trimmed.includes("-")) {
    return trimmed;
  }

  // Otherwise, append "-0"
  return `${trimmed}-0`;
}

// Export the client object for easy access
export const aoryxClient = {
  search,
  roomDetails,
  hotelsInfoByDestinationId,
  hotelInfo,
  normalizeParentDestinationId,
};
