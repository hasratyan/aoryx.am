import { NextRequest, NextResponse } from "next/server";
import { EfesClientError, EfesServiceError, createEfesPoliciesFromBooking } from "@/lib/efes-client";
import type { AoryxBookingPayload, BookingInsuranceSelection, BookingInsuranceTraveler } from "@/types/aoryx";

export const runtime = "nodejs";

const parseString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const parseStringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((entry) => parseString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : null;

const parseTraveler = (value: unknown): BookingInsuranceTraveler | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const firstName = parseString(record.firstName);
  const lastName = parseString(record.lastName);
  if (!firstName || !lastName) return null;

  const genderRaw = parseString(record.gender);
  const gender = genderRaw === "M" || genderRaw === "F" ? genderRaw : null;

  return {
    id: parseString(record.id) || null,
    firstName,
    lastName,
    firstNameEn: parseString(record.firstNameEn) || null,
    lastNameEn: parseString(record.lastNameEn) || null,
    gender,
    birthDate: parseString(record.birthDate) || null,
    residency: parseBoolean(record.residency),
    socialCard: parseString(record.socialCard) || null,
    passportNumber: parseString(record.passportNumber) || null,
    passportAuthority: parseString(record.passportAuthority) || null,
    passportIssueDate: parseString(record.passportIssueDate) || null,
    passportExpiryDate: parseString(record.passportExpiryDate) || null,
    phone: parseString(record.phone) || null,
    mobilePhone: parseString(record.mobilePhone) || null,
    email: parseString(record.email) || null,
    address:
      record.address && typeof record.address === "object"
        ? {
            full: parseString((record.address as Record<string, unknown>).full) || null,
            fullEn: parseString((record.address as Record<string, unknown>).fullEn) || null,
            country: parseString((record.address as Record<string, unknown>).country) || null,
            region: parseString((record.address as Record<string, unknown>).region) || null,
            city: parseString((record.address as Record<string, unknown>).city) || null,
          }
        : null,
    citizenship: parseString(record.citizenship) || null,
    premium: parseNumber(record.premium),
    premiumCurrency: parseString(record.premiumCurrency) || null,
    subrisks: parseStringList(record.subrisks),
  };
};

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const insuranceRaw = (body as { insurance?: unknown }).insurance;
    if (!insuranceRaw || typeof insuranceRaw !== "object") {
      return NextResponse.json(
        { error: "Missing insurance payload." },
        { status: 400 }
      );
    }

    const insuranceRecord = insuranceRaw as Record<string, unknown>;
    const provider = parseString(insuranceRecord.provider);
    if (provider !== "efes") {
      return NextResponse.json(
        { error: "Invalid insurance provider." },
        { status: 400 }
      );
    }

    const travelersRaw = insuranceRecord.travelers;
    if (!Array.isArray(travelersRaw) || travelersRaw.length === 0) {
      return NextResponse.json(
        { error: "Missing travelers for insurance." },
        { status: 400 }
      );
    }

    const travelers = travelersRaw
      .map((entry) => parseTraveler(entry))
      .filter((entry): entry is BookingInsuranceTraveler => Boolean(entry));

    if (travelers.length === 0) {
      return NextResponse.json(
        { error: "Missing traveler details." },
        { status: 400 }
      );
    }

    const checkInDate = parseString((body as { checkInDate?: unknown }).checkInDate);
    const checkOutDate = parseString((body as { checkOutDate?: unknown }).checkOutDate);
    const startDate = parseString(insuranceRecord.startDate) || checkInDate;
    const endDate = parseString(insuranceRecord.endDate) || checkOutDate;
    const travelCountries = parseString(insuranceRecord.travelCountries);

    if (!startDate || !endDate || !travelCountries) {
      return NextResponse.json(
        { error: "Missing travel dates or countries." },
        { status: 400 }
      );
    }

    const insurance: BookingInsuranceSelection = {
      planId: parseString(insuranceRecord.planId) || "insurance",
      planName: parseString(insuranceRecord.planName) || null,
      planLabel: parseString(insuranceRecord.planLabel) || null,
      price: parseNumber(insuranceRecord.price),
      currency: parseString(insuranceRecord.currency) || null,
      provider: "efes",
      riskAmount: parseNumber(insuranceRecord.riskAmount),
      riskCurrency: parseString(insuranceRecord.riskCurrency) || null,
      riskLabel: parseString(insuranceRecord.riskLabel) || null,
      territoryCode: parseString(insuranceRecord.territoryCode) || null,
      territoryLabel: parseString(insuranceRecord.territoryLabel) || null,
      territoryPolicyLabel: parseString(insuranceRecord.territoryPolicyLabel) || null,
      travelCountries,
      startDate,
      endDate,
      days: parseNumber(insuranceRecord.days),
      subrisks: parseStringList(insuranceRecord.subrisks),
      travelers,
    };

    const bookingPayload: AoryxBookingPayload = {
      sessionId: "dev-insurance",
      hotelCode: "DEV",
      destinationCode: "DEV",
      countryCode: "ARM",
      currency: insurance.currency ?? "AMD",
      nationality: "ARM",
      customerRefNumber: "DEV",
      groupCode: 0,
      rooms: [],
      insurance,
      checkInDate: startDate,
      checkOutDate: endDate,
    };

    console.log("[EFES][dev-submit] request", bookingPayload);
    const policies = await createEfesPoliciesFromBooking(bookingPayload);
    console.log("[EFES][dev-submit] response", policies);
    return NextResponse.json({ policies });
  } catch (error) {
    if (error instanceof EfesClientError || error instanceof EfesServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create insurance policy." },
      { status: 500 }
    );
  }
}
