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
  AoryxRoomDetailItem,
  AoryxRoomDetailsResponse,
  AoryxRoomOption,
  AoryxRoomDetailsResult,
  AoryxPreBookResult,
  AoryxBookingPayload,
  AoryxBookingResult,
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

function normalizeChildAges(value: unknown): { count: number | null; ages: number[] } {
  if (!value) return { count: null, ages: [] };

  if (Array.isArray(value)) {
    const ages = value
      .map((entry) => {
        if (typeof entry === "number") return entry;
        if (typeof entry === "string") {
          const parsed = Number(entry);
          return Number.isFinite(parsed) ? parsed : null;
        }
        if (isRecord(entry)) {
          return toInteger(entry.Text ?? entry.Age ?? entry.Value);
        }
        return null;
      })
      .filter((age): age is number => typeof age === "number" && Number.isFinite(age));
    return { count: ages.length > 0 ? ages.length : null, ages };
  }

  if (isRecord(value)) {
    const ages = normalizeArray(value.ChildAge ?? value.Age ?? value.Ages)
      .map((entry) => {
        if (typeof entry === "number") return entry;
        if (typeof entry === "string") {
          const parsed = Number(entry);
          return Number.isFinite(parsed) ? parsed : null;
        }
        if (isRecord(entry)) {
          return toInteger(entry.Text ?? entry.Age ?? entry.Value);
        }
        return null;
      })
      .filter((age): age is number => typeof age === "number" && Number.isFinite(age));
    const count = toInteger(value.Count) ?? (ages.length > 0 ? ages.length : null);
    return { count, ages };
  }

  return { count: null, ages: [] };
}

function normalizePriceDetails(
  value: unknown
): { gross: number | null; net: number | null; tax: number | null } | null {
  if (!value) return null;
  if (!isRecord(value)) {
    const money = extractMoney(value);
    if (money.amount === null) return null;
    return { gross: money.amount, net: money.amount, tax: 0 };
  }
  const gross = toNumber(value.Gross ?? value.TotalGross ?? value.Amount ?? value.TotalAmount ?? value.Price);
  const net = toNumber(value.Net ?? value.NetAmount ?? value.NetRate ?? value.TotalNet);
  const tax = toNumber(value.Tax ?? value.TotalTax ?? value.TaxAmount);
  if (gross === null && net === null && tax === null) {
    return null;
  }
  return { gross, net, tax };
}

function normalizePolicies(value: unknown) {
  if (!value) return [];
  const rawPolicies =
    isRecord(value) && "Policy" in value ? (value as Record<string, unknown>).Policy : value;
  return normalizeArray(rawPolicies)
    .filter(isRecord)
    .map((policy) => {
      const rawConditions =
        isRecord(policy) && "Condition" in policy
          ? (policy as Record<string, unknown>).Condition
          : null;
      const conditions = normalizeArray(rawConditions)
        .filter(isRecord)
        .map((condition) => ({
          fromDate: toStringValue(condition.FromDate),
          toDate: toStringValue(condition.ToDate),
          timezone: toStringValue(condition.Timezone),
          unit: toInteger(condition.Unit),
          text: toStringValue(condition.Text),
          fromTime: toStringValue(condition.FromTime),
          toTime: toStringValue(condition.ToTime),
          percentage: toNumber(condition.Percentage),
          nights: toNumber(condition.Nights),
          fixed: toNumber(condition.Fixed),
          applicableOn: toStringValue(condition.ApplicableOn),
        }));

      return {
        type: toStringValue(policy.Type),
        textCondition: toStringValue(policy.TextCondition),
        currency: toStringValue(policy.Currency ?? policy.SupplierCurrency),
        conditions,
      };
    });
}

function normalizeRemarks(value: unknown) {
  if (!value) return [];
  if (typeof value === "string" || typeof value === "number") {
    const text = toStringValue(value);
    return text ? [{ type: null, text }] : [];
  }
  const rawRemarks =
    isRecord(value) && "Remark" in value ? (value as Record<string, unknown>).Remark : value;
  return normalizeArray(rawRemarks)
    .filter(isRecord)
    .map((entry) => ({
      type: toStringValue(entry.Type),
      text: toStringValue(entry.Text ?? entry.Remark ?? entry.Description),
    }))
    .filter((entry) => entry.type || entry.text);
}

