import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { getFeaturedHotelAdminItems } from "@/lib/featured-hotels";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";

type TranslationPayload = {
  badge?: string;
  availability?: string;
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildTranslations = (value: Record<string, TranslationPayload> | null | undefined) => {
  const locales: Locale[] = ["hy", "en", "ru"];
  const translations: Record<Locale, { badge: string; availability: string }> = {
    hy: { badge: "", availability: "" },
    en: { badge: "", availability: "" },
    ru: { badge: "", availability: "" },
  };

  locales.forEach((locale) => {
    const entry = value?.[locale];
    translations[locale] = {
      badge: normalizeText(entry?.badge),
      availability: normalizeText(entry?.availability),
    };
  });

  return translations;
};

const hasMissingTranslations = (translations: Record<Locale, { badge: string; availability: string }>) =>
  (Object.values(translations) as Array<{ badge: string; availability: string }>).some(
    (entry) => entry.badge.length === 0 || entry.availability.length === 0
  );

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featuredHotels = await getFeaturedHotelAdminItems();
    return NextResponse.json({ featuredHotels });
  } catch (error) {
    console.error("[AdminFeaturedHotels] Failed to load featured hotels", error);
    return NextResponse.json({ error: "Failed to load featured hotels" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const hotelCode = normalizeText(body.hotelCode);
    const priceFrom = parseNumber(body.priceFrom);
    const oldPrice = parseNumber(body.oldPrice);
    const currency = normalizeText(body.currency) || "$";
    const amenitiesInput: unknown[] = Array.isArray(body.amenities)
      ? (body.amenities as unknown[])
      : [];
    const amenities = amenitiesInput
      .map(normalizeText)
      .filter((item) => item.length > 0);
    const translations = buildTranslations(body.translations ?? null);

    if (!hotelCode) {
      return NextResponse.json({ error: "hotelCode is required" }, { status: 400 });
    }
    if (priceFrom === null || priceFrom <= 0) {
      return NextResponse.json({ error: "priceFrom is required" }, { status: 400 });
    }
    if (oldPrice === null || oldPrice <= 0) {
      return NextResponse.json({ error: "oldPrice is required" }, { status: 400 });
    }
    if (amenities.length !== 3) {
      return NextResponse.json({ error: "Select exactly 3 amenities" }, { status: 400 });
    }
    if (hasMissingTranslations(translations)) {
      return NextResponse.json({ error: "Badge and availability are required in all languages" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();
    await db.collection("home_featured_hotels").updateOne(
      { hotelCode },
      {
        $set: {
          hotelCode,
          priceFrom,
          oldPrice,
          currency,
          amenities,
          translations,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const featuredHotels = await getFeaturedHotelAdminItems();
    return NextResponse.json({ featuredHotels });
  } catch (error) {
    console.error("[AdminFeaturedHotels] Failed to save featured hotel", error);
    return NextResponse.json({ error: "Failed to save featured hotel" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const hotelCode = normalizeText(body.hotelCode);
    if (!hotelCode) {
      return NextResponse.json({ error: "hotelCode is required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("home_featured_hotels").deleteOne({ hotelCode });

    const featuredHotels = await getFeaturedHotelAdminItems();
    return NextResponse.json({ featuredHotels });
  } catch (error) {
    console.error("[AdminFeaturedHotels] Failed to remove featured hotel", error);
    return NextResponse.json({ error: "Failed to remove featured hotel" }, { status: 500 });
  }
}
