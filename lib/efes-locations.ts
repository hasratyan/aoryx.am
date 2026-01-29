import type { Locale } from "@/lib/i18n";

export type EfesLocationOption = {
  code: string;
  label: string;
};

export type EfesRaState = {
  id: string;
  raw: Record<string, unknown>;
};

export type EfesRaCityVillage = {
  id: string;
  raw: Record<string, unknown>;
};

const EFES_RA_STATES_URL =
  typeof window === "undefined"
    ? "https://api.efes.am/api/v1/ra-states"
    : "/api/efes/ra-states";
const EFES_RA_CITY_VILLAGES_URL = (stateId: string) => {
  const safeId = encodeURIComponent(stateId);
  return typeof window === "undefined"
    ? `https://api.efes.am/api/v1/ra-states/${safeId}/city-villages`
    : `/api/efes/ra-states/${safeId}/city-villages`;
};

const LOCALE_KEYS: Record<Locale, string[]> = {
  hy: ["hy", "hy-AM", "hy_AM", "am", "arm"],
  en: ["en", "en-GB", "en_US", "en-US"],
  ru: ["ru", "ru-RU", "ru_RU"],
};

const LOCATION_FIELD_KEYS: Record<Locale, string[]> = {
  hy: [
    "name_hy",
    "name_am",
    "name_arm",
    "title_hy",
    "label_hy",
    "name",
    "title",
    "label",
  ],
  en: ["name_en", "title_en", "label_en", "name", "title", "label"],
  ru: ["name_ru", "title_ru", "label_ru", "name", "title", "label"],
};

const readString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveLabelFromContainer = (container: unknown, locale: Locale) => {
  const direct = readString(container);
  if (direct) return direct;
  if (!container || typeof container !== "object") return null;
  const map = container as Record<string, unknown>;
  const localeKeys = LOCALE_KEYS[locale] ?? [];
  for (const key of localeKeys) {
    const label = readString(map[key]);
    if (label) return label;
  }
  if (locale !== "en") {
    for (const key of LOCALE_KEYS.en) {
      const label = readString(map[key]);
      if (label) return label;
    }
  }
  for (const value of Object.values(map)) {
    const label = readString(value);
    if (label) return label;
  }
  return null;
};

const resolveEfesLocationLabel = (record: Record<string, unknown>, locale: Locale) => {
  const containers = [
    record.translations,
    record.translation,
    record.i18n,
    record.name,
    record.title,
    record.label,
  ];
  for (const container of containers) {
    const label = resolveLabelFromContainer(container, locale);
    if (label) return label;
  }
  const fieldKeys = LOCATION_FIELD_KEYS[locale] ?? [];
  for (const key of fieldKeys) {
    const label = readString(record[key]);
    if (label) return label;
  }
  return readString(record.name) ?? readString(record.title) ?? readString(record.label);
};

const resolveEfesLocationId = (record: Record<string, unknown>) => {
  const keys = [
    "id",
    "state_id",
    "region_id",
    "ra_state_id",
    "city_village_id",
    "city_id",
    "code",
    "value",
  ];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" || typeof value === "string") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return null;
};

const normalizeEfesList = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const candidates = [
    "data",
    "items",
    "results",
    "list",
    "ra_states",
    "states",
    "city_villages",
    "cityVillages",
    "cities",
    "villages",
  ];
  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => Boolean(item && typeof item === "object")
      );
    }
  }
  if (record.data && typeof record.data === "object") {
    return normalizeEfesList(record.data);
  }
  return [];
};

const buildEfesOptions = (
  items: Array<{ id: string; raw: Record<string, unknown> }>,
  locale: Locale
) =>
  items.map((item) => ({
    code: item.id,
    label: resolveEfesLocationLabel(item.raw, locale) ?? item.id,
  }));

const fetchEfesJson = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`EFES locations request failed: ${response.status}`);
  }
  return response.json();
};

let raStatesCache: EfesRaState[] | null = null;
let raStatesPromise: Promise<EfesRaState[]> | null = null;
const raCityCache: Record<string, EfesRaCityVillage[] | undefined> = {};
const raCityPromises: Record<string, Promise<EfesRaCityVillage[]> | undefined> = {};

const parseEfesLocations = (payload: unknown): Array<{ id: string; raw: Record<string, unknown> }> => {
  const list = normalizeEfesList(payload);
  const seen = new Set<string>();
  const entries: Array<{ id: string; raw: Record<string, unknown> }> = [];
  list.forEach((record) => {
    const id = resolveEfesLocationId(record);
    if (!id || seen.has(id)) return;
    seen.add(id);
    entries.push({ id, raw: record });
  });
  return entries;
};

export const fetchEfesRaStates = async (): Promise<EfesRaState[]> => {
  if (raStatesCache) return raStatesCache;
  if (raStatesPromise) return raStatesPromise;
  raStatesPromise = fetchEfesJson(EFES_RA_STATES_URL)
    .then((payload) => {
      const states = parseEfesLocations(payload).map((entry) => ({
        id: entry.id,
        raw: entry.raw,
      }));
      raStatesCache = states;
      return states;
    })
    .finally(() => {
      raStatesPromise = null;
    });
  return raStatesPromise;
};

export const fetchEfesRaCityVillages = async (stateId: string): Promise<EfesRaCityVillage[]> => {
  const normalizedId = stateId.trim();
  if (!normalizedId) return [];
  if (raCityCache[normalizedId]) return raCityCache[normalizedId] ?? [];
  if (raCityPromises[normalizedId]) return raCityPromises[normalizedId] ?? [];
  const url = EFES_RA_CITY_VILLAGES_URL(normalizedId);
  raCityPromises[normalizedId] = fetchEfesJson(url)
    .then((payload) => {
      const cities = parseEfesLocations(payload).map((entry) => ({
        id: entry.id,
        raw: entry.raw,
      }));
      raCityCache[normalizedId] = cities;
      return cities;
    })
    .finally(() => {
      raCityPromises[normalizedId] = undefined;
    });
  return raCityPromises[normalizedId] ?? [];
};

const isArmenia = (countryCode: string | null | undefined) => {
  if (!countryCode) return false;
  const normalized = countryCode.trim().toUpperCase();
  return normalized === "AM" || normalized === "ARM";
};

export const getEfesRegionOptions = (
  countryCode: string | null | undefined,
  locale: Locale,
  states?: EfesRaState[]
) => {
  if (!isArmenia(countryCode)) return [];
  return buildEfesOptions(states ?? [], locale);
};

export const getEfesCityOptions = (
  countryCode: string | null | undefined,
  regionCode: string | null | undefined,
  locale: Locale,
  citiesByState?: Record<string, EfesRaCityVillage[]>
) => {
  if (!isArmenia(countryCode)) return [];
  if (!regionCode) return [];
  const cities = citiesByState?.[regionCode] ?? [];
  return buildEfesOptions(cities, locale);
};