function normalizeBedTypes(value: unknown): string[] {
  if (!value) return [];
  if (isRecord(value) && "BedType" in value) {
    const bedTypes = (value as Record<string, unknown>).BedType;
    return normalizeArray(bedTypes)
      .map((bed) => toStringValue(bed))
      .filter((bed): bed is string => Boolean(bed));
  }
  return normalizeArray(value)
    .map((bed) => toStringValue(bed))
    .filter((bed): bed is string => Boolean(bed));
}

function normalizeInclusions(value: unknown): string[] {
  if (!value) return [];
  const output: string[] = [];
  const add = (item: unknown) => {
    const text = toStringValue(item);
    if (text && !output.includes(text)) {
      output.push(text);
    }
  };

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "string" || typeof node === "number") {
      add(node);
      return;
    }
    if (isRecord(node)) {
      if ("Inclusion" in node) {
        visit(node.Inclusion);
        return;
      }
      if ("Inclusions" in node) {
        visit(node.Inclusions);
        return;
      }
      if ("Text" in node) {
        add(node.Text);
        return;
      }
      Object.values(node).forEach(visit);
    }
  };

  visit(value);
  return output;
}

function normalizeAmenityList(value: unknown): string[] {
  if (!value) return [];

  const output: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    output.push(trimmed);
  };

  const extractLabel = (item: unknown): string | null => {
    if (typeof item === "string") return item;
    if (typeof item === "number" && Number.isFinite(item)) return String(item);
    if (isRecord(item)) {
      return (
        toStringValue(
          item.Name ??
            item.Amenity ??
            item.AmenityName ??
            item.Text ??
            item.Value ??
            item.Description
        ) ?? null
      );
    }
    return null;
  };

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const direct = extractLabel(node);
    if (direct) {
      add(direct);
      return;
    }
    if (isRecord(node)) {
      const nested =
        node.MasterHotelAmenities;
      if (nested !== undefined) {
        visit(nested);
        return;
      }
      Object.values(node).forEach(visit);
    }
  };

  visit(value);
  return output;
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

