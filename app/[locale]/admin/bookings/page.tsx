import AdminBookingsClient from "./admin-bookings-client";
import ProfileSignIn from "@/components/profile-signin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasAdminConfig, isAdminUser } from "@/lib/admin";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import { resolveBookingDisplayTotal } from "@/lib/booking-total";
import { getAmdRates, getAoryxHotelPlatformFee } from "@/lib/pricing";
import type { AoryxBookingPayload, AoryxBookingResult } from "@/types/aoryx";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type BookingRecord = {
  _id?: unknown;
  createdAt?: Date | string | null;
  userIdString?: string | null;
  source?: string | null;
  payload?: AoryxBookingPayload | null;
  booking?: AoryxBookingResult | null;
};

type AdminBookingRecord = {
  id: string;
  createdAt: string | null;
  userIdString: string | null;
  userName: string | null;
  userEmail: string | null;
  source: string | null;
  payload: AoryxBookingPayload | null;
  booking: AoryxBookingResult | null;
  displayTotal?: number | null;
  displayCurrency?: string | null;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const serializeDate = (value?: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.admin.title,
    description: t.admin.subtitle,
    path: "/admin/bookings",
  });
}

export default async function AdminBookingsPage({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  const session = await getServerSession(authOptions);
  const userIdentity = {
    id: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };

  if (!session?.user) {
    return (
      <main className="container admin-page">
        <ProfileSignIn
          title={t.admin.access.signInTitle}
          body={t.admin.access.signInBody}
          cta={t.admin.access.signInCta}
        />
      </main>
    );
  }

  if (!hasAdminConfig()) {
    return (
      <main className="container admin-page">
        <section className="profile-card admin-empty">
          <h1>{t.admin.access.configTitle}</h1>
          <p>{t.admin.access.configBody}</p>
        </section>
      </main>
    );
  }

  if (!isAdminUser(userIdentity)) {
    return (
      <main className="container admin-page">
        <section className="profile-card admin-empty">
          <h1>{t.admin.access.deniedTitle}</h1>
          <p>{t.admin.access.deniedBody}</p>
        </section>
      </main>
    );
  }

  const db = await getDb();
  const bookingDocs = (await db
    .collection("user_bookings")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()) as BookingRecord[];

  const userIds = Array.from(
    new Set(
      bookingDocs
        .map((entry) => entry.userIdString)
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
    )
  );

  const profileDocs = userIds.length
    ? await db
        .collection("user_profiles")
        .find({ userIdString: { $in: userIds } })
        .project({ userIdString: 1, name: 1, email: 1 })
        .toArray()
    : [];

  const profileMap = new Map(
    profileDocs.map((profile) => [
      profile.userIdString as string,
      {
        name: (profile as { name?: string | null }).name ?? null,
        email: (profile as { email?: string | null }).email ?? null,
      },
    ])
  );

  const bookings: AdminBookingRecord[] = bookingDocs.map((entry) => {
    const profile = entry.userIdString ? profileMap.get(entry.userIdString) ?? null : null;
    return {
      id:
        (entry._id && typeof (entry._id as { toString?: () => string }).toString === "function"
          ? (entry._id as { toString: () => string }).toString()
          : "") ?? "",
      createdAt: serializeDate(entry.createdAt),
      userIdString: entry.userIdString ?? null,
      userName: profile?.name ?? null,
      userEmail: profile?.email ?? null,
      source: entry.source ?? null,
      payload: sanitizeBookingPayload(entry.payload ?? null),
      booking: sanitizeBookingResult(entry.booking ?? null),
    };
  });
  const [hotelMarkup, rates] = await Promise.all([
    getAoryxHotelPlatformFee(),
    getAmdRates().catch((error) => {
      console.error("[ExchangeRates] Failed to load rates", error);
      return null;
    }),
  ]);

  const bookingsWithTotals = bookings.map((entry) => {
    const payload = entry.payload;
    const displayTotal = payload
      ? resolveBookingDisplayTotal(payload, rates, { hotelMarkup })
      : null;
    return {
      ...entry,
      displayTotal: displayTotal?.amount ?? null,
      displayCurrency: displayTotal?.currency ?? null,
    };
  });

  return (
    <main className="container admin-page">
      <AdminBookingsClient
        adminUser={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
        }}
        initialBookings={bookingsWithTotals}
      />
    </main>
  );
}
