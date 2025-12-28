import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import ProfileSignIn from "@/components/profile-signin";
import ProfileView from "@/components/profile-view";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import type { AoryxBookingPayload, AoryxBookingResult, AoryxSearchParams } from "@/types/aoryx";

type BookingRecord = {
  createdAt?: Date | string | null;
  booking?: AoryxBookingResult | null;
  payload?: AoryxBookingPayload | null;
  source?: string | null;
};

type SearchRecord = {
  createdAt?: Date | string | null;
  params?: AoryxSearchParams | null;
  resultSummary?: {
    propertyCount?: number | null;
    destinationCode?: string | null;
    destinationName?: string | null;
  } | null;
};

type FavoriteRecord = {
  hotelCode: string;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  savedAt?: Date | string | null;
};

type FavoriteDocument = FavoriteRecord & {
  userIdString: string;
};

type UserProfile = {
  createdAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
  lastSearchAt?: Date | string | null;
  lastBookingAt?: Date | string | null;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const resolvedLocale = resolveLocale(params.locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.profile.title,
    description: t.profile.subtitle,
    path: "/profile",
  });
}

const serializeDate = (value?: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const sanitizeBookingPayload = (payload?: AoryxBookingPayload | null): AoryxBookingPayload | null => {
  if (!payload) return null;
  return {
    ...payload,
    sessionId: "",
    groupCode: 0,
    rooms: payload.rooms.map((room) => ({
      ...room,
      rateKey: "",
    })),
  };
};

const sanitizeBookingResult = (booking?: AoryxBookingResult | null): AoryxBookingResult | null => {
  if (!booking) return null;
  return {
    ...booking,
    sessionId: "",
    rooms: booking.rooms.map((room) => ({
      ...room,
      rateKey: null,
    })),
  };
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <main className="container profile-page">
        <ProfileSignIn />
      </main>
    );
  }

  let profile: UserProfile | null = null;
  let bookings: BookingRecord[] = [];
  let searches: SearchRecord[] = [];
  let favorites: FavoriteRecord[] = [];
  let bookingCount = 0;
  let searchCount = 0;
  let favoriteCount = 0;
  let hasError = false;

  try {
    const db = await getDb();
    const userIdString = session.user.id;
    const profilesCollection = db.collection("user_profiles");
    const bookingsCollection = db.collection("user_bookings");
    const searchesCollection = db.collection("user_searches");
    const favoritesCollection = db.collection<FavoriteDocument>("user_favorites");

    const [profileDoc, bookingDocs, searchDocs, favoriteDocs, bookingTotal, searchTotal, favoriteTotal] = await Promise.all([
      profilesCollection.findOne({ userIdString }),
      bookingsCollection.find({ userIdString }).sort({ createdAt: -1 }).limit(12).toArray(),
      searchesCollection.find({ userIdString }).sort({ createdAt: -1 }).limit(12).toArray(),
      favoritesCollection.find({ userIdString }).sort({ savedAt: -1 }).limit(12).toArray(),
      bookingsCollection.countDocuments({ userIdString }),
      searchesCollection.countDocuments({ userIdString }),
      favoritesCollection.countDocuments({ userIdString }),
    ]);

    profile = profileDoc as UserProfile | null;
    bookings = bookingDocs as BookingRecord[];
    searches = searchDocs as SearchRecord[];
    favorites = favoriteDocs;
    bookingCount = bookingTotal;
    searchCount = searchTotal;
    favoriteCount = favoriteTotal;
  } catch (error) {
    console.error("[Profile] Failed to load user data", error);
    hasError = true;
  }

  const serializedProfile = profile
    ? {
        createdAt: serializeDate(profile.createdAt),
        lastLoginAt: serializeDate(profile.lastLoginAt),
        lastSearchAt: serializeDate(profile.lastSearchAt),
        lastBookingAt: serializeDate(profile.lastBookingAt),
      }
    : null;

  const serializedBookings = bookings.map((item) => ({
    createdAt: serializeDate(item.createdAt),
    booking: sanitizeBookingResult(item.booking ?? null),
    payload: sanitizeBookingPayload(item.payload ?? null),
    source: item.source ?? null,
  }));

  const serializedSearches = searches.map((item) => ({
    createdAt: serializeDate(item.createdAt),
    params: item.params ?? null,
    resultSummary: item.resultSummary ?? null,
  }));

  const serializedFavorites = favorites.map((item) => ({
    hotelCode: item.hotelCode,
    name: item.name ?? null,
    city: item.city ?? null,
    address: item.address ?? null,
    imageUrl: item.imageUrl ?? null,
    rating: item.rating ?? null,
    savedAt: serializeDate(item.savedAt),
  }));

  return (
    <main className="container profile-page">
      <ProfileView
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }}
        profile={serializedProfile}
        bookings={serializedBookings}
        searches={serializedSearches}
        favorites={serializedFavorites}
        bookingCount={bookingCount}
        searchCount={searchCount}
        favoriteCount={favoriteCount}
        hasError={hasError}
      />
    </main>
  );
}
