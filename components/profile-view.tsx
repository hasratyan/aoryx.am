"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { calculateBookingTotal } from "@/lib/booking-total";
import { buildSearchQuery } from "@/lib/search-query";
import type { AoryxBookingPayload, AoryxBookingResult, AoryxSearchParams } from "@/types/aoryx";
import { useLanguage, useTranslations } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";
import { convertToAmd, useAmdRates } from "@/lib/use-amd-rates";

type BookingRecord = {
  createdAt?: string | null;
  booking?: AoryxBookingResult | null;
  payload?: AoryxBookingPayload | null;
  source?: string | null;
};

type SearchRecord = {
  createdAt?: string | null;
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
  savedAt?: string | null;
};

type ProfileMeta = {
  createdAt?: string | null;
  lastLoginAt?: string | null;
  lastSearchAt?: string | null;
  lastBookingAt?: string | null;
};

export type ProfileViewProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile: ProfileMeta | null;
  bookings: BookingRecord[];
  searches: SearchRecord[];
  favorites: FavoriteRecord[];
  bookingCount: number;
  searchCount: number;
  favoriteCount: number;
  hasError?: boolean;
};

const intlLocales: Record<Locale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseSearchDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: string | null | undefined, locale: string) => {
  const parsed = parseDate(value ?? null);
  if (!parsed) return null;
  if (locale.startsWith("hy")) {
    const months = ["հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"];
    const day = parsed.getDate().toString().padStart(2, "0");
    const month = months[parsed.getMonth()];
    return `${day} ${month}, ${parsed.getFullYear()} թ.`;
  }
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};

const formatDateRange = (start?: string | null, end?: string | null, locale?: string) => {
  const parsedStart = parseSearchDate(start ?? null);
  const parsedEnd = parseSearchDate(end ?? null);
  if (!parsedStart || !parsedEnd || !locale) return null;
  if (locale.startsWith("hy")) {
    const months = ["հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"];
    const startDay = parsedStart.getDate().toString().padStart(2, "0");
    const endDay = parsedEnd.getDate().toString().padStart(2, "0");
    const startMonth = months[parsedStart.getMonth()];
    const endMonth = months[parsedEnd.getMonth()];
    return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
  }
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return `${formatter.format(parsedStart)} — ${formatter.format(parsedEnd)}`;
};

const formatPrice = (amount: number, currency: string, locale: string) => {
  const safeCurrency = currency.trim().toUpperCase();
  try {
    const formattedNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
    if (safeCurrency === "AMD") return `${formattedNumber} ֏`;
    if (safeCurrency === "USD") return `$${formattedNumber}`;
    if (safeCurrency === "EUR") return `€${formattedNumber}`;
    return `${formattedNumber} ${safeCurrency}`;
  } catch {
    return `${safeCurrency} ${amount}`;
  }
};

type BookingStatusKey = "confirmed" | "pending" | "failed" | "unknown";

const getStatusKey = (status?: string | null): BookingStatusKey => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirm") || normalized.includes("complete")) return "confirmed";
  if (normalized.includes("fail") || normalized.includes("cancel")) return "failed";
  if (normalized.includes("pending") || normalized.includes("process")) return "pending";
  return "unknown";
};

const countGuestsFromRooms = (rooms: Array<{ adults: number; childrenAges: number[] }>) =>
  rooms.reduce((sum, room) => sum + room.adults + room.childrenAges.length, 0);

const getNights = (start?: string | null, end?: string | null) => {
  const startDate = parseSearchDate(start ?? null);
  const endDate = parseSearchDate(end ?? null);
  if (!startDate || !endDate) return null;
  const diff = endDate.getTime() - startDate.getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
};

