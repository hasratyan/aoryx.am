import type { Locale } from "@/lib/i18n";
import { getB2bDb, getDb } from "@/lib/db";

export type FeaturedHotelTranslation = {
  badge: string;
  availability: string;
};

export type FeaturedHotelSelection = {
  hotelCode: string;
  priceFrom: number;
  oldPrice: number;
  currency: string;
  amenities: string[];
  translations: Record<Locale, FeaturedHotelTranslation>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type FeaturedHotelCard = {
  id: string;
  hotelCode: string;
  name: string;
  location: string;
  rating: number;
  image: string;
  perks: string[];
  priceFrom: number;
  oldPrice: number | null;
  currency: string;
  badge: string | null;
  availability: string | null;
};

export type FeaturedHotelAdminItem = {
  hotelCode: string;
  name: string | null;
  destinationName: string | null;
  rating: number | null;
  imageUrl: string | null;
  availableAmenities: string[];
  selectedAmenities: string[];
  priceFrom: number | null;
  oldPrice: number | null;
  currency: string | null;
  translations: Record<Locale, FeaturedHotelTranslation>;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AoryxHotelOption = {
  hotelCode: string;
  name: string | null;
  destinationName: string | null;
  rating: number | null;
  imageUrl: string | null;
  masterHotelAmenities: string[];
};

type AoryxHotelDoc = Record<string, unknown>;

type NormalizedAoryxHotel = {
  hotelCode: string;
  name: string | null;
  destinationName: string | null;
  rating: number | null;
  imageUrl: string | null;
  masterHotelAmenities: string[];
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return `${value}`;
  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readString = (record: AoryxHotelDoc, keys: string[]): string | null => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = toStringValue(record[key]);
      if (value) return value;
    }
  }
  return null;
};

const readNumber = (record: AoryxHotelDoc, keys: string[]): number | null => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = toNumberValue(record[key]);
      if (value !== null) return value;
    }
  }
  return null;
};

const readStringArray = (record: AoryxHotelDoc, keys: string[]): string[] => {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map(toStringValue).filter((item): item is string => Boolean(item));
    }
  }
  return [];
};

const normalizeAoryxHotelDoc = (record: AoryxHotelDoc): NormalizedAoryxHotel | null => {
  const hotelCode = readString(record, [
    "systemId",
    "SystemId",
    "hotelCode",
    "HotelCode",
    "code",
    "Code",
    "id",
    "_id",
  ]);
  if (!hotelCode) return null;

  return {
    hotelCode,
    name: readString(record, ["name", "Name", "hotelName", "HotelName"]),
    destinationName: readString(record, ["destinationName", "DestinationName", "city", "City"]),
    rating: readNumber(record, ["rating", "Rating", "starRating", "StarRating", "tripAdvisorRating", "TripAdvisorRating"]),
    imageUrl: readString(record, ["imageUrl", "ImageUrl", "image", "Image", "primaryImage", "PrimaryImage"]),
    masterHotelAmenities: readStringArray(record, [
      "masterHotelAmenities",
      "MasterHotelAmenities",
      "hotelAmenities",
      "HotelAmenities",
      "amenities",
      "Amenities",
    ]),
  };
};

const serializeDate = (value?: Date | string | null): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildTranslationFallback = (): Record<Locale, FeaturedHotelTranslation> => ({
  hy: { badge: "", availability: "" },
  en: { badge: "", availability: "" },
  ru: { badge: "", availability: "" },
});

