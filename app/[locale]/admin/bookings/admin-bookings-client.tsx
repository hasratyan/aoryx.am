"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateBookingTotal } from "@/lib/booking-total";
import { useLanguage, useTranslations } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";
import type { AoryxBookingPayload, AoryxBookingResult } from "@/types/aoryx";

type AdminBookingRecord = {
  id: string;
  createdAt: string | null;
  userIdString: string | null;
  userName: string | null;
  userEmail: string | null;
  source: string | null;
  payload: AoryxBookingPayload | null;
  booking: AoryxBookingResult | null;
};

type AdminBookingsClientProps = {
  adminUser: { name?: string | null; email?: string | null };
  initialBookings: AdminBookingRecord[];
};

type BookingStatusKey = "confirmed" | "pending" | "failed" | "unknown";

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

const getStatusKey = (status?: string | null): BookingStatusKey => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirm") || normalized.includes("complete")) return "confirmed";
  if (normalized.includes("fail") || normalized.includes("cancel")) return "failed";
  if (normalized.includes("pending") || normalized.includes("process")) return "pending";
  return "unknown";
};

const countGuestsFromRooms = (rooms: Array<{ adults: number; childrenAges: number[] }>) =>
  rooms.reduce((sum, room) => sum + room.adults + room.childrenAges.length, 0);

const normalizeText = (value: string) => value.trim().toLowerCase();