export default function ProfileView({
  user,
  profile,
  bookings,
  searches,
  favorites,
  bookingCount,
  searchCount,
  favoriteCount,
  hasError,
}: ProfileViewProps) {
  const t = useTranslations();
  const { locale } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const { rates: hotelRates } = useAmdRates();
  const { rates: baseRates } = useAmdRates(undefined, {
    endpoint: "/api/utils/exchange-rates?scope=transfers",
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const formatDateSafe = (value: string | null | undefined) =>
    hydrated ? formatDate(value ?? null, intlLocale) : null;
  const formatDateRangeSafe = (start?: string | null, end?: string | null) =>
    hydrated ? formatDateRange(start, end, intlLocale) : null;
  const formatBookingTotal = (payload: AoryxBookingPayload | null) => {
    if (!payload) return null;
    const baseCurrency = payload.currency ?? "USD";
    const baseTotal = calculateBookingTotal(payload);
    const roomsTotal = payload.rooms.reduce((sum, room) => {
      const net = room.price.net;
      const gross = room.price.gross;
      const price =
        typeof net === "number" && Number.isFinite(net)
          ? net
          : typeof gross === "number" && Number.isFinite(gross)
            ? gross
            : 0;
      return sum + price;
    }, 0);
    const transferTotal =
      typeof payload.transferSelection?.totalPrice === "number" &&
      Number.isFinite(payload.transferSelection.totalPrice)
        ? payload.transferSelection.totalPrice
        : 0;
    const excursionsTotal =
      typeof payload.excursions?.totalAmount === "number" &&
      Number.isFinite(payload.excursions.totalAmount)
        ? payload.excursions.totalAmount
        : 0;
    const insuranceTotal =
      typeof payload.insurance?.price === "number" && Number.isFinite(payload.insurance.price)
        ? payload.insurance.price
        : 0;
    const flightsTotal =
      typeof payload.airTickets?.price === "number" && Number.isFinite(payload.airTickets.price)
        ? payload.airTickets.price
        : 0;

    const convertAmount = (
      amount: number,
      currency: string | null | undefined,
      rates: typeof baseRates
    ) => {
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      if (!rates) return null;
      const converted = convertToAmd(amount, currency, rates);
      return converted ?? null;
    };

    const transferCurrency = payload.transferSelection?.pricing?.currency ?? baseCurrency;
    const excursionsCurrency = payload.excursions?.selections?.[0]?.currency ?? baseCurrency;
    const insuranceCurrency = payload.insurance?.currency ?? baseCurrency;
    const flightsCurrency = payload.airTickets?.currency ?? baseCurrency;

    const roomsConverted = convertAmount(roomsTotal, baseCurrency, hotelRates);
    const transferConverted = convertAmount(transferTotal, transferCurrency, baseRates);
    const excursionsConverted = convertAmount(excursionsTotal, excursionsCurrency, baseRates);
    const insuranceConverted = convertAmount(insuranceTotal, insuranceCurrency, baseRates);
    const flightsConverted = convertAmount(flightsTotal, flightsCurrency, baseRates);

    if (
      roomsConverted === null ||
      transferConverted === null ||
      excursionsConverted === null ||
      insuranceConverted === null ||
      flightsConverted === null
    ) {
      return formatPrice(baseTotal, baseCurrency, intlLocale);
    }

    const totalAmd =
      roomsConverted +
      transferConverted +
      excursionsConverted +
      insuranceConverted +
      flightsConverted;
    return formatPrice(totalAmd, "AMD", intlLocale);
  };

  if (hasError) {
    return (
      <section className="profile-card profile-error">
        <h1>{t.profile.errors.title}</h1>
        <p>{t.profile.errors.body}</p>
      </section>
    );
  }

  const displayName = user.name || user.email || t.auth.guestNameFallback;
  const displayEmail = user.email ?? null;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const latestBooking = bookings[0]?.createdAt ?? profile?.lastBookingAt ?? null;
  const latestSearch = searches[0]?.createdAt ?? profile?.lastSearchAt ?? null;
  const lastLogin = profile?.lastLoginAt ?? null;
  const lastActivity =
    [latestBooking, latestSearch, lastLogin]
      .map((date) => parseDate(date ?? null))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const lastActivityLabel = lastActivity ? formatDateSafe(lastActivity.toISOString()) : null;

  const totalSearchNights = searches.reduce((sum, search) => {
    const nights = getNights(search.params?.checkInDate, search.params?.checkOutDate);
    return sum + (nights ?? 0);
  }, 0);
  const searchNightsCount = searches
    .map((search) => getNights(search.params?.checkInDate, search.params?.checkOutDate))
    .filter((value): value is number => typeof value === "number");
  const averageNights =
    searchNightsCount.length > 0
      ? Math.round((searchNightsCount.reduce((a, b) => a + b, 0) / searchNightsCount.length) * 10) / 10
      : null;

  const roomsBooked = bookings.reduce((sum, booking) => sum + (booking.payload?.rooms.length ?? 0), 0);

  const destinationCounts = new Map<string, number>();
  searches.forEach((search) => {
    const label =
      search.resultSummary?.destinationName ??
      search.params?.destinationCode ??
      search.params?.hotelCode ??
      null;
    if (!label) return;
    destinationCounts.set(label, (destinationCounts.get(label) ?? 0) + 1);
  });
  const topDestination =
    Array.from(destinationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const memberSince = profile?.createdAt ? formatDateSafe(profile.createdAt) : null;
  const latestBookingLabel = latestBooking ? formatDateSafe(latestBooking) : null;

  const actionItems = [
    {
      key: "newSearch",
      icon: "search",
      href: `/${locale}#hero`,
      disabled: false,
      copy: t.profile.actions.items.newSearch,
    },
    {
      key: "savedTravelers",
      icon: "person",
      href: null,
      disabled: true,
      copy: t.profile.actions.items.savedTravelers,
    },
    {
      key: "priceAlerts",
      icon: "notifications",
      href: null,
      disabled: true,
      copy: t.profile.actions.items.priceAlerts,
    },
  ];

  return (
    <>
      <div className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar">
            {user.image ? (
              <Image src={user.image} alt={displayName} fill sizes="96px" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div>
            {/* <p className="profile-label">{t.profile.title}</p> */}
            <h1>{displayName}</h1>
            <p className="profile-meta">
              {displayEmail && <span>{displayEmail}</span>}
              {memberSince && (
                <span>
                  {displayEmail && " • "}
                  {t.profile.memberSince} {memberSince}
                </span>
              )}
            </p>
            {/* <p className="profile-subtitle">{t.profile.subtitle}</p> */}
          </div>
        </div>
        <div className="profile-actions">
          <Link className="profile-action" href={`/${locale}#hero`}>
            <span className="material-symbols-rounded" aria-hidden="true">search</span>{t.profile.actions.items.newSearch.cta}
          </Link>
          <Link className="profile-action secondary" href={`/${locale}#featured`}>
            <span className="material-symbols-rounded" aria-hidden="true">explore</span>{t.profile.actions.browse}
          </Link>
        </div>
      </div>

      <section className="profile-stats">
        <article className="profile-stat">
          <p>{t.profile.stats.bookings}</p>
          <strong>{bookingCount}</strong>
        </article>
        <article className="profile-stat">
          <p>{t.profile.stats.searches}</p>
          <strong>{searchCount}</strong>
        </article>
        <article className="profile-stat">
          <p>{t.profile.stats.favorites}</p>
          <strong>{favoriteCount}</strong>
        </article>
        <article className="profile-stat">
          <p>{t.profile.stats.nights}</p>
          <strong>{totalSearchNights}</strong>
        </article>
        <article className="profile-stat">
          <p>{t.profile.stats.lastActivity}</p>
          <strong>{lastActivityLabel ?? (lastActivity ? "—" : t.profile.insights.empty)}</strong>
        </article>
      </section>

      <div className="profile-content">
        <div className="profile-main">
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>{t.profile.favorites.title}</h2>
              <p>{t.profile.favorites.subtitle}</p>
            </div>
            {favorites.length === 0 ? (
              <div className="profile-empty">
                <h3>{t.profile.favorites.emptyTitle}</h3>
                <p>{t.profile.favorites.emptyBody}</p>
              </div>
            ) : (
              <ul className="profile-list profile-favorites">
                {favorites.map((item, index) => {
                  const locationParts = [item.address, item.city].filter(Boolean);
                  const location = locationParts.join(", ");
                  const ratingValue =
                    typeof item.rating === "number" && Number.isFinite(item.rating)
                      ? item.rating.toFixed(1)
                      : null;
                  return (
                    <li key={`${item.hotelCode}-${index}`} className="profile-item profile-favorite">
                      <div className="profile-favorite-media">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name ?? item.hotelCode} width={100} height={100} />
                        ) : (
                          <span className="material-symbols-rounded" aria-hidden="true">
                            hotel
                          </span>
                        )}
                      </div>
                      <div className="profile-favorite-body">
                        <div className="profile-item-header">
                          <div>
                            <h3>{item.name ?? item.hotelCode}</h3>
                            <p className="profile-item-meta">
                              {location || t.profile.favorites.locationFallback}
                            </p>
                          </div>
                          {item.hotelCode && (
                            <Link className="profile-link" href={`/${locale}/hotels/${item.hotelCode}`}>
                              {t.profile.favorites.viewHotel}
                            </Link>
                          )}
                        </div>
                        <div className="profile-item-grid">
                          <div>
                            <span>{t.profile.favorites.labels.rating}</span>
                            <strong>{ratingValue ?? "—"}</strong>
                          </div>
                          <div>
                            <span>{t.profile.favorites.labels.savedOn}</span>
                            <strong>{item.savedAt ? formatDateSafe(item.savedAt) ?? "—" : "—"}</strong>
                          </div>
                          <div>
                            <span>{t.profile.favorites.labels.code}</span>
                            <strong>{item.hotelCode ?? "—"}</strong>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>{t.profile.bookings.title}</h2>
              <p>{t.profile.bookings.subtitle}</p>
            </div>
            {bookings.length === 0 ? (
              <div className="profile-empty">
                <h3>{t.profile.bookings.emptyTitle}</h3>
                <p>{t.profile.bookings.emptyBody}</p>
              </div>
            ) : (
              <ul className="profile-list">
                {bookings.map((item, index) => {
                  const payload = item.payload ?? null;
                  const booking = item.booking ?? null;
                  const statusKey = getStatusKey(booking?.status ?? null);
                  const statusLabel = t.profile.bookings.status[statusKey];
                  const totalLabel = payload ? formatBookingTotal(payload) ?? "—" : "—";
                  const roomsCount = payload?.rooms.length ?? 0;
                  const guestsCount = payload ? countGuestsFromRooms(payload.rooms) : 0;
                  const confirmation =
                    booking?.hotelConfirmationNumber ??
                    booking?.supplierConfirmationNumber ??
                    booking?.adsConfirmationNumber ??
                    "—";
                  return (
                    <li key={`${payload?.customerRefNumber ?? "booking"}-${index}`} className="profile-item">
                      <div className="profile-item-header">
                        <div>
                          <span className={`status-chip status-${statusKey}`}>{statusLabel}</span>
                          <h3>{payload?.hotelCode ?? t.profile.bookings.labels.hotelCode}</h3>
                          <p className="profile-item-meta">
                            {t.profile.bookings.labels.bookingId}: {payload?.customerRefNumber ?? "—"}
                            {payload?.destinationCode ? ` • ${t.profile.bookings.labels.destination}: ${payload.destinationCode}` : ""}
                          </p>
                        </div>
                        {payload?.hotelCode && (
                          <Link className="profile-link" href={`/${locale}/hotels/${payload.hotelCode}`}>
                            {t.profile.bookings.viewHotel}
                          </Link>
                        )}
                      </div>
                      <div className="profile-item-grid">
                        <div>
                          <span>{t.profile.bookings.labels.confirmation}</span>
                          <strong>{confirmation}</strong>
                        </div>
                        <div>
                          <span>{t.profile.bookings.labels.rooms}</span>
                          <strong>{roomsCount}</strong>
                        </div>
                        <div>
                          <span>{t.profile.bookings.labels.guests}</span>
                          <strong>{guestsCount}</strong>
                        </div>
                        <div>
                          <span>{t.profile.bookings.labels.total}</span>
                          <strong>{totalLabel}</strong>
                        </div>
                        <div>
                          <span>{t.profile.bookings.labels.bookedOn}</span>
                          <strong>{item.createdAt ? formatDateSafe(item.createdAt) ?? "—" : "—"}</strong>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>{t.profile.searches.title}</h2>
              <p>{t.profile.searches.subtitle}</p>
            </div>
            {searches.length === 0 ? (
              <div className="profile-empty">
                <h3>{t.profile.searches.emptyTitle}</h3>
                <p>{t.profile.searches.emptyBody}</p>
              </div>
            ) : (
              <ul className="profile-list">
                {searches.map((item, index) => {
                  const params = item.params;
                  if (!params) return null;
                  const searchQuery = buildSearchQuery(params);
                  const roomsCount = params.rooms.length;
                  const guestsCount = countGuestsFromRooms(params.rooms);
                  const dateRange = formatDateRangeSafe(params.checkInDate, params.checkOutDate);
                  const label =
                    item.resultSummary?.destinationName ??
                    params.destinationCode ??
                    params.hotelCode ??
                    "—";
                  const labelType = params.hotelCode ? t.profile.searches.labels.hotel : t.profile.searches.labels.destination;
                  return (
                    <li key={`${params.checkInDate}-${index}`} className="profile-item">
                      <div className="profile-item-header">
                        <div>
                          {/* <span className="status-chip status-neutral">{labelType}</span> */}
                          <h3>{label}</h3>
                          <p className="profile-item-meta">
                            {t.profile.searches.labels.dates}: {dateRange ?? "—"}
                          </p>
                        </div>
                        <Link className="profile-link" href={`/${locale}/results?${searchQuery}`}>
                          {t.profile.searches.searchAgain}
                        </Link>
                      </div>
                      <div className="profile-item-grid">
                        <div>
                          <span>{t.profile.searches.labels.results}</span>
                          <strong>{item.resultSummary?.propertyCount ?? "—"}</strong>
                        </div>
                        <div>
                          <span>{t.profile.searches.labels.rooms}</span>
                          <strong>{roomsCount}</strong>
                        </div>
                        <div>
                          <span>{t.profile.searches.labels.guests}</span>
                          <strong>{guestsCount}</strong>
                        </div>
                        <div>
                          <span>{t.profile.searches.labels.searchedOn}</span>
                          <strong>{item.createdAt ? formatDateSafe(item.createdAt) ?? "—" : "—"}</strong>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="profile-aside">
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>{t.profile.insights.title}</h2>
              <p>{t.profile.insights.subtitle}</p>
            </div>
            <div className="profile-insights">
              <div className="profile-insight">
                <span>{t.profile.insights.labels.topDestination}</span>
                <strong>{topDestination ?? t.profile.insights.empty}</strong>
              </div>
              <div className="profile-insight">
                <span>{t.profile.insights.labels.averageStay}</span>
                <strong>
                  {averageNights !== null ? averageNights.toString() : t.profile.insights.empty}
                </strong>
              </div>
              <div className="profile-insight">
                <span>{t.profile.insights.labels.roomsBooked}</span>
                <strong>{roomsBooked || t.profile.insights.empty}</strong>
              </div>
              <div className="profile-insight">
                <span>{t.profile.insights.labels.lastBooking}</span>
                <strong>{latestBookingLabel ?? (latestBooking ? "—" : t.profile.insights.empty)}</strong>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>{t.profile.actions.title}</h2>
            </div>
            <div className="profile-actions-grid">
              {actionItems.map((item) => {
                const content = (
                  <>
                    <span className="profile-action-icon material-symbols-rounded" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <h3>{item.copy.title}</h3>
                      <p>{item.copy.body}</p>
                    </div>
                    <span className={`profile-action-cta${item.disabled ? " disabled" : ""}`}>
                      {item.copy.cta}
                    </span>
                  </>
                );
                if (item.href && !item.disabled) {
                  return (
                    <Link key={item.key} className="profile-action-card" href={item.href}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={item.key} className="profile-action-card disabled" aria-disabled="true">
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
