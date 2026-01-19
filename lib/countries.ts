import { COUNTRY_CODES } from "@/lib/country-codes";
import { toCountryAlpha2, toCountryAlpha3 } from "@/lib/country-alpha3";

export type CountryOption = {
  code: string;
  label: string;
  flag: string;
};

export type CountryOptionWithAlpha3 = CountryOption & {
  alpha3: string | null;
};

const FLAG_OFFSET = 127397;

const toFlagEmoji = (code: string) =>
  code
    .toUpperCase()
    .replace(/[A-Z]/g, (char) =>
      String.fromCodePoint(FLAG_OFFSET + char.charCodeAt(0))
    );

const displayNameCache = new Map<string, Intl.DisplayNames>();

const getDisplayNames = (locale: string) => {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    return null;
  }
  const cacheKey = locale || "en";
  const cached = displayNameCache.get(cacheKey);
  if (cached) return cached;
  const instance = new Intl.DisplayNames([cacheKey], { type: "region" });
  displayNameCache.set(cacheKey, instance);
  return instance;
};

export const getCountryOptions = (locale: string): CountryOption[] => {
  const displayNames = getDisplayNames(locale);
  const options = COUNTRY_CODES.map((code) => {
    let label: string = code;
    try {
      label = displayNames ? displayNames.of(code) ?? code : code;
    } catch {
      label = code;
    }
    return {
      code,
      label,
      flag: toFlagEmoji(code),
    };
  });
  return options.sort((a, b) =>
    a.label.localeCompare(b.label, locale || "en", { sensitivity: "base" })
  );
};

export const getCountryOptionsWithAlpha3 = (locale: string): CountryOptionWithAlpha3[] =>
  getCountryOptions(locale).map((option) => ({
    ...option,
    alpha3: toCountryAlpha3(option.code),
  }));

export const resolveCountryAlpha2 = (value: string | null | undefined) => {
  return toCountryAlpha2(value);
};