function normalizeRoomOptions(response: AoryxRoomDetailsResponse | Record<string, unknown>): AoryxRoomOption[] {
  const record = response as Record<string, unknown>;
  const roomDetails = isRecord(record.RoomDetails)
    ? (record.RoomDetails as Record<string, unknown>).RoomDetail
    : null;
  const hotelRooms = isRecord(record.HotelRooms)
    ? (record.HotelRooms as Record<string, unknown>).HotelRoom
    : null;
  const roomsNode = record.Rooms;
  const rooms = isRecord(roomsNode) ? (roomsNode as Record<string, unknown>).Room : roomsNode;
  const hotelNode = isRecord(record.Hotel) ? (record.Hotel as Record<string, unknown>) : null;
  const hotelRoomsNode = hotelNode && isRecord(hotelNode.Rooms)
    ? (hotelNode.Rooms as Record<string, unknown>).Room
    : null;
  const sources = [roomDetails, hotelRooms, rooms, hotelRoomsNode];

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
    const rateKey = toStringValue(room.RateKey ?? room.RateCode ?? room.RateID ?? room.RateId);
    const roomIdentifier = toInteger(
      room.RoomIdentifier ?? room.RoomIndex ?? room.RoomNo ?? room.RoomNumber
    );
    const groupCode = toInteger(room.GroupCode ?? room.SupplierGroupCode);
    const name = toStringValue(room.RoomName ?? room.RoomType ?? room.Name ?? room.Room);
    const boardType = toStringValue(
      room.BoardType ?? room.MealType ?? room.MealPlan ?? room.Meal ?? room.Board
    );
    const meal = toStringValue(room.Meal ?? room.MealType ?? room.MealPlan ?? room.BoardType);
    const rateType = toStringValue(room.RateType ?? room.ContractType ?? room.RateCategory);
    const childInfo = normalizeChildAges(room.Children);
    const priceDetails = normalizePriceDetails(room.Price);
    const bedTypes = normalizeBedTypes(room.BedTypes);
    const inclusions = normalizeInclusions(room.Inclusions ?? room.Inclusion);
    const policies = normalizePolicies(room.Policies);
    const remarks = normalizeRemarks(room.Remarks);

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

    if (amount === null) {
      amount = priceDetails?.net ?? priceDetails?.gross ?? null;
    }

    if (!currency) {
      currency = toStringValue(
        room.Currency ?? room.CurrencyCode ?? room.Curr ?? room.SupplierCurrency
      );
    }

    const availableRooms = toInteger(room.AvailableRooms ?? room.RoomAvailable ?? room.Availability);
    const cancellationPolicy = extractCancellationPolicy(
      room.CancellationPolicy ?? room.CancelPolicy ?? room.CancellationText
    );
    const adultCount = toInteger(room.Adult ?? room.Adults ?? room.AdultCount);
    const childAges = childInfo.ages;
    const childCount = childInfo.count ?? (childAges.length > 0 ? childAges.length : null);

    return {
      id,
      name,
      boardType,
      refundable,
      currency,
      totalPrice: amount,
      availableRooms,
      cancellationPolicy,
      meal,
      rateKey,
      groupCode,
      roomIdentifier,
      rateType,
      price: priceDetails,
      adultCount,
      childCount,
      childAges,
      bedTypes,
      inclusions,
      policies,
      remarks,
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

type AoryxRateKeysRequest = {
  sessionId: string;
  searchParameter: {
    hotelCode: string;
    groupCode: number;
    currency: string;
    rateKeys: {
      rateKey: string[];
    };
  };
};

type AoryxPreBookResponse = {
  IsSuccess?: boolean;
  StatusCode?: number;
  ExceptionMessage?: string | null;
  ErrorInfo?: { Description?: string | null; Code?: string | null } | null;
  IsBookable?: boolean | string | number | null;
  IsSoldOut?: boolean | string | number | null;
  IsPriceChanged?: boolean | string | number | null;
  Monetary?: {
    Currency?: {
      Code?: string | null;
    } | null;
  } | null;
  Hotel?: {
    Rooms?: {
      Room?: AoryxRoomDetailItem | AoryxRoomDetailItem[] | null;
    } | null;
  } | null;
  Rooms?: {
    Room?: AoryxRoomDetailItem | AoryxRoomDetailItem[] | null;
  } | AoryxRoomDetailItem[] | null;
  [key: string]: unknown;
};

type AoryxBookingRequest = {
  sessionId: string;
  destinationCode: string;
  hotelCode: string;
  countryCode: string;
  currency: string;
  nationality: string;
  customerRefNumber: string;
  groupCode: number;
  rooms: {
    room: Array<{
      roomIdentifier: number;
      adult: number;
      children: { count: number; childAge: Array<{ identifier: number; text: string }> } | null;
      rateKey: string;
      guests: {
        guest: Array<{
          title: { code: string; text: string };
          firstName: string;
          lastName: string;
          isLeadPAX: boolean;
          type: string;
          age: number;
        }>;
      };
      price: {
        gross: number | null;
        net: number | null;
        tax: number | null;
      };
    }>;
  };
};

type AoryxBookingResponse = {
  GeneralInfo?: { SessionId?: string | null } | null;
  Status?: string | null;
  HotelConfirmationNumber?: string | null;
  SupplierConfirmationNumber?: string | null;
  CustomerRefNumber?: string | null;
  ADSConfirmationNumber?: string | null;
  AdsConfirmationNumber?: string | null;
  adsConfirmationNumber?: string | null;
  Rooms?: { Room?: unknown } | unknown;
  ErrorInfo?: { Description?: string | null; Code?: string | null } | null;
  IsSuccess?: boolean;
  StatusCode?: number;
  ExceptionMessage?: string | null;
  Errors?: unknown;
  [key: string]: unknown;
};

function buildRateKeyRequest(
  sessionId: string,
  hotelCode: string,
  groupCode: number,
  currency: string | undefined,
  rateKeys: string[]
): AoryxRateKeysRequest {
  return {
    sessionId,
    searchParameter: {
      hotelCode,
      groupCode,
      currency: currency ?? AORYX_DEFAULT_CURRENCY ?? "USD",
      rateKeys: {
        rateKey: rateKeys,
      },
    },
  };
}

function buildBookingRequest(payload: AoryxBookingPayload): AoryxBookingRequest {
  return {
    sessionId: payload.sessionId,
    destinationCode: payload.destinationCode,
    hotelCode: payload.hotelCode,
    countryCode: payload.countryCode.toUpperCase(),
    currency: payload.currency,
    nationality: payload.nationality.toUpperCase(),
    customerRefNumber: payload.customerRefNumber,
    groupCode: payload.groupCode,
    rooms: {
      room: payload.rooms.map((room, roomIndex) => ({
        roomIdentifier: room.roomIdentifier,
        adult: room.adults,
        children:
          room.childrenAges.length > 0
            ? {
                count: room.childrenAges.length,
                childAge: room.childrenAges.map((age, index) => ({
                  identifier: index + 1,
                  text: age.toString(),
                })),
              }
            : null,
        rateKey: room.rateKey,
        guests: {
          guest: room.guests.map((guest) => ({
            title: {
              code: guest.titleCode ?? "",
              text: guest.title ?? "",
            },
            firstName: guest.firstName,
            lastName: guest.lastName,
            isLeadPAX: guest.isLeadGuest ?? (roomIndex === 0 && guest.type === "Adult"),
            type: guest.type,
            age: guest.age,
          })),
        },
        price: {
          gross: room.price.gross,
          net: room.price.net,
          tax: room.price.tax,
        },
      })),
    },
  };
}

// Extract session ID from response
function extractSessionId(generalInfo?: { SessionId?: string | null; [key: string]: unknown }): string {
  const sessionId = toStringValue(
    generalInfo?.SessionId ?? generalInfo?.SessionID ?? generalInfo?.sessionId ?? generalInfo?.sessionID
  );
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
export async function roomDetails(params: AoryxSearchParams): Promise<AoryxRoomDetailsResult> {
  validateSearchParams(params);
  if (!params.hotelCode) {
    throw new AoryxServiceError("Hotel code is required for room details", "INVALID_PARAMS");
  }

  const { sessionId, currency } = await search(params);
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

  return {
    sessionId,
    currency,
    rooms: normalizeRoomOptions(response),
  };
}

/**
 * Prebook selected rate keys to confirm availability and pricing.
 */
export async function preBook(
  sessionId: string,
  hotelCode: string,
  groupCode: number,
  rateKeys: string[],
  currency?: string
): Promise<AoryxPreBookResult> {
  if (!sessionId) {
    throw new AoryxServiceError("Session ID is required for prebook", "INVALID_PARAMS");
  }
  if (!hotelCode) {
    throw new AoryxServiceError("Hotel code is required for prebook", "INVALID_PARAMS");
  }
  if (!Number.isFinite(groupCode)) {
    throw new AoryxServiceError("Group code is required for prebook", "INVALID_PARAMS");
  }
  if (!Array.isArray(rateKeys) || rateKeys.length === 0) {
    throw new AoryxServiceError("Rate keys are required for prebook", "INVALID_PARAMS");
  }

  const request = buildRateKeyRequest(sessionId, hotelCode, groupCode, currency, rateKeys);

  const response = await coreRequest<AoryxRateKeysRequest, AoryxPreBookResponse>(
    DISTRIBUTION_ENDPOINTS.preBook,
    request,
    { timeoutMs: 60000 }
  );

  if (response.IsSuccess === false) {
    throw new AoryxServiceError(
      response.ExceptionMessage ?? "PreBook request failed",
      "PREBOOK_ERROR",
      response.StatusCode ?? undefined,
      response.Errors
    );
  }

  if (response.ErrorInfo?.Description) {
    throw new AoryxServiceError(
      response.ErrorInfo.Description,
      response.ErrorInfo.Code ?? "PREBOOK_ERROR"
    );
  }

  return {
    sessionId,
    isBookable: toBoolean(response.IsBookable),
    isSoldOut: toBoolean(response.IsSoldOut),
    isPriceChanged: toBoolean(response.IsPriceChanged),
    currency: toStringValue(response.Monetary?.Currency?.Code),
    rooms: normalizeRoomOptions(response),
  };
}

/**
 * Book a prebooked rate.
 */
export async function book(payload: AoryxBookingPayload): Promise<AoryxBookingResult> {
  const request = buildBookingRequest(payload);

  const response = await coreRequest<AoryxBookingRequest, AoryxBookingResponse>(
    DISTRIBUTION_ENDPOINTS.book,
    request,
    { timeoutMs: 60000 }
  );

  if (response.IsSuccess === false) {
    throw new AoryxServiceError(
      response.ExceptionMessage ?? "Booking request failed",
      "BOOK_ERROR",
      response.StatusCode ?? undefined,
      response.Errors
    );
  }

  if (response.ErrorInfo?.Description) {
    throw new AoryxServiceError(
      response.ErrorInfo.Description,
      response.ErrorInfo.Code ?? "BOOK_ERROR"
    );
  }

  const roomsContainer = (response.Rooms as { Room?: unknown } | null | undefined)?.Room ?? response.Rooms;
  const roomsArray = Array.isArray(roomsContainer)
    ? roomsContainer
    : roomsContainer
      ? [roomsContainer]
      : [];

  const sessionId = toStringValue(response.GeneralInfo?.SessionId) ?? payload.sessionId;

  return {
    sessionId,
    status: toStringValue(response.Status),
    hotelConfirmationNumber: toStringValue(response.HotelConfirmationNumber),
    adsConfirmationNumber: toStringValue(
      response.ADSConfirmationNumber ?? response.AdsConfirmationNumber ?? response.adsConfirmationNumber
    ),
    supplierConfirmationNumber: toStringValue(response.SupplierConfirmationNumber),
    customerRefNumber: toStringValue(response.CustomerRefNumber),
    rooms: roomsArray.map((room) => ({
      roomIdentifier: toInteger((room as { RoomIdentifier?: unknown }).RoomIdentifier),
      rateKey: toStringValue((room as { RateKey?: unknown }).RateKey),
      status: toStringValue((room as { Status?: unknown }).Status),
    })),
  };
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

  console.info("[Aoryx][hotel-info] Response", {
    hotelCode,
    isSuccess: isSuccess ?? null,
    statusCode: statusCode ?? null,
    exceptionMessage: exceptionMessage ?? null,
    errors: errors ?? null,
    hotelInformation: response.HotelInformation ?? null,
  });

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

  const rawDestinationId = toStringValue(
    (info as Record<string, unknown>).GiDestinationId ??
      (info as Record<string, unknown>).GIDestinationId ??
      (info as Record<string, unknown>).GiDestinationID ??
      (info as Record<string, unknown>).DestinationId ??
      (info as Record<string, unknown>).DestinationID ??
      (info.Address as Record<string, unknown> | null | undefined)?.CityCode ??
      (info.Address as Record<string, unknown> | null | undefined)?.CityId ??
      (info.Address as Record<string, unknown> | null | undefined)?.CityID
  );
  const destinationId =
    rawDestinationId && rawDestinationId !== "0" && rawDestinationId !== "0-0"
      ? normalizeParentDestinationId(rawDestinationId)
      : null;

  return {
    destinationId,
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
    masterHotelAmenities: (() => {
      const raw =
        info.MasterHotelAmenities ?? info.HotelAmenities ?? info.Amenities ?? null;
      const normalized = normalizeAmenityList(raw);
      return normalized.length > 0 ? normalized : null;
    })(),
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
  preBook,
  book,
  hotelsInfoByDestinationId,
  hotelInfo,
  normalizeParentDestinationId,
};
