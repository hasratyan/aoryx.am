import { getDb } from "@/lib/db";
import type { AmdRates } from "@/lib/currency";

// const API_URL = "https://api.exchangerate-api.com/v4/latest/AMD";
const API_URL = "https://cb.am/latest.json.php?currency=USD";

const parseRate = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const toAmdRate = (raw: unknown, adjustment = 0, precision = 1): number | null => {
  const parsed = parseRate(raw);
  if (parsed === null) return null;
  const amdPerUnit = parsed < 10 ? 1 / parsed : parsed;
  const adjusted = amdPerUnit + adjustment;
  const rounded = Number(adjusted.toFixed(precision));
  return Number.isFinite(rounded) ? rounded : null;
};

const readRateValue = (data: unknown, currency: string): unknown => {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const upper = currency.toUpperCase();
  const lower = currency.toLowerCase();
  if (record[upper] != null) return record[upper];
  if (record[lower] != null) return record[lower];
  const nested = record.rates ?? record.data;
  if (nested && typeof nested === "object") {
    const nestedRecord = nested as Record<string, unknown>;
    if (nestedRecord[upper] != null) return nestedRecord[upper];
    if (nestedRecord[lower] != null) return nestedRecord[lower];
  }
  return null;
};

const buildCurrencyUrl = (currency: string): string | null => {
  try {
    const url = new URL(API_URL);
    if (!url.searchParams.has("currency")) return null;
    url.searchParams.set("currency", currency.toUpperCase());
    return url.toString();
  } catch {
    return null;
  }
};

const fetchRatesFrom = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal }).catch((err) => {
      if (err.name === "AbortError") throw new Error("Request timed out");
      throw err;
    });
    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const asString = (value as { toString: () => string }).toString();
    if (asString && asString.trim().length > 0) {
      const parsed = Number(asString);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
};

const normalizePercent = (raw: number | null): number => {
  if (raw == null) return 0;
  return raw > 1 ? raw / 100 : raw;
};

export { convertToAmd } from "@/lib/currency";

async function fetchAmdRates(): Promise<AmdRates> {
  const data = await fetchRatesFrom(API_URL);
  let usd = toAmdRate(readRateValue(data, "USD"), 4, 1);
  let eur = toAmdRate(readRateValue(data, "EUR"), 8, 1);

  if (usd === null || eur === null) {
    const usdUrl = buildCurrencyUrl("USD");
    const eurUrl = buildCurrencyUrl("EUR");
    if (usd === null && usdUrl) {
      usd = toAmdRate(readRateValue(await fetchRatesFrom(usdUrl), "USD"), 4, 1);
    }
    if (eur === null && eurUrl) {
      eur = toAmdRate(readRateValue(await fetchRatesFrom(eurUrl), "EUR"), 8, 1);
    }
  }

  if (usd === null || eur === null) {
    if (usd !== null && eur === null) {
      console.warn("[ExchangeRates] Missing EUR rate, falling back to USD rate.");
      return { USD: usd, EUR: usd };
    }
    throw new Error("Missing required exchange rates in API response");
  }

  return { USD: usd, EUR: eur };
}

export async function getAmdRates(): Promise<AmdRates> {

  const rates = await fetchAmdRates();
  return rates;
}

export async function getAoryxHotelPlatformFee(): Promise<number> {

  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({});
    const record = (doc as Record<string, unknown>) ?? {};
    const rawHotel =
      toNumber(record.aoryxHotelsB2CPlatformFee) ??
      toNumber((record.aoryx as Record<string, unknown>)?.hotelsB2CPlatformFee) ??
      toNumber((record.aoryx as Record<string, unknown>)?.hotelsPlatformFee) ??
      toNumber(record.aoryxHotelsPlatformFee);
    const hotelMarkup = normalizePercent(rawHotel);
    return hotelMarkup;
  } catch (error) {
    console.error("[Pricing] Failed to fetch platform fee", error);
    return 0;
  }
}

export async function getAoryxExcursionFee(): Promise<number> {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({});
    const record = (doc as Record<string, unknown>) ?? {};
    const rawExcursions =
      toNumber(record.aoryxExcursionsPlatformFee) ??
      toNumber((record.aoryx as Record<string, unknown>)?.excursionsPlatformFee);
    return rawExcursions ?? 0;
  } catch (error) {
    console.error("[Pricing] Failed to fetch excursion fee", error);
    return 0;
  }
}

export async function getAoryxExcursionPlatformFee(): Promise<number> {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({});
    const record = (doc as Record<string, unknown>) ?? {};
    const rawExcursions =
      toNumber(record.aoryxExcursionsB2CPlatformFee) ??
      toNumber((record.aoryx as Record<string, unknown>)?.excursionsB2CPlatformFee);
    return rawExcursions ?? 0;
  } catch (error) {
    console.error("[Pricing] Failed to fetch excursion platform fee", error);
    return 0;
  }
}

export async function getEffectiveAmdRates(): Promise<AmdRates> {
  const [rates, fee] = await Promise.all([getAmdRates(), getAoryxHotelPlatformFee()]);
  const multiplier = 1 + fee;
  return {
    USD: Number((rates.USD * multiplier).toFixed(1)),
    EUR: Number((rates.EUR * multiplier).toFixed(1)),
  };
}

export async function getEffectiveAmdExcursionRates(): Promise<AmdRates> {
  return getAmdRates();
}

export type { AmdRates };