export default function AdminBookingsClient({ adminUser, initialBookings }: AdminBookingsClientProps) {
  const t = useTranslations();
  const { locale } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusKey | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    setHydrated(true);
  }, []);

  const sources = useMemo(() => {
    const values = new Set<string>();
    initialBookings.forEach((booking) => {
      if (booking.source && booking.source.trim().length > 0) {
        values.add(booking.source.trim());
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [initialBookings]);

  const normalizedQuery = normalizeText(query);

  const filteredBookings = useMemo(() => {
    const entries = initialBookings.map((entry) => {
      const payload = entry.payload;
      const booking = entry.booking;
      const total = payload ? calculateBookingTotal(payload) : null;
      const guestsCount = payload ? countGuestsFromRooms(payload.rooms) : 0;
      const statusKey = getStatusKey(booking?.status ?? null);
      const createdTimestamp = entry.createdAt ? parseDate(entry.createdAt)?.getTime() ?? 0 : 0;
      const searchParts = [
        payload?.hotelName,
        payload?.hotelCode,
        payload?.destinationCode,
        payload?.customerRefNumber,
        booking?.customerRefNumber,
        booking?.hotelConfirmationNumber,
        booking?.supplierConfirmationNumber,
        booking?.adsConfirmationNumber,
        entry.userEmail,
        entry.userName,
        entry.userIdString,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        entry,
        payload,
        booking,
        total,
        guestsCount,
        statusKey,
        createdTimestamp,
        searchParts,
      };
    });

    const filtered = entries.filter((item) => {
      if (statusFilter !== "all" && item.statusKey !== statusFilter) return false;
      if (sourceFilter !== "all") {
        const source = item.entry.source?.trim() ?? "";
        if (!source || source !== sourceFilter) return false;
      }
      if (normalizedQuery.length > 0 && !item.searchParts.includes(normalizedQuery)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "oldest") return a.createdTimestamp - b.createdTimestamp;
      if (sortBy === "totalHigh") return (b.total ?? 0) - (a.total ?? 0);
      if (sortBy === "totalLow") return (a.total ?? 0) - (b.total ?? 0);
      return b.createdTimestamp - a.createdTimestamp;
    });

    return filtered;
  }, [initialBookings, normalizedQuery, sortBy, sourceFilter, statusFilter]);

  const stats = useMemo(() => {
    const counts: Record<BookingStatusKey, number> = {
      confirmed: 0,
      pending: 0,
      failed: 0,
      unknown: 0,
    };
    let totalGuests = 0;
    filteredBookings.forEach((item) => {
      counts[item.statusKey] += 1;
      totalGuests += item.guestsCount;
    });
    return {
      totalBookings: filteredBookings.length,
      totalGuests,
      counts,
    };
  }, [filteredBookings]);

  const formatDateSafe = (value: string | null | undefined) =>
    hydrated ? formatDate(value ?? null, intlLocale) : null;
  const formatDateRangeSafe = (start?: string | null, end?: string | null) =>
    hydrated ? formatDateRange(start, end, intlLocale) : null;

  const handleReset = () => {
    setQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setSortBy("newest");
  };

  return (
    <>
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.bookings.title}</h1>
          <p className="admin-subtitle">{t.admin.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{adminUser.name ?? adminUser.email ?? t.auth.guestNameFallback}</span>
          {adminUser.email && <small>{adminUser.email}</small>}
        </div>
      </section>

      <section className="admin-stats">
        <div className="admin-stat">
          <p>{t.admin.stats.totalBookings}</p>
          <strong>{stats.totalBookings}</strong>
        </div>
        <div className="admin-stat">
          <p>{t.admin.stats.totalGuests}</p>
          <strong>{stats.totalGuests}</strong>
        </div>
        <div className="admin-stat">
          <p>{t.admin.stats.confirmed}</p>
          <strong>{stats.counts.confirmed}</strong>
        </div>
        <div className="admin-stat">
          <p>{t.admin.stats.pending}</p>
          <strong>{stats.counts.pending}</strong>
        </div>
        <div className="admin-stat">
          <p>{t.admin.stats.failed}</p>
          <strong>{stats.counts.failed}</strong>
        </div>
        <div className="admin-stat">
          <p>{t.admin.stats.unknown}</p>
          <strong>{stats.counts.unknown}</strong>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.bookings.title}</h2>
            <p>{t.admin.bookings.subtitle}</p>
          </div>
          <div className="admin-controls">
            <label className="admin-control">
              <span>{t.admin.filters.searchPlaceholder}</span>
              <input
                type="search"
                value={query}
                placeholder={t.admin.filters.searchPlaceholder}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="admin-control">
              <span>{t.admin.filters.statusLabel}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BookingStatusKey | "all")}>
                <option value="all">{t.admin.filters.all}</option>
                <option value="confirmed">{t.profile.bookings.status.confirmed}</option>
                <option value="pending">{t.profile.bookings.status.pending}</option>
                <option value="failed">{t.profile.bookings.status.failed}</option>
                <option value="unknown">{t.profile.bookings.status.unknown}</option>
              </select>
            </label>
            <label className="admin-control">
              <span>{t.admin.filters.sourceLabel}</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                <option value="all">{t.admin.filters.all}</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-control">
              <span>{t.admin.filters.sortLabel}</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">{t.admin.filters.sortOptions.newest}</option>
                <option value="oldest">{t.admin.filters.sortOptions.oldest}</option>
                <option value="totalHigh">{t.admin.filters.sortOptions.totalHigh}</option>
                <option value="totalLow">{t.admin.filters.sortOptions.totalLow}</option>
              </select>
            </label>
            <button type="button" className="admin-reset" onClick={handleReset}>
              {t.admin.filters.reset}
            </button>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="profile-empty">
            <h3>{t.admin.bookings.emptyTitle}</h3>
            <p>{t.admin.bookings.emptyBody}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.admin.columns.bookingId}</th>
                  <th>{t.admin.columns.hotel}</th>
                  <th>{t.admin.columns.user}</th>
                  <th>{t.admin.columns.dates}</th>
                  <th>{t.admin.columns.guests}</th>
                  <th>{t.admin.columns.total}</th>
                  <th>{t.admin.columns.status}</th>
                  <th>{t.admin.columns.createdAt}</th>
                  <th>{t.admin.columns.source}</th>
                  <th>{t.admin.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((item) => {
                  const payload = item.payload;
                  const booking = item.booking;
                  const statusLabel = t.profile.bookings.status[item.statusKey];
                  const totalLabel =
                    payload && item.total !== null
                      ? formatPrice(item.total, payload.currency ?? "USD", intlLocale)
                      : "—";
                  const bookingId =
                    payload?.customerRefNumber ??
                    booking?.customerRefNumber ??
                    "—";
                  const confirmation =
                    booking?.hotelConfirmationNumber ??
                    booking?.supplierConfirmationNumber ??
                    booking?.adsConfirmationNumber ??
                    "—";
                  const dateRange = payload
                    ? formatDateRangeSafe(payload.checkInDate, payload.checkOutDate)
                    : null;
                  const createdLabel = formatDateSafe(item.entry.createdAt);
                  const hotelLabel = payload?.hotelName ?? payload?.hotelCode ?? "—";
                  const userLabel =
                    item.entry.userName ??
                    item.entry.userEmail ??
                    item.entry.userIdString ??
                    "—";
                  return (
                    <tr key={item.entry.id}>
                      <td>{bookingId}</td>
                      <td>
                        <div className="admin-cell-stack">
                          <span>{hotelLabel}</span>
                          {payload?.hotelCode && (
                            <small>{payload.hotelCode}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <span>{userLabel}</span>
                          {item.entry.userEmail && item.entry.userName && (
                            <small>{item.entry.userEmail}</small>
                          )}
                        </div>
                      </td>
                      <td>{dateRange ?? "—"}</td>
                      <td>{item.guestsCount}</td>
                      <td>{totalLabel}</td>
                      <td>
                        <span className={`status-chip status-${item.statusKey}`}>{statusLabel}</span>
                      </td>
                      <td>{createdLabel ?? "—"}</td>
                      <td>{item.entry.source ?? "—"}</td>
                      <td>
                        <details className="admin-detail">
                          <summary>{t.admin.actions.details}</summary>
                          <div className="admin-detail-body">
                            <div className="admin-detail-grid">
                              <div>
                                <span>{t.profile.bookings.labels.confirmation}</span>
                                <strong>{confirmation}</strong>
                              </div>
                              <div>
                                <span>{t.profile.bookings.labels.rooms}</span>
                                <strong>{payload?.rooms.length ?? 0}</strong>
                              </div>
                              <div>
                                <span>{t.profile.bookings.labels.destination}</span>
                                <strong>{payload?.destinationCode ?? "—"}</strong>
                              </div>
                              <div>
                                <span>{t.profile.bookings.labels.bookedOn}</span>
                                <strong>{createdLabel ?? "—"}</strong>
                              </div>
                            </div>
                            <div className="admin-json-grid">
                              <div>
                                <span>{t.admin.details.payload}</span>
                                <pre>{JSON.stringify(payload, null, 2)}</pre>
                              </div>
                              <div>
                                <span>{t.admin.details.booking}</span>
                                <pre>{JSON.stringify(booking, null, 2)}</pre>
                              </div>
                            </div>
                            {payload?.hotelCode && (
                              <Link className="profile-link" href={`/${locale}/hotels/${payload.hotelCode}`}>
                                {t.profile.bookings.viewHotel}
                              </Link>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