export async function searchAoryxHotels(query: string, limit = 40): Promise<AoryxHotelOption[]> {
  const db = await getB2bDb();
  const docs = await db.collection("aoryx_hotels").find({}).toArray();
  const normalizedQuery = query.trim().toLowerCase();

  const options = docs
    .map((doc) => normalizeAoryxHotelDoc(doc as AoryxHotelDoc))
    .filter((item): item is NormalizedAoryxHotel => Boolean(item))
    .filter((item) => (item.rating ?? 0) >= 4 && Boolean(item.imageUrl));

  const filtered = normalizedQuery.length > 0
    ? options.filter((item) => {
        const searchTarget = [
          item.name,
          item.destinationName,
          item.hotelCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchTarget.includes(normalizedQuery);
      })
    : options;

  filtered.sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return filtered.slice(0, Math.max(limit, 1)).map((item) => ({
    hotelCode: item.hotelCode,
    name: item.name ?? null,
    destinationName: item.destinationName ?? null,
    rating: item.rating ?? null,
    imageUrl: item.imageUrl ?? null,
    masterHotelAmenities: item.masterHotelAmenities,
  }));
}

export async function getFeaturedHotelSelections(): Promise<FeaturedHotelSelection[]> {
  const db = await getDb();
  const docs = await db.collection("home_featured_hotels").find({}).sort({ createdAt: 1 }).toArray();
  return docs.map((doc) => ({
    hotelCode: toStringValue(doc.hotelCode) ?? "",
    priceFrom: toNumberValue(doc.priceFrom) ?? 0,
    oldPrice: toNumberValue(doc.oldPrice) ?? 0,
    currency: toStringValue(doc.currency) ?? "$",
    amenities: Array.isArray(doc.amenities)
      ? doc.amenities.map(toStringValue).filter((item): item is string => Boolean(item))
      : [],
    translations: typeof doc.translations === "object" && doc.translations
      ? {
          hy: {
            badge: toStringValue((doc.translations as Record<string, any>).hy?.badge) ?? "",
            availability: toStringValue((doc.translations as Record<string, any>).hy?.availability) ?? "",
          },
          en: {
            badge: toStringValue((doc.translations as Record<string, any>).en?.badge) ?? "",
            availability: toStringValue((doc.translations as Record<string, any>).en?.availability) ?? "",
          },
          ru: {
            badge: toStringValue((doc.translations as Record<string, any>).ru?.badge) ?? "",
            availability: toStringValue((doc.translations as Record<string, any>).ru?.availability) ?? "",
          },
        }
      : buildTranslationFallback(),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : undefined,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : undefined,
  })).filter((entry) => entry.hotelCode.length > 0);
}

export async function getAoryxHotelsByCodes(hotelCodes: string[]): Promise<Map<string, NormalizedAoryxHotel>> {
  if (hotelCodes.length === 0) return new Map();
  const db = await getB2bDb();
  const numericCodes = hotelCodes
    .map((code) => Number(code))
    .filter((value) => Number.isFinite(value));
  const searchValues: Array<string | number> = [...hotelCodes, ...numericCodes];

  const docs = await db
    .collection("aoryx_hotels")
    .find({
      $or: [
        { systemId: { $in: searchValues } },
        { SystemId: { $in: searchValues } },
        { hotelCode: { $in: searchValues } },
        { HotelCode: { $in: searchValues } },
        { code: { $in: searchValues } },
        { Code: { $in: searchValues } },
        { id: { $in: searchValues } },
        { _id: { $in: searchValues } },
      ],
    })
    .toArray();

  const map = new Map<string, NormalizedAoryxHotel>();
  for (const doc of docs) {
    const normalized = normalizeAoryxHotelDoc(doc as AoryxHotelDoc);
    if (!normalized) continue;
    map.set(normalized.hotelCode, normalized);
  }
  return map;
}

export async function getFeaturedHotelCards(locale: Locale): Promise<FeaturedHotelCard[]> {
  const selections = await getFeaturedHotelSelections();
  if (selections.length === 0) return [];
  const hotelMap = await getAoryxHotelsByCodes(selections.map((entry) => entry.hotelCode));
  const seen = new Set<string>();

  return selections
    .map((entry) => {
      if (seen.has(entry.hotelCode)) return null;
      const hotel = hotelMap.get(entry.hotelCode);
      if (!hotel) return null;
      const rating = hotel.rating ?? null;
      if (rating === null || rating < 4) return null;
      if (!hotel.imageUrl) return null;
      seen.add(entry.hotelCode);

      const translation = entry.translations?.[locale] ?? entry.translations?.en ?? entry.translations?.hy ?? entry.translations?.ru ?? null;
      const perks = entry.amenities.length > 0
        ? entry.amenities.slice(0, 3)
        : hotel.masterHotelAmenities.slice(0, 3);

      return {
        id: entry.hotelCode,
        hotelCode: entry.hotelCode,
        name: hotel.name ?? "",
        location: hotel.destinationName ?? "",
        rating,
        image: hotel.imageUrl,
        perks,
        priceFrom: entry.priceFrom,
        oldPrice: entry.oldPrice ?? null,
        currency: entry.currency || "$",
        badge: translation?.badge ?? null,
        availability: translation?.availability ?? null,
      };
    })
    .filter((item): item is FeaturedHotelCard => Boolean(item));
}

export async function getFeaturedHotelAdminItems(): Promise<FeaturedHotelAdminItem[]> {
  const selections = await getFeaturedHotelSelections();
  const hotelMap = await getAoryxHotelsByCodes(selections.map((entry) => entry.hotelCode));
  return selections.map((entry) => {
    const hotel = hotelMap.get(entry.hotelCode);
    return {
      hotelCode: entry.hotelCode,
      name: hotel?.name ?? null,
      destinationName: hotel?.destinationName ?? null,
      rating: hotel?.rating ?? null,
      imageUrl: hotel?.imageUrl ?? null,
      availableAmenities: hotel?.masterHotelAmenities ?? [],
      selectedAmenities: entry.amenities ?? [],
      priceFrom: entry.priceFrom ?? null,
      oldPrice: entry.oldPrice ?? null,
      currency: entry.currency ?? null,
      translations: entry.translations ?? buildTranslationFallback(),
      createdAt: serializeDate(entry.createdAt),
      updatedAt: serializeDate(entry.updatedAt),
    };
  });
}
