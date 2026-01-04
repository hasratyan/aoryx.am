import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import { getDb } from "@/lib/db";
import { hotelInfo as getHotelInfo } from "@/lib/aoryx-client";
import { calculateBookingTotal } from "@/lib/booking-total";
import { getAoryxHotelPlatformFee } from "@/lib/pricing";

const resolveLocaleFromParam = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const resolveLocaleFromCookie = async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("megatours-locale")?.value;
  return locales.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : defaultLocale;
};

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const resolvedLocale = resolveLocaleFromParam(params.locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.payment.success.title,
    description: t.payment.success.body,
    path: "/payment/success",
  });
}

const formatDate = (dateStr: string | null | undefined, locale: string) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : locale === "ru" ? "ru-RU" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
};

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { EDP_BILL_NO } = await searchParams;
  const locale = await resolveLocaleFromCookie();
  const t = getTranslations(locale);
  const session = await getServerSession(authOptions);

  let bookingRecord: any = null;
  let hotelName = null;
  let errorKey: keyof typeof t.payment.errors | null = null;

  if (typeof EDP_BILL_NO !== "string") {
    errorKey = "invalidBill";
  } else {
    const db = await getDb();
    bookingRecord = await db.collection("idram_payments").findOne({ billNo: EDP_BILL_NO });

    if (!bookingRecord) {
      errorKey = "invalidBill";
    } else if (!session?.user?.id) {
      errorKey = "signInRequired";
    } else if (bookingRecord.userId !== session.user.id) {
      errorKey = "unauthorized";
    }

    if (bookingRecord && !errorKey) {
      hotelName = bookingRecord.payload?.hotelName;
      if (!hotelName && bookingRecord.payload?.hotelCode) {
        const info = await getHotelInfo(bookingRecord.payload.hotelCode);
        hotelName = info?.name;
      }
    }
  }

  if (errorKey) {
    return (
      <main className="container payment-status failure">
        <span className="material-symbols-rounded">error</span>
        <h1>{t.profile.errors.title}</h1>
        <p>{t.payment.errors[errorKey]}</p>
        <Link href="/" className="payment-link">
          <span className="material-symbols-rounded">home</span>
          {t.payment.failure.cta}
        </Link>
      </main>
    );
  }

  const payload = bookingRecord?.payload;
  const bookingResult = bookingRecord?.bookingResult;
  const hotelMarkup = await getAoryxHotelPlatformFee();
  const total = payload ? calculateBookingTotal(payload, { hotelMarkup }) : null;
  const currency = payload?.currency ?? "USD";

  return (
    <main className="container payment-status success">
      <span className="material-symbols-rounded">check</span>
      <h1>{t.payment.success.title}</h1>
      <p>{t.payment.success.body}</p>

      <div className="profile-item" style={{ textAlign: "left", width: "100%", maxWidth: "600px" }}>
        <div className="profile-item-header">
          <h3>{hotelName || payload?.hotelCode || t.profile.bookings.labels.hotelCode}</h3>
        </div>
        <p className="profile-item-meta">
          {t.profile.bookings.labels.bookingId}: {payload?.customerRefNumber ?? "—"}
          {payload?.destinationCode ? ` • ${t.profile.bookings.labels.destination}: ${payload.destinationCode}` : ""}
        </p>

        <div className="profile-item-grid">
          <div>
            <span>{t.profile.searches.labels.dates}</span>
            <strong>
              {formatDate(payload?.checkInDate, locale)} — {formatDate(payload?.checkOutDate, locale)}
            </strong>
          </div>

          <div>
            <span>{t.profile.bookings.labels.guests}</span>
            <strong>
              {payload?.rooms.reduce(
                (acc: number, r: any) => acc + r.adults + (r.childrenAges?.length || 0),
                0
              )}
            </strong>
          </div>

          <div>
            <span>{t.profile.bookings.labels.total}</span>
            <strong>
              {total} {currency}
            </strong>
          </div>

          {(bookingResult?.hotelConfirmationNumber || bookingResult?.supplierConfirmationNumber) && (
            <div>
              <span>{t.profile.bookings.labels.confirmation}</span>
              <strong>
                {bookingResult.hotelConfirmationNumber || bookingResult.supplierConfirmationNumber}
              </strong>
            </div>
          )}
        </div>
      </div>

      <p>{t.payment.success.note}</p>
      <Link href="/profile" className="payment-link">
        <span className="material-symbols-rounded">account_circle</span>
        {t.payment.success.cta}
      </Link>
    </main>
  );
}
