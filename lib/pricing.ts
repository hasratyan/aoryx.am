import { getDb } from "@/lib/db";

type AmdRates = {
  USD: number;
  EUR: number;
};

const API_URL = "https://api.exchangerate-api.com/v4/latest/AMD";

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
  const amdPerUnit = 1 / parsed + adjustment;
  const rounded = Number(amdPerUnit.toFixed(precision));
  return Number.isFinite(rounded) ? rounded : null;
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

const normalizeCurrency = (currency: string | null | undefined) =>
  (currency ?? "USD").trim().toUpperCase();

async function fetchAmdRates(): Promise<AmdRates> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(API_URL, { signal: controller.signal }).catch((err) => {
      if (err.name === "AbortError") throw new Error("Request timed out");
      throw err;
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }

    const data = await response.json();
    const rates = (data as { rates?: Record<string, unknown> }).rates || {};

    const usd = toAmdRate(rates.USD, 4, 1);
    const eur = toAmdRate(rates.EUR, 8, 1);

    if (usd === null || eur === null) {
      throw new Error("Missing required exchange rates in API response");
    }

    return { USD: usd, EUR: eur };
  } finally {
    clearTimeout(timeout);
  }
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

export function convertToAmd(
  amount: number,
  currency: string | null | undefined,
  rates: AmdRates
): number | null {
  if (!Number.isFinite(amount)) return null;
  const normalized = normalizeCurrency(currency);
  if (normalized === "AMD") return amount;
  if (normalized === "USD") return amount * rates.USD;
  if (normalized === "EUR") return amount * rates.EUR;
  return null;
}

export type { AmdRates };
