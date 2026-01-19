import type { Locale } from "@/lib/i18n";

type EfesLocationOption = {
  code: string;
  labels: Record<Locale, string>;
};

type EfesLocationEntry = {
  regions: EfesLocationOption[];
  cities: Record<string, EfesLocationOption[]>;
};

const EFES_LOCATION_OPTIONS: Record<string, EfesLocationEntry> = {
  AM: {
    regions: [
      {
        code: "YR",
        labels: { hy: "Երևան", en: "Yerevan", ru: "Ереван" },
      },
    ],
    cities: {
      YR: [
        {
          code: "YR01",
          labels: { hy: "Երևան", en: "Yerevan", ru: "Ереван" },
        },
      ],
    },
  },
};

const resolveLocationLabel = (labels: Record<Locale, string>, locale: Locale) =>
  labels[locale] ?? labels.en;

export const getEfesRegionOptions = (countryCode: string | null | undefined, locale: Locale) => {
  if (!countryCode) return [];
  const entry = EFES_LOCATION_OPTIONS[countryCode.toUpperCase()];
  if (!entry) return [];
  return entry.regions.map((option) => ({
    code: option.code,
    label: resolveLocationLabel(option.labels, locale),
  }));
};

export const getEfesCityOptions = (
  countryCode: string | null | undefined,
  regionCode: string | null | undefined,
  locale: Locale
) => {
  if (!countryCode || !regionCode) return [];
  const entry = EFES_LOCATION_OPTIONS[countryCode.toUpperCase()];
  if (!entry) return [];
  const cities = entry.cities[regionCode] ?? [];
  return cities.map((option) => ({
    code: option.code,
    label: resolveLocationLabel(option.labels, locale),
  }));
};
