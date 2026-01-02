import {
  FLYDUBAI_SEARCH_URL,
  FLYDUBAI_API_KEY,
  FLYDUBAI_ACCESS_TOKEN,
  FLYDUBAI_TIMEOUT_MS,
  isFlydubaiConfigured,
} from "@/lib/env";
import type {
  FlydubaiSearchRequest,
  FlydubaiSearchResponse,
  FlydubaiFlightOffer,
  FlydubaiFlightSegment,
} from "@/types/flydubai";

export class FlydubaiClientError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "FlydubaiClientError";
  }
}

export class FlydubaiServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public payload?: unknown
  ) {
    super(message);
    this.name = "FlydubaiServiceError";
  }
}

const padTime = (value: number) => String(value).padStart(2, "0");

const buildDateTime = (date: string, hour: number, minute: number) =>
  `${date}T${padTime(hour)}:${padTime(minute)}`;

const buildMockSegment = (
  origin: string,
  destination: string,
  date: string,
  departHour: number,
  durationMinutes: number,
  flightNumber: string,
  stops: number
): FlydubaiFlightSegment => {
  const arrivalHour = departHour + Math.floor(durationMinutes / 60);
  const arrivalMinute = durationMinutes % 60;
  return {
    origin,
    destination,
    departureDateTime: buildDateTime(date, departHour, 0),
    arrivalDateTime: buildDateTime(date, arrivalHour, arrivalMinute),
    flightNumber,
    durationMinutes,
    stops,
  };
};

const buildMockOffer = (request: FlydubaiSearchRequest, index: number): FlydubaiFlightOffer => {
  const origin = request.origin.trim().toUpperCase();
  const destination = request.destination.trim().toUpperCase();
  const departureDate = request.departureDate.trim();
  const returnDate = request.returnDate?.trim() || null;
  const cabinClass = request.cabinClass?.trim() || "economy";
  const currency = (request.currency ?? "USD").trim().toUpperCase() || "USD";
  const passengers =
    (typeof request.adults === "number" ? request.adults : 1) +
    (typeof request.children === "number" ? request.children : 0);
  const basePrice = 160 + Math.max(1, passengers) * 45;
  const multipliers = [0.95, 1.05, 1.2];
  const price = Math.round(basePrice * multipliers[index % multipliers.length]);
  const stops = index === 2 ? 1 : 0;
  const duration = 180 + index * 35;
  const departHour = 7 + index * 2;
  const outbound = buildMockSegment(
    origin,
    destination,
    departureDate,
    departHour,
    duration,
    `FZ${120 + index}`,
    stops
  );

  const returnSegments = returnDate
    ? [
        buildMockSegment(
          destination,
          origin,
          returnDate,
          14 + index,
          duration + 15,
          `FZ${220 + index}`,
          stops
        ),
      ]
    : null;

  return {
    id: `mock-${origin}-${destination}-${index}`,
    totalPrice: price,
    currency,
    cabinClass,
    refundable: index === 1,
    segments: [outbound],
    returnSegments,
  };
};

const buildMockSearch = (request: FlydubaiSearchRequest): FlydubaiSearchResponse => {
  const offers = Array.from({ length: 3 }, (_, index) => buildMockOffer(request, index));
  const currency = (request.currency ?? "USD").trim().toUpperCase() || "USD";
  return { offers, currency, mock: true };
};

export async function searchFlydubai(
  request: FlydubaiSearchRequest,
  options: { allowMock?: boolean } = {}
): Promise<FlydubaiSearchResponse> {
  if (!isFlydubaiConfigured()) {
    if (options.allowMock) {
      return buildMockSearch(request);
    }
    throw new FlydubaiClientError("Missing FLYDUBAI_SEARCH_URL configuration");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FLYDUBAI_TIMEOUT_MS);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (FLYDUBAI_API_KEY) headers["x-api-key"] = FLYDUBAI_API_KEY;
  if (FLYDUBAI_ACCESS_TOKEN) headers.Authorization = `Bearer ${FLYDUBAI_ACCESS_TOKEN}`;

  try {
    const response = await fetch(FLYDUBAI_SEARCH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message =
        typeof errorPayload.error === "string"
          ? errorPayload.error
          : `Flydubai API error: ${response.status} ${response.statusText}`;
      throw new FlydubaiServiceError(message, response.status, errorPayload);
    }

    const data = (await response.json()) as FlydubaiSearchResponse;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof FlydubaiServiceError) {
      throw error;
    }
    if (error instanceof FlydubaiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new FlydubaiClientError(`Request timeout after ${FLYDUBAI_TIMEOUT_MS}ms`);
    }
    throw new FlydubaiClientError(error instanceof Error ? error.message : "Unknown error");
  }
}
