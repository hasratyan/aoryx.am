import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const normalizeUserId = (userId: string) => {
  const normalized = userId.trim();
  const objectId = ObjectId.isValid(normalized) ? new ObjectId(normalized) : null;
  return {
    userId: objectId ?? normalized,
    userIdString: normalized,
  };
};

const parseString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseHotelCode = (value: unknown): string | null => parseString(value);

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const clampLimit = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const favoritesCollection = db.collection("user_favorites");
  const { userIdString } = normalizeUserId(userId);

  const hotelCode = parseString(request.nextUrl.searchParams.get("hotelCode"));
  if (hotelCode) {
    const doc = await favoritesCollection.findOne({ userIdString, hotelCode });
    return NextResponse.json({ isFavorite: Boolean(doc) });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const rawLimit = Number(limitParam);
  const limit = clampLimit(Number.isFinite(rawLimit) ? rawLimit : 24, 1, 48);
  const docs = await favoritesCollection
    .find({ userIdString })
    .sort({ savedAt: -1 })
    .limit(limit)
    .toArray();

  const items = docs.map((doc) => ({
    hotelCode: doc.hotelCode ?? null,
    name: doc.name ?? null,
    city: doc.city ?? null,
    address: doc.address ?? null,
    imageUrl: doc.imageUrl ?? null,
    rating: doc.rating ?? null,
    savedAt: doc.savedAt ?? null,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const hotelCode = parseHotelCode(body?.hotelCode);
  if (!hotelCode) {
    return NextResponse.json({ error: "Missing hotelCode" }, { status: 400 });
  }

  const db = await getDb();
  const favoritesCollection = db.collection("user_favorites");
  const ids = normalizeUserId(userId);
  const existing = await favoritesCollection.findOne({ userIdString: ids.userIdString, hotelCode });

  if (existing) {
    await favoritesCollection.deleteOne({ _id: existing._id });
    return NextResponse.json({ isFavorite: false });
  }

  const now = new Date();
  const payload = {
    ...ids,
    hotelCode,
    name: parseString(body?.name),
    city: parseString(body?.city),
    address: parseString(body?.address),
    imageUrl: parseString(body?.imageUrl),
    rating: parseNumber(body?.rating),
    source: parseString(body?.source) ?? "aoryx",
    savedAt: now,
    updatedAt: now,
  };

  await favoritesCollection.updateOne(
    { userIdString: ids.userIdString, hotelCode },
    {
      $set: payload,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  return NextResponse.json({ isFavorite: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hotelCode = parseString(request.nextUrl.searchParams.get("hotelCode"));
  if (!hotelCode) {
    return NextResponse.json({ error: "Missing hotelCode" }, { status: 400 });
  }

  const db = await getDb();
  const favoritesCollection = db.collection("user_favorites");
  const { userIdString } = normalizeUserId(userId);

  await favoritesCollection.deleteOne({ userIdString, hotelCode });
  return NextResponse.json({ isFavorite: false });
}
