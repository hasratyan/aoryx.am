import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import ProfileSignIn from "@/components/profile-signin";
import VoucherActions from "@/components/voucher-actions";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { calculateBookingTotal } from "@/lib/booking-total";
import { formatCurrencyAmount } from "@/lib/currency";
import { applyMarkup } from "@/lib/pricing-utils";
import { getAoryxHotelPlatformFee } from "@/lib/pricing";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import type { AoryxBookingPayload, AoryxBookingResult } from "@/types/aoryx";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; bookingId: string }>;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

export async function generateMetadata({ params }: { params: { locale: string; bookingId: string } }) {
  const resolvedLocale = resolveLocale(params.locale);
  const t = getTranslations(resolvedLocale);
  const bookingId = params.bookingId?.trim();
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.profile.voucher.title,
    description: t.profile.voucher.subtitle,
    path: bookingId ? `/profile/voucher/${bookingId}` : "/profile/voucher",
  });
}

const parseSearchDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: Date | string | null | undefined, locale: string) => {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
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

const getNights = (start?: string | null, end?: string | null) => {
  const startDate = parseSearchDate(start ?? null);
  const endDate = parseSearchDate(end ?? null);
  if (!startDate || !endDate) return null;
  const diff = endDate.getTime() - startDate.getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
};

const countGuestsFromRooms = (rooms: AoryxBookingPayload["rooms"]) =>
  rooms.reduce((sum, room) => sum + room.adults + room.childrenAges.length, 0);

type BookingStatusKey = "confirmed" | "pending" | "failed" | "unknown";

const getStatusKey = (status?: string | null): BookingStatusKey => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirm") || normalized.includes("complete")) return "confirmed";
  if (normalized.includes("fail") || normalized.includes("cancel")) return "failed";
  if (normalized.includes("pending") || normalized.includes("process")) return "pending";
  return "unknown";
};

const formatPrice = (amount: number | null | undefined, currency: string | null | undefined) =>
  formatCurrencyAmount(amount ?? null, currency ?? null, "en-GB") ?? "—";

