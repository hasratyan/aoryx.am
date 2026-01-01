import nodemailer from "nodemailer";
import type { AoryxBookingPayload, AoryxBookingResult } from "@/types/aoryx";
import { calculateBookingTotal } from "@/lib/booking-total";
import { formatCurrencyAmount } from "@/lib/currency";
import { defaultLocale, Locale, locales } from "@/lib/i18n";

type BookingEmailInput = {
  to: string;
  name?: string | null;
  payload: AoryxBookingPayload;
  result?: AoryxBookingResult | null;
  locale?: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveLocale = (value?: string | null): Locale => {
  if (!value) return defaultLocale;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  return `${start} — ${end}`;
};

const buildTransport = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const secure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

export async function sendBookingConfirmationEmail({
  to,
  name,
  payload,
  result,
  locale,
}: BookingEmailInput) {
  if (!to) return false;
  const transport = buildTransport();
  if (!transport) {
    console.warn("[Email] Missing SMTP configuration. Skipping booking email.");
    return false;
  }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "";
  if (!from) {
    console.warn("[Email] Missing FROM address. Skipping booking email.");
    return false;
  }

  const safeLocale = resolveLocale(locale);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://megatours.am").replace(/\/$/, "");
  const bookingId = payload.customerRefNumber ?? "—";
  const hotelName = payload.hotelName ?? payload.hotelCode ?? "Hotel";
  const dateRange = formatDateRange(payload.checkInDate, payload.checkOutDate);
  const total = calculateBookingTotal(payload);
  const totalLabel = formatCurrencyAmount(total, payload.currency, "en-GB") ?? `${total} ${payload.currency}`;
  const confirmation =
    result?.hotelConfirmationNumber ??
    result?.supplierConfirmationNumber ??
    result?.adsConfirmationNumber ??
    "—";
  const voucherUrl = `${baseUrl}/${safeLocale}/profile/voucher/${bookingId}?download=1`;
  const profileUrl = `${baseUrl}/${safeLocale}/profile`;

  const services: string[] = [];
  services.push(`Hotel: ${hotelName}`);
  if (payload.transferSelection) {
    const route = [payload.transferSelection.origin?.name, payload.transferSelection.destination?.name]
      .filter(Boolean)
      .join(" → ");
    services.push(`Transfer: ${route || payload.transferSelection.transferType || "Selected"}`);
  }
  if (payload.excursions) {
    services.push(`Excursions: ${payload.excursions.selections?.length ?? 1} selected`);
  }
  if (payload.insurance) {
    services.push(`Insurance: ${payload.insurance.planName ?? payload.insurance.planId}`);
  }
  if (payload.airTickets) {
    const route = [payload.airTickets.origin, payload.airTickets.destination].filter(Boolean).join(" → ");
    services.push(`Flights: ${route || "Selected"}`);
  }

  const safeName = name?.trim() || "Traveler";
  const subject = `Booking confirmed: ${hotelName} (${bookingId})`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; color: #64748b; margin: 0 0 12px;">MegaTours</p>
        <h1 style="margin: 0 0 12px; font-size: 24px;">Booking confirmed</h1>
        <p style="margin: 0 0 16px; color: #475569;">Hi ${escapeHtml(safeName)}, your booking is confirmed. Keep the details below for your trip.</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px;"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
          <p style="margin: 0 0 6px;"><strong>Hotel:</strong> ${escapeHtml(hotelName)}</p>
          ${dateRange ? `<p style="margin: 0 0 6px;"><strong>Dates:</strong> ${escapeHtml(dateRange)}</p>` : ""}
          <p style="margin: 0 0 6px;"><strong>Confirmation:</strong> ${escapeHtml(confirmation)}</p>
          <p style="margin: 0;"><strong>Total:</strong> ${escapeHtml(totalLabel)}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 600;">Included services</p>
          <ul style="margin: 0; padding-left: 18px; color: #475569;">
            ${services.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="${voucherUrl}" style="background: #0ea5a6; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 999px; font-weight: 600;">Download voucher</a>
          <a href="${profileUrl}" style="background: #e2e8f0; color: #0f172a; text-decoration: none; padding: 10px 16px; border-radius: 999px; font-weight: 600;">View profile</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Booking confirmed`,
    `Booking ID: ${bookingId}`,
    `Hotel: ${hotelName}`,
    dateRange ? `Dates: ${dateRange}` : null,
    `Confirmation: ${confirmation}`,
    `Total: ${totalLabel}`,
    `Voucher: ${voucherUrl}`,
    `Profile: ${profileUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking confirmation", error);
    return false;
  }
}