export default async function VoucherPage({ params }: PageProps) {
  const { locale, bookingId } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <main className="container voucher-page">
        <ProfileSignIn />
      </main>
    );
  }

  const db = await getDb();
  const bookingRecord = await db.collection("user_bookings").findOne({
    userIdString: session.user.id,
    "payload.customerRefNumber": bookingId,
  });

  if (!bookingRecord?.payload) {
    notFound();
  }

  const payload = bookingRecord.payload as AoryxBookingPayload;
  const booking = (bookingRecord.booking ?? null) as AoryxBookingResult | null;
  const createdAt = bookingRecord.createdAt ? new Date(bookingRecord.createdAt) : null;
  const hotelMarkup = await getAoryxHotelPlatformFee();

  const statusKey = getStatusKey(booking?.status ?? null);
  const statusLabel = t.profile.bookings.status[statusKey];
  const dateRange = formatDateRange(payload.checkInDate, payload.checkOutDate, resolvedLocale);
  const issuedOn = createdAt ? formatDate(createdAt, resolvedLocale) : "—";
  const nights = getNights(payload.checkInDate, payload.checkOutDate);
  const roomsCount = payload.rooms.length;
  const guestsCount = countGuestsFromRooms(payload.rooms);
  const confirmation =
    booking?.hotelConfirmationNumber ??
    booking?.supplierConfirmationNumber ??
    booking?.adsConfirmationNumber ??
    "—";

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
  const roomsTotalWithMarkup = applyMarkup(roomsTotal, hotelMarkup) ?? roomsTotal;
  const totalLabel = formatPrice(calculateBookingTotal(payload, { hotelMarkup }), payload.currency);

  const serviceCards = [
    {
      id: "hotel",
      title: t.packageBuilder.services.hotel,
      price: formatPrice(roomsTotalWithMarkup, payload.currency),
      details: [
        payload.hotelName ?? payload.hotelCode ?? t.profile.bookings.labels.hotelCode,
        payload.destinationCode
          ? `${t.profile.bookings.labels.destination}: ${payload.destinationCode}`
          : null,
        dateRange ? `${t.profile.searches.labels.dates}: ${dateRange}` : null,
        `${t.profile.bookings.labels.rooms}: ${roomsCount}`,
        `${t.profile.bookings.labels.guests}: ${guestsCount}`,
      ].filter(Boolean) as string[],
    },
  ];

  if (payload.transferSelection) {
    const route = [payload.transferSelection.origin?.name, payload.transferSelection.destination?.name]
      .filter(Boolean)
      .join(" → ");
    serviceCards.push({
      id: "transfer",
      title: t.packageBuilder.services.transfer,
      price: formatPrice(payload.transferSelection.totalPrice ?? null, payload.transferSelection.pricing?.currency ?? payload.currency),
      details: [
        route ? `${t.packageBuilder.checkout.labels.route}: ${route}` : null,
        payload.transferSelection.vehicle?.name
          ? `${t.packageBuilder.checkout.labels.vehicle}: ${payload.transferSelection.vehicle.name}`
          : null,
        payload.transferSelection.transferType
          ? `${t.packageBuilder.checkout.labels.type}: ${payload.transferSelection.transferType}`
          : null,
      ].filter(Boolean) as string[],
    });
  }

  if (payload.excursions) {
    const selections = payload.excursions.selections ?? [];
    const excursionDetails = selections.length
      ? selections.map((selection) => {
          const label = selection.name ?? selection.id;
          const parts: string[] = [];
          if (typeof selection.quantityAdult === "number") {
            parts.push(`${selection.quantityAdult} ${t.packageBuilder.checkout.guestAdultLabel}`);
          }
          if (typeof selection.quantityChild === "number") {
            parts.push(`${selection.quantityChild} ${t.packageBuilder.checkout.guestChildLabel}`);
          }
          return parts.length > 0 ? `${label} · ${parts.join(" / ")}` : label;
        })
      : [];
    serviceCards.push({
      id: "excursion",
      title: t.packageBuilder.services.excursion,
      price: formatPrice(payload.excursions.totalAmount ?? null, selections[0]?.currency ?? payload.currency),
      details: excursionDetails.length > 0 ? excursionDetails : [t.packageBuilder.checkout.pendingDetails],
    });
  }

  if (payload.insurance) {
    serviceCards.push({
      id: "insurance",
      title: t.packageBuilder.services.insurance,
      price: formatPrice(payload.insurance.price ?? null, payload.insurance.currency ?? payload.currency),
      details: [
        payload.insurance.planName ?? payload.insurance.planId,
        payload.insurance.note ?? null,
      ].filter(Boolean) as string[],
    });
  }

  if (payload.airTickets) {
    const route = [payload.airTickets.origin, payload.airTickets.destination].filter(Boolean).join(" → ");
    const dates = [payload.airTickets.departureDate, payload.airTickets.returnDate].filter(Boolean).join(" / ");
    serviceCards.push({
      id: "flight",
      title: t.packageBuilder.services.flight,
      price: formatPrice(payload.airTickets.price ?? null, payload.airTickets.currency ?? payload.currency),
      details: [
        route ? `${t.packageBuilder.checkout.labels.route}: ${route}` : null,
        dates ? `${t.profile.searches.labels.dates}: ${dates}` : null,
        payload.airTickets.cabinClass ? payload.airTickets.cabinClass : null,
      ].filter(Boolean) as string[],
    });
  }

  return (
    <main className="voucher-page">
      <div className="container voucher-shell">
        <div className="voucher-hero">
          <div>
            <h1>{t.profile.voucher.title}</h1>
            <p className="voucher-subtitle">{t.profile.voucher.subtitle}</p>
          </div>
          <div className="voucher-meta">
            <div className={`status-chip status-${statusKey}`}>
              <span>{statusLabel}</span>
            </div>
            <div className="voucher-meta-line">
              <span>{t.profile.bookings.labels.bookingId}</span>
              <strong>{payload.customerRefNumber ?? "—"}</strong>
            </div>
            <div className="voucher-meta-line">
              <span>{t.profile.bookings.labels.confirmation}</span>
              <strong>{confirmation}</strong>
            </div>
            <div className="voucher-meta-line">
              <span>{t.profile.voucher.issuedOn}</span>
              <strong>{issuedOn}</strong>
            </div>
          </div>
        </div>

        <VoucherActions
          downloadLabel={t.profile.voucher.downloadPdf}
          backLabel={t.profile.voucher.backToProfile}
          profileHref={`/${resolvedLocale}/profile`}
        />

        <section className="voucher-grid">
          <div className="voucher-card">
            <h2>{t.profile.voucher.sections.stay}</h2>
            <div className="voucher-definition">
              <div>
                <span>{t.profile.bookings.labels.hotelCode}</span>
                <strong>{payload.hotelName ?? payload.hotelCode ?? "—"}</strong>
              </div>
              <div>
                <span>{t.profile.searches.labels.dates}</span>
                <strong>{dateRange ?? "—"}</strong>
              </div>
              <div>
                <span>{t.profile.bookings.labels.rooms}</span>
                <strong>{roomsCount}</strong>
              </div>
              <div>
                <span>{t.profile.bookings.labels.guests}</span>
                <strong>{guestsCount}</strong>
              </div>
              {nights ? (
                <div>
                  <span>{t.common.night.other}</span>
                  <strong>{nights}</strong>
                </div>
              ) : null}
              {payload.destinationCode ? (
                <div>
                  <span>{t.profile.bookings.labels.destination}</span>
                  <strong>{payload.destinationCode}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="voucher-card">
            <h2>{t.profile.voucher.sections.payment}</h2>
            <div className="voucher-total">
              <div>
                <span>{t.profile.bookings.labels.total}</span>
                <strong>{totalLabel}</strong>
              </div>
              <p>{t.profile.voucher.paymentNote}</p>
            </div>
          </div>
        </section>

        <section className="voucher-card voucher-card--services">
          <h2>{t.profile.voucher.sections.services}</h2>
          <div className="voucher-services">
            {serviceCards.map((service) => (
              <fieldset key={service.id} className="voucher-service">
                <legend>{service.title}</legend>
                <ul className="voucher-service__details">
                  {service.details.length > 0 ? (
                    service.details.map((detail, index) => (
                      <li key={`${service.id}-${index}`}>{detail}</li>
                    ))
                  ) : (
                    <li>{t.packageBuilder.checkout.pendingDetails}</li>
                  )}
                </ul>
                <span className="voucher-service__price">{service.price}</span>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="voucher-card voucher-card--guests">
          <h2>{t.profile.voucher.sections.guests}</h2>
          <div className="voucher-rooms">
            {payload.rooms.map((room, index) => (
              <div key={room.roomIdentifier} className="voucher-room">
                <div className="voucher-room__header">
                  <h3>
                    {t.packageBuilder.checkout.guestRoomLabel} {index + 1}
                  </h3>
                  <span>
                    {room.adults} {t.search.adultsLabel}
                    {room.childrenAges.length ? ` • ${room.childrenAges.length} ${t.search.childrenLabel}` : ""}
                  </span>
                </div>
                <ul className="voucher-guest-list">
                  {room.guests.map((guest, guestIndex) => (
                    <li key={`${room.roomIdentifier}-${guestIndex}`}>
                      <div>
                        <strong>
                          {guest.firstName} {guest.lastName}
                        </strong>
                        <span>
                          {guest.type === "Adult"
                            ? t.packageBuilder.checkout.guestAdultLabel
                            : t.packageBuilder.checkout.guestChildLabel}
                          {" • "}
                          {t.packageBuilder.checkout.ageLabel}: {guest.age}
                        </span>
                      </div>
                      {guest.isLeadGuest ? (
                        <span className="voucher-lead">{t.packageBuilder.checkout.guestLeadLabel}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="voucher-card voucher-card--notes">
          <h2>{t.profile.voucher.sections.notes}</h2>
          <p>{t.profile.voucher.notes}</p>
        </section>
      </div>
    </main>
  );
}
