"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";
import { postJson } from "@/lib/api-helpers";
import type { Locale as AppLocale } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import { getCountryOptions, getCountryOptionsWithAlpha3, resolveCountryAlpha2 } from "@/lib/countries";
import { getEfesCityOptions, getEfesRegionOptions } from "@/lib/efes-locations";
import { mapEfesErrorMessage } from "@/lib/efes-errors";
import type { PackageBuilderState, PackageBuilderService } from "@/lib/package-builder-state";
import {
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
} from "@/lib/package-builder-state";
import { useAmdRates } from "@/lib/use-amd-rates";
import type {
  AoryxBookingPayload,
  AoryxRoomSearch,
  AoryxTransferType,
  BookingInsuranceTraveler,
} from "@/types/aoryx";
import type { EfesQuoteRequest, EfesQuoteResult } from "@/types/efes";

type PaymentMethod = "idram" | "card";

type GuestForm = {
  id: string;
  type: "Adult" | "Child";
  age: number;
  firstName: string;
  lastName: string;
};

type RoomGuestForm = {
  roomIdentifier: number;
  guests: GuestForm[];
};

type InsuranceTravelerForm = BookingInsuranceTraveler & {
  id: string;
  age: number;
  type: "Adult" | "Child";
};

type BookingPayloadInput = Omit<AoryxBookingPayload, "sessionId" | "groupCode"> & {
  sessionId?: string;
  groupCode?: number;
};

type IdramCheckoutResponse = {
  action: string;
  fields: Record<string, string>;
  billNo: string;
};

const intlLocales: Record<AppLocale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const formatDateRange = (checkIn?: string | null, checkOut?: string | null, locale?: string) => {
  if (!checkIn || !checkOut) return null;
  const checkInDate = new Date(`${checkIn}T00:00:00`);
  const checkOutDate = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return null;
  const formatter = new Intl.DateTimeFormat(locale ?? "en-GB", { month: "short", day: "numeric" });
  return `${formatter.format(checkInDate)} - ${formatter.format(checkOutDate)}`;
};

const calculateTripDays = (checkIn?: string | null, checkOut?: string | null) => {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const formatDateInput = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addYearsToDateInput = (value: string, years: number) => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const base = new Date(Date.UTC(year + years, month - 1, day));
  if (Number.isNaN(base.getTime())) return null;
  if (base.getUTCMonth() !== month - 1) {
    const lastDay = new Date(Date.UTC(year + years, month, 0));
    return formatDateInput(lastDay);
  }
  return formatDateInput(base);
};

const formatRemainingTime = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const buildDetailLine = (label: string, value: string | null) => {
  if (!value) return null;
  return `${label}: ${value}`;
};

const ARMENIAN_ALLOWED_REGEX = /[^\u0531-\u0556\u0561-\u0587\s-]/g;
const LATIN_ALLOWED_REGEX = /[^A-Za-z\s'-]/g;
const ARMENIAN_TRANSLITERATION: Array<[string, string]> = [
  ["dzh", "ջ"],
  ["sh", "շ"],
  ["ch", "չ"],
  ["zh", "ժ"],
  ["dz", "ձ"],
  ["gh", "ղ"],
  ["ts", "ց"],
  ["ty", "թյ"],
  ["rr", "ռ"],
  ["ph", "ֆ"],
  ["kh", "խ"],
  ["th", "թ"],
  ["a", "ա"],
  ["b", "բ"],
  ["g", "գ"],
  ["d", "դ"],
  ["e", "ե"],
  ["z", "զ"],
  ["i", "ի"],
  ["l", "լ"],
  ["x", "խ"],
  ["k", "կ"],
  ["h", "հ"],
  ["j", "ջ"],
  ["m", "մ"],
  ["y", "յ"],
  ["n", "ն"],
  ["o", "ո"],
  ["p", "պ"],
  ["r", "ր"],
  ["s", "ս"],
  ["t", "տ"],
  ["u", "ու"],
  ["f", "ֆ"],
  ["v", "վ"],
  ["w", "վ"],
  ["q", "ք"],
  ["c", "ց"],
];

const sanitizeArmenianInput = (value: string) => value.replace(ARMENIAN_ALLOWED_REGEX, "");
const sanitizeLatinInput = (value: string) => value.replace(LATIN_ALLOWED_REGEX, "");

const applyArmenianCase = (value: string, source: string) => {
  if (!source) return value;
  if (source.toUpperCase() === source) return value.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
};

const transliterateLatinToArmenian = (input: string) => {
  if (!input) return "";
  let result = "";
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      result += char;
      index += 1;
      continue;
    }
    const remainder = input.slice(index).toLowerCase();
    let matched = false;
    for (const [latin, armenian] of ARMENIAN_TRANSLITERATION) {
      if (remainder.startsWith(latin)) {
        const raw = input.slice(index, index + latin.length);
        result += applyArmenianCase(armenian, raw);
        index += latin.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += char;
      index += 1;
    }
  }
  return sanitizeArmenianInput(result);
};

const normalizeNameSpacing = (value: string) => value.replace(/\s+/g, " ").trim();

const shouldSyncArmenian = (
  currentArmenian: string | null | undefined,
  currentEnglish: string | null | undefined
) => {
  const armenianValue = normalizeNameSpacing(
    sanitizeArmenianInput(currentArmenian ?? "")
  );
  if (!armenianValue) return true;
  if (!currentEnglish) return true;
  const expected = normalizeNameSpacing(transliterateLatinToArmenian(currentEnglish));
  return armenianValue === expected;
};

const resolveNonEmptyString = (
  value: string | null | undefined,
  fallback: string
) => {
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
};

const serializeInsuranceTraveler = (
  traveler: Partial<InsuranceTravelerForm> | BookingInsuranceTraveler | null | undefined
) => {
  if (!traveler) return [];
  const address = traveler.address ?? {};
  const age =
    typeof (traveler as InsuranceTravelerForm).age === "number"
      ? (traveler as InsuranceTravelerForm).age
      : null;
  const type = (traveler as InsuranceTravelerForm).type ?? null;
  return [
    traveler.id ?? null,
    traveler.firstName ?? "",
    traveler.lastName ?? "",
    traveler.firstNameEn ?? "",
    traveler.lastNameEn ?? "",
    traveler.gender ?? "",
    traveler.birthDate ?? "",
    traveler.residency ?? null,
    traveler.socialCard ?? "",
    traveler.passportNumber ?? "",
    traveler.passportAuthority ?? "",
    traveler.passportIssueDate ?? "",
    traveler.passportExpiryDate ?? "",
    traveler.phone ?? "",
    traveler.mobilePhone ?? "",
    traveler.email ?? "",
    address.full ?? "",
    address.fullEn ?? "",
    address.country ?? "",
    address.region ?? "",
    address.city ?? "",
    traveler.citizenship ?? "",
    traveler.premium ?? null,
    traveler.premiumCurrency ?? "",
    age,
    type,
  ];
};

const serializeInsuranceTravelers = (
  travelers:
    | Array<Partial<InsuranceTravelerForm> | BookingInsuranceTraveler>
    | null
    | undefined
) => JSON.stringify((travelers ?? []).map((traveler) => serializeInsuranceTraveler(traveler)));

type MealPlanLabels = {
  roomOnly: string;
  breakfast: string;
  halfBoard: string;
  fullBoard: string;
  allInclusive: string;
  ultraAllInclusive: string;
};

const localizeMealPlan = (value: string | null, labels: MealPlanLabels) => {
  if (!value) return null;
  const tokens = value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return value;
  const tokenSet = new Set(tokens);

  const has = (token: string) => tokenSet.has(token);

  if (has("uai") || has("ultraallinclusive") || (has("ultra") && has("all") && has("inclusive"))) {
    return labels.ultraAllInclusive;
  }
  if (has("ai") || has("allinclusive") || (has("all") && has("inclusive"))) {
    return labels.allInclusive;
  }
  if (has("fb") || has("fullboard") || (has("full") && has("board"))) {
    return labels.fullBoard;
  }
  if (has("hb") || has("halfboard") || (has("half") && has("board"))) {
    return labels.halfBoard;
  }
  if (has("breakfast") && has("lunch") && has("dinner")) {
    return labels.fullBoard;
  }
  if ((has("breakfast") && has("dinner")) || (has("lunch") && has("dinner"))) {
    return labels.halfBoard;
  }
  if (
    has("bb") ||
    has("bedbreakfast") ||
    has("bedandbreakfast") ||
    (has("bed") && has("breakfast")) ||
    has("breakfast")
  ) {
    return labels.breakfast;
  }
  if (has("ro") || has("roomonly") || (has("room") && has("only"))) {
    return labels.roomOnly;
  }

  return value;
};

const splitNameParts = (fullName: string | null | undefined) => {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return { first: "", last: "" };
  const [first, ...rest] = parts;
  return { first, last: rest.join(" ") };
};

const normalizeTransferType = (
  value: string | null | undefined
): AoryxTransferType | undefined => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "INDIVIDUAL" || normalized === "GROUP") return normalized;
  return undefined;
};

const buildGuestDetails = (
  rooms: AoryxRoomSearch[] | null | undefined,
  contact: { firstName: string; lastName: string },
  previous: RoomGuestForm[]
) => {
  const roomList = Array.isArray(rooms) ? rooms : [];
  if (roomList.length === 0) return [];

  return roomList.map((room, roomIndex) => {
    const roomIdentifier =
      typeof room.roomIdentifier === "number" ? room.roomIdentifier : roomIndex + 1;
    const existingRoom = previous.find((entry) => entry.roomIdentifier === roomIdentifier);
    const existingGuests = new Map(existingRoom?.guests.map((guest) => [guest.id, guest]));
    const guests: GuestForm[] = [];

    const adultCount = typeof room.adults === "number" && room.adults > 0 ? room.adults : 1;
    for (let i = 0; i < adultCount; i += 1) {
      const id = `room-${roomIdentifier}-adult-${i + 1}`;
      const existingGuest = existingGuests.get(id);
      const existingAge = existingGuest?.age;
      const defaultFirst =
        roomIndex === 0 && i === 0 ? contact.firstName.trim() : "";
      const defaultLast =
        roomIndex === 0 && i === 0 ? contact.lastName.trim() : "";
      const resolvedFirst =
        existingGuest?.firstName?.trim().length
          ? existingGuest.firstName
          : defaultFirst;
      const resolvedLast =
        existingGuest?.lastName?.trim().length ? existingGuest.lastName : defaultLast;
      guests.push({
        id,
        type: "Adult",
        age: typeof existingAge === "number" && Number.isFinite(existingAge) ? existingAge : 30,
        firstName: sanitizeLatinInput(resolvedFirst),
        lastName: sanitizeLatinInput(resolvedLast),
      });
    }

    const childAges = Array.isArray(room.childrenAges) ? room.childrenAges : [];
    childAges.forEach((age, index) => {
      const id = `room-${roomIdentifier}-child-${index + 1}`;
      const existingGuest = existingGuests.get(id);
      guests.push({
        id,
        type: "Child",
        age: typeof age === "number" ? age : 8,
        firstName: sanitizeLatinInput(existingGuest?.firstName ?? ""),
        lastName: sanitizeLatinInput(existingGuest?.lastName ?? ""),
      });
    });

    return { roomIdentifier, guests };
  });
};

export default function PackageCheckoutClient() {
  const { locale, t } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const { data: session } = useSession();
  const { rates: hotelRates } = useAmdRates();
  const baseRates = hotelRates;
  const [builderState, setBuilderState] = useState<PackageBuilderState>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("idram");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [insuranceTermsAccepted, setInsuranceTermsAccepted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [devInsuranceLoading, setDevInsuranceLoading] = useState(false);
  const [devInsuranceMessage, setDevInsuranceMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number | null>(null);
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [guestDetails, setGuestDetails] = useState<RoomGuestForm[]>([]);
  const [billing, setBilling] = useState({
    country: "",
    city: "",
    address: "",
    zip: "",
  });
  const [insuranceTravelers, setInsuranceTravelers] = useState<InsuranceTravelerForm[]>([]);
  const [insuranceQuoteLoading, setInsuranceQuoteLoading] = useState(false);
  const [insuranceQuoteError, setInsuranceQuoteError] = useState<string | null>(null);
  const insuranceQuoteKeyRef = useRef<string | null>(null);
  const insuranceQuoteCacheRef = useRef<{ key: string; result: EfesQuoteResult } | null>(null);
  const insuranceQuoteRequestIdRef = useRef(0);
  const insuranceQuoteTimerRef = useRef<number | null>(null);
  const guestNameSyncRef = useRef(new Map<string, { first: string; last: string }>());
  const insuranceSyncRef = useRef<string | null>(null);
  const [card, setCard] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
  });
  const isDevEnvironment = process.env.NODE_ENV === "development";
  const countryOptions = useMemo(
    () => (isMounted ? getCountryOptions(intlLocale) : []),
    [intlLocale, isMounted]
  );
  const citizenshipOptions = useMemo(
    () => (isMounted ? getCountryOptionsWithAlpha3(intlLocale) : []),
    [intlLocale, isMounted]
  );

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    const nameParts = splitNameParts(user.name ?? null);
    setContact((prev) => ({
      ...prev,
      firstName: sanitizeLatinInput(
        prev.firstName.trim().length > 0 ? prev.firstName : nameParts.first
      ),
      lastName: sanitizeLatinInput(
        prev.lastName.trim().length > 0 ? prev.lastName : nameParts.last
      ),
      email: prev.email.trim().length > 0 ? prev.email : user.email ?? "",
    }));
  }, [session?.user]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setBuilderState(readPackageBuilderState());
    const unsubscribe = subscribePackageBuilderState(() => {
      setBuilderState(readPackageBuilderState());
    });
    return unsubscribe;
  }, []);

  const hasHotel = builderState.hotel?.selected === true;
  const sessionExpiresAt =
    typeof builderState.sessionExpiresAt === "number" ? builderState.sessionExpiresAt : null;
  const formattedSessionRemaining =
    sessionRemainingMs !== null ? formatRemainingTime(sessionRemainingMs) : null;

  useEffect(() => {
    if (!hasHotel || !sessionExpiresAt) {
      setSessionRemainingMs(null);
      return;
    }
    const updateRemaining = () => {
      const remaining = sessionExpiresAt - Date.now();
      setSessionRemainingMs(remaining > 0 ? remaining : 0);
    };
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [hasHotel, sessionExpiresAt]);

  const hotelRooms = builderState.hotel?.rooms ?? null;
  const contactFirstName = contact.firstName;
  const contactLastName = contact.lastName;

  useEffect(() => {
    setGuestDetails((prev) =>
      buildGuestDetails(hotelRooms, { firstName: contactFirstName, lastName: contactLastName }, prev)
    );
  }, [contactFirstName, contactLastName, hotelRooms]);

  const hotel = builderState.hotel;
  const transfer = builderState.transfer;
  const excursion = builderState.excursion;
  const insuranceSelection = builderState.insurance;
  const insuranceActive =
    insuranceSelection?.selected === true && !insuranceSelection?.quoteError;
  const leadGuestId =
    guestDetails.flatMap((room) => room.guests).find((guest) => guest.type === "Adult")?.id ??
    null;
  const insuranceGuestIds = useMemo(
    () => guestDetails.flatMap((room) => room.guests.map((guest) => guest.id)),
    [guestDetails]
  );
  const selectedInsuranceGuestIds = useMemo(() => {
    if (!Array.isArray(insuranceSelection?.insuredGuestIds)) {
      return insuranceGuestIds;
    }
    const available = new Set(insuranceGuestIds);
    const filtered = insuranceSelection.insuredGuestIds.filter((id) => available.has(id));
    return filtered.length > 0 ? filtered : insuranceGuestIds;
  }, [insuranceGuestIds, insuranceSelection?.insuredGuestIds]);
  const selectedInsuranceGuestSet = useMemo(
    () => new Set(selectedInsuranceGuestIds),
    [selectedInsuranceGuestIds]
  );
  const resolveGuestSubrisks = useCallback(
    (guestId: string | null) => {
      const map = insuranceSelection?.subrisksByGuest ?? null;
      if (guestId && map && Array.isArray(map[guestId])) {
        return map[guestId];
      }
      if (Array.isArray(insuranceSelection?.subrisks)) {
        return insuranceSelection.subrisks;
      }
      return [];
    },
    [insuranceSelection?.subrisks, insuranceSelection?.subrisksByGuest]
  );
  const insuranceSubriskLabelMap = useMemo<Record<string, string>>(
    () => ({
      amateur_sport_expences: t.packageBuilder.insurance.subrisks.amateurSport.label,
      baggage_expences: t.packageBuilder.insurance.subrisks.baggage.label,
      travel_inconveniences: t.packageBuilder.insurance.subrisks.travelInconveniences.label,
      house_insurance: t.packageBuilder.insurance.subrisks.houseInsurance.label,
      trip_cancellation: t.packageBuilder.insurance.subrisks.tripCancellation.label,
    }),
    [t.packageBuilder.insurance.subrisks]
  );
  const resolveSubriskLabel = useCallback(
    (subriskId: string) => {
      const key = subriskId.toLowerCase();
      return insuranceSubriskLabelMap[key] ?? subriskId;
    },
    [insuranceSubriskLabelMap]
  );

  useEffect(() => {
    if (!insuranceActive) {
      setInsuranceTermsAccepted(false);
    }
  }, [insuranceActive]);

  useEffect(() => {
    if (insuranceSelection?.selected !== true) {
      setInsuranceTravelers([]);
      setInsuranceQuoteError(null);
      return;
    }

    setInsuranceTravelers((prev) => {
      const previousById = new Map(prev.map((traveler) => [traveler.id, traveler]));
      const storedById = new Map(
        (insuranceSelection?.travelers ?? [])
          .filter((traveler) => traveler?.id)
          .map((traveler) => [traveler.id as string, traveler])
      );
      const previousGuestNames = guestNameSyncRef.current;
      const nextGuestNames = new Map(previousGuestNames);
      const fallbackCitizenship = hotel?.nationality?.trim() || "ARM";

      const next = guestDetails.flatMap((room) =>
        room.guests
          .filter((guest) => selectedInsuranceGuestSet.has(guest.id))
          .map((guest) => {
            const existing =
              previousById.get(guest.id) ??
              storedById.get(guest.id) ??
              null;
            const address = existing?.address ?? {};
          const guestFirst = sanitizeLatinInput(guest.firstName ?? "");
          const guestLast = sanitizeLatinInput(guest.lastName ?? "");
          const previousGuest = previousGuestNames.get(guest.id) ?? null;
          const existingFirstEn = sanitizeLatinInput(existing?.firstNameEn ?? "");
          const existingLastEn = sanitizeLatinInput(existing?.lastNameEn ?? "");
          const shouldSyncFirstEn =
            !existingFirstEn ||
            !previousGuest ||
            normalizeNameSpacing(existingFirstEn) === normalizeNameSpacing(previousGuest.first);
          const shouldSyncLastEn =
            !existingLastEn ||
            !previousGuest ||
            normalizeNameSpacing(existingLastEn) === normalizeNameSpacing(previousGuest.last);
          const firstNameEn = shouldSyncFirstEn ? guestFirst : existingFirstEn;
          const lastNameEn = shouldSyncLastEn ? guestLast : existingLastEn;
          const existingFirst = resolveNonEmptyString(existing?.firstName, guest.firstName);
          const existingLast = resolveNonEmptyString(existing?.lastName, guest.lastName);
          const shouldSyncFirstAr = shouldSyncArmenian(existing?.firstName, existing?.firstNameEn);
          const shouldSyncLastAr = shouldSyncArmenian(existing?.lastName, existing?.lastNameEn);
          const firstName = shouldSyncFirstAr
            ? transliterateLatinToArmenian(firstNameEn)
            : sanitizeArmenianInput(existingFirst);
          const lastName = shouldSyncLastAr
            ? transliterateLatinToArmenian(lastNameEn)
            : sanitizeArmenianInput(existingLast);
          nextGuestNames.set(guest.id, { first: guestFirst, last: guestLast });
          return {
            id: guest.id,
            age: guest.age,
            type: guest.type,
            firstName,
            lastName,
            firstNameEn,
            lastNameEn,
            gender: existing?.gender ?? null,
            birthDate: existing?.birthDate ?? null,
            residency: existing?.residency ?? true,
            socialCard: existing?.socialCard ?? "",
            passportNumber: existing?.passportNumber ?? "",
            passportAuthority: existing?.passportAuthority ?? "",
            passportIssueDate: existing?.passportIssueDate ?? null,
            passportExpiryDate: existing?.passportExpiryDate ?? null,
            phone: existing?.phone ?? contact.phone ?? "",
            mobilePhone: existing?.mobilePhone ?? contact.phone ?? "",
            email: existing?.email ?? contact.email ?? "",
            address: {
              full: address.full ?? billing.address ?? "",
              fullEn: address.fullEn ?? billing.address ?? "",
              country: address.country ?? billing.country ?? "",
              region: address.region ?? "",
              city: address.city ?? billing.city ?? "",
            },
            citizenship: existing?.citizenship ?? fallbackCitizenship,
            premium: existing?.premium ?? null,
            premiumCurrency: existing?.premiumCurrency ?? null,
          };
        })
      );
      guestNameSyncRef.current = nextGuestNames;
      if (serializeInsuranceTravelers(prev) === serializeInsuranceTravelers(next)) {
        return prev;
      }
      return next;
    });
  }, [
    billing.address,
    billing.city,
    billing.country,
    contact.email,
    contact.phone,
    guestDetails,
    hotel?.nationality,
    selectedInsuranceGuestIds,
    insuranceSelection?.selected,
    insuranceSelection?.travelers,
    selectedInsuranceGuestSet,
  ]);

  const buildRoomsPayload = () => {
    const hotelSelection = builderState.hotel;
    if (!hotelSelection?.selected) {
      throw new Error(t.packageBuilder.checkout.errors.missingHotel);
    }

    const hotelCode = hotelSelection.hotelCode?.trim() ?? "";
    const destinationCode = hotelSelection.destinationCode?.trim() ?? "";
    if (!hotelCode || !destinationCode) {
      throw new Error(t.packageBuilder.checkout.errors.missingDetails);
    }

    const roomsSearch = Array.isArray(hotelSelection.rooms) ? hotelSelection.rooms : [];
    const selectionRooms = Array.isArray(hotelSelection.roomSelections)
      ? hotelSelection.roomSelections
      : null;
    const fallbackRateKeys =
      typeof hotelSelection.selectionKey === "string"
        ? hotelSelection.selectionKey.split("|").filter(Boolean)
        : [];

    const roomsSource =
      selectionRooms && selectionRooms.length > 0
        ? selectionRooms
        : fallbackRateKeys.map((rateKey, index) => {
            const roomIdentifier =
              typeof roomsSearch[index]?.roomIdentifier === "number"
                ? roomsSearch[index].roomIdentifier
                : index + 1;
            return {
              roomIdentifier,
              rateKey,
              price: { gross: null, net: null, tax: null },
            };
          });

    if (roomsSource.length === 0) {
      throw new Error(t.packageBuilder.checkout.errors.missingDetails);
    }

    const perRoomFallback =
      typeof hotelSelection.price === "number" &&
      Number.isFinite(hotelSelection.price) &&
      hotelSelection.price > 0
        ? hotelSelection.price / roomsSource.length
        : null;

    const guestDetailsByRoom = new Map(
      guestDetails.map((room) => [room.roomIdentifier, room.guests])
    );
    let leadAssigned = false;
    return roomsSource.map((room, index) => {
      const searchRoom = roomsSearch[index];
      const roomIdentifier =
        typeof room.roomIdentifier === "number"
          ? room.roomIdentifier
          : typeof searchRoom?.roomIdentifier === "number"
            ? searchRoom.roomIdentifier
            : index + 1;
      const rateKey = room.rateKey?.trim() ?? "";
      if (!rateKey) {
        throw new Error(t.packageBuilder.checkout.errors.missingDetails);
      }

      const gross =
        typeof room.price?.gross === "number" && Number.isFinite(room.price.gross)
          ? room.price.gross
          : perRoomFallback;
      const net =
        typeof room.price?.net === "number" && Number.isFinite(room.price.net)
          ? room.price.net
          : perRoomFallback;
      const tax =
        typeof room.price?.tax === "number" && Number.isFinite(room.price.tax)
          ? room.price.tax
          : 0;

      if (!Number.isFinite(gross) || !Number.isFinite(net)) {
        throw new Error(t.packageBuilder.checkout.errors.missingDetails);
      }

      const guests: AoryxBookingPayload["rooms"][number]["guests"] = [];
      const roomGuests = guestDetailsByRoom.get(roomIdentifier);
      if (!roomGuests || roomGuests.length === 0) {
        throw new Error(t.packageBuilder.checkout.errors.missingGuestDetails);
      }

      let guestError = false;
      let adults = 0;
      const childrenAges: number[] = [];
      roomGuests.forEach((guest) => {
        const firstName = guest.firstName.trim();
        const lastName = guest.lastName.trim();
        const age = Number.isFinite(guest.age) ? guest.age : Number.NaN;
        if (!firstName || !lastName || !Number.isFinite(age)) {
          guestError = true;
          return;
        }
        if (guest.type === "Adult") {
          adults += 1;
        } else {
          childrenAges.push(age);
        }
        const isLeadGuest = !leadAssigned && guest.type === "Adult";
        if (isLeadGuest) leadAssigned = true;
        guests.push({
          firstName,
          lastName,
          type: guest.type,
          age,
          ...(isLeadGuest ? { isLeadGuest: true } : {}),
        });
      });

      if (guestError || guests.length === 0) {
        throw new Error(t.packageBuilder.checkout.errors.missingGuestDetails);
      }

      if (adults === 0) {
        throw new Error(t.packageBuilder.checkout.errors.missingGuestDetails);
      }

      return {
        roomIdentifier,
        adults,
        childrenAges,
        rateKey,
        guests,
        price: {
          gross,
          net,
          tax,
        },
      };
    });
  };

  const updateGuestDetails = (
    roomIdentifier: number,
    guestId: string,
    updates: Partial<GuestForm>
  ) => {
    const nextUpdates: Partial<GuestForm> = { ...updates };
    if (typeof updates.firstName === "string") {
      nextUpdates.firstName = sanitizeLatinInput(updates.firstName);
    }
    if (typeof updates.lastName === "string") {
      nextUpdates.lastName = sanitizeLatinInput(updates.lastName);
    }
    setGuestDetails((prev) =>
      prev.map((room) =>
        room.roomIdentifier === roomIdentifier
          ? {
              ...room,
              guests: room.guests.map((guest) =>
                guest.id === guestId ? { ...guest, ...nextUpdates } : guest
              ),
            }
          : room
      )
    );
  };

  const normalizeOptional = (value: string | null | undefined) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const buildInsuranceQuotePayload = useCallback((): EfesQuoteRequest | null => {
    if (!insuranceActive) return null;
    const startDate = insuranceSelection.startDate ?? hotel?.checkInDate ?? null;
    const endDate = insuranceSelection.endDate ?? hotel?.checkOutDate ?? null;
    if (!startDate || !endDate) return null;
    const territoryCode = normalizeOptional(insuranceSelection.territoryCode) ?? "";
    const riskAmount = insuranceSelection.riskAmount ?? null;
    const riskCurrency = normalizeOptional(insuranceSelection.riskCurrency) ?? "";
    if (!territoryCode || !riskAmount || !riskCurrency) return null;
    if (insuranceTravelers.length === 0) return null;

    const travelers = insuranceTravelers
      .map((traveler) => {
        if (!Number.isFinite(traveler.age)) return null;
        return {
          id: traveler.id,
          age: traveler.age,
          subrisks: resolveGuestSubrisks(traveler.id),
        };
      })
      .filter((traveler): traveler is NonNullable<typeof traveler> => Boolean(traveler));

    if (travelers.length !== insuranceTravelers.length) return null;

    return {
      startDate,
      endDate,
      territoryCode,
      riskAmount,
      riskCurrency,
      riskLabel: insuranceSelection.riskLabel ?? undefined,
      days: calculateTripDays(startDate, endDate) ?? insuranceSelection.days ?? undefined,
      subrisks: insuranceSelection.subrisks ?? undefined,
      travelers,
    };
  }, [
    insuranceActive,
    insuranceSelection?.days,
    insuranceSelection?.riskAmount,
    insuranceSelection?.riskCurrency,
    insuranceSelection?.riskLabel,
    insuranceSelection?.startDate,
    insuranceSelection?.endDate,
    insuranceSelection?.subrisks,
    resolveGuestSubrisks,
    insuranceSelection?.territoryCode,
    hotel?.checkInDate,
    hotel?.checkOutDate,
    insuranceTravelers,
  ]);

  const insuranceQuoteRequest = useMemo(() => {
    const payload = buildInsuranceQuotePayload();
    if (!payload) return null;
    return { key: JSON.stringify(payload), payload };
  }, [buildInsuranceQuotePayload]);

  const applyInsuranceQuote = useCallback(
    (quote: EfesQuoteResult) => {
      const premiumMap = new Map(
        quote.premiums.map((entry) => [entry.travelerId, entry.premium])
      );
      const updated = insuranceTravelers.map((traveler, index) => {
        const premium =
          premiumMap.get(traveler.id) ?? quote.premiums[index]?.premium ?? traveler.premium ?? null;
        return {
          ...traveler,
          premium,
          premiumCurrency: quote.currency,
        };
      });
      const quotePremiumsByGuest = updated.reduce<Record<string, number>>((acc, traveler) => {
        if (
          traveler.id &&
          typeof traveler.premium === "number" &&
          Number.isFinite(traveler.premium)
        ) {
          acc[traveler.id] = traveler.premium;
        }
        return acc;
      }, {});
      const normalizedQuotePremiumsByGuest =
        Object.keys(quotePremiumsByGuest).length > 0 ? quotePremiumsByGuest : null;
      setInsuranceTravelers(updated);
      updatePackageBuilderState((state) => {
        if (!state.insurance?.selected) return state;
        const startDate = state.insurance.startDate ?? hotel?.checkInDate ?? null;
        const endDate = state.insurance.endDate ?? hotel?.checkOutDate ?? null;
        return {
          ...state,
          insurance: {
            ...state.insurance,
            price: quote.totalPremium,
            currency: quote.currency,
            quoteSum: typeof quote.sum === "number" ? quote.sum : null,
            quoteDiscountedSum:
              typeof quote.discountedSum === "number" ? quote.discountedSum : null,
            quoteSumByGuest: quote.sumByTraveler ?? null,
            quoteDiscountedSumByGuest: quote.discountedSumByTraveler ?? null,
            quotePriceCoverages: quote.priceCoverages ?? null,
            quoteDiscountedPriceCoverages: quote.discountedPriceCoverages ?? null,
            quotePriceCoveragesByGuest: quote.priceCoveragesByTraveler ?? null,
            quoteDiscountedPriceCoveragesByGuest:
              quote.discountedPriceCoveragesByTraveler ?? null,
            quotePremiumsByGuest: normalizedQuotePremiumsByGuest,
            quoteError: null,
            travelers: updated,
            startDate,
            endDate,
            days: calculateTripDays(startDate ?? null, endDate ?? null) ?? null,
          },
          updatedAt: Date.now(),
        };
      });
      return updated;
    },
    [hotel?.checkInDate, hotel?.checkOutDate, insuranceTravelers]
  );

  const runInsuranceQuote = useCallback(
    async (
      request: { key: string; payload: EfesQuoteRequest },
      options?: { useCache?: boolean; setPaymentError?: boolean }
    ) => {
      if (options?.useCache && insuranceQuoteCacheRef.current?.key === request.key) {
        insuranceQuoteKeyRef.current = request.key;
        setInsuranceQuoteError(null);
        return insuranceQuoteCacheRef.current.result;
      }

      const requestId = (insuranceQuoteRequestIdRef.current += 1);
      insuranceQuoteKeyRef.current = request.key;
      setInsuranceQuoteLoading(true);
      setInsuranceQuoteError(null);
      try {
        const quote = await postJson<EfesQuoteResult>(
          "/api/insurance/efes/quote",
          request.payload
        );
        if (requestId !== insuranceQuoteRequestIdRef.current) return null;
        insuranceQuoteCacheRef.current = { key: request.key, result: quote };
        return quote;
      } catch (error) {
        if (requestId !== insuranceQuoteRequestIdRef.current) return null;
        const message =
          error instanceof Error
            ? error.message
            : t.packageBuilder.checkout.errors.insuranceQuoteFailed;
        const mappedMessage = mapEfesErrorMessage(
          message,
          t.packageBuilder.insurance.errors
        );
        setInsuranceQuoteError(mappedMessage);
        updatePackageBuilderState((state) => {
          if (!state.insurance?.selected) return state;
          return {
            ...state,
            insurance: {
              ...state.insurance,
              price: null,
              currency: null,
              quoteSum: null,
              quoteDiscountedSum: null,
              quoteSumByGuest: null,
              quoteDiscountedSumByGuest: null,
              quotePriceCoverages: null,
              quoteDiscountedPriceCoverages: null,
              quotePriceCoveragesByGuest: null,
              quoteDiscountedPriceCoveragesByGuest: null,
              quotePremiumsByGuest: null,
              quoteError: mappedMessage,
            },
            updatedAt: Date.now(),
          };
        });
        if (options?.setPaymentError) {
          setPaymentError(mappedMessage);
        }
        return null;
      } finally {
        if (requestId === insuranceQuoteRequestIdRef.current) {
          setInsuranceQuoteLoading(false);
        }
      }
    },
    [t.packageBuilder.checkout.errors.insuranceQuoteFailed, t.packageBuilder.insurance.errors]
  );

  useEffect(() => {
    if (!insuranceSelection?.selected) {
      setInsuranceQuoteError(null);
      setInsuranceQuoteLoading(false);
      insuranceQuoteKeyRef.current = null;
      if (insuranceQuoteTimerRef.current !== null) {
        window.clearTimeout(insuranceQuoteTimerRef.current);
        insuranceQuoteTimerRef.current = null;
      }
      return;
    }
    if (!insuranceQuoteRequest) return;
    if (insuranceQuoteRequest.key === insuranceQuoteKeyRef.current) return;
    if (insuranceQuoteTimerRef.current !== null) {
      window.clearTimeout(insuranceQuoteTimerRef.current);
    }
    insuranceQuoteTimerRef.current = window.setTimeout(async () => {
      const quote = await runInsuranceQuote(insuranceQuoteRequest, { useCache: true });
      if (quote) {
        applyInsuranceQuote(quote);
      }
    }, 400);
    return () => {
      if (insuranceQuoteTimerRef.current !== null) {
        window.clearTimeout(insuranceQuoteTimerRef.current);
        insuranceQuoteTimerRef.current = null;
      }
    };
  }, [applyInsuranceQuote, insuranceQuoteRequest, insuranceSelection?.selected, runInsuranceQuote]);

  const buildInsuranceTravelersPayload = (travelers: InsuranceTravelerForm[]) =>
    travelers.map((traveler) => ({
      id: traveler.id,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      firstNameEn: normalizeOptional(traveler.firstNameEn) ?? traveler.firstName,
      lastNameEn: normalizeOptional(traveler.lastNameEn) ?? traveler.lastName,
      gender: traveler.gender ?? null,
      birthDate: normalizeOptional(traveler.birthDate),
      residency: traveler.residency ?? null,
      socialCard: normalizeOptional(traveler.socialCard),
      passportNumber: normalizeOptional(traveler.passportNumber),
      passportAuthority: normalizeOptional(traveler.passportAuthority),
      passportIssueDate: normalizeOptional(traveler.passportIssueDate),
      passportExpiryDate: normalizeOptional(traveler.passportExpiryDate),
      phone: normalizeOptional(traveler.phone),
      mobilePhone: normalizeOptional(traveler.mobilePhone),
      email: normalizeOptional(traveler.email),
      address: {
        full: normalizeOptional(traveler.address?.full),
        fullEn: normalizeOptional(traveler.address?.fullEn),
        country: normalizeOptional(traveler.address?.country),
        region: normalizeOptional(traveler.address?.region),
        city: normalizeOptional(traveler.address?.city),
      },
      citizenship: normalizeOptional(traveler.citizenship),
      premium: traveler.premium ?? null,
      premiumCurrency: normalizeOptional(traveler.premiumCurrency),
      subrisks: resolveGuestSubrisks(traveler.id),
    }));

  const updateInsuranceTraveler = (
    travelerId: string,
    updates: Partial<InsuranceTravelerForm>
  ) => {
    setInsuranceQuoteError(null);
    setInsuranceTravelers((prev) =>
      prev.map((traveler) =>
        traveler.id === travelerId ? { ...traveler, ...updates } : traveler
      )
    );
  };

  const insuranceTravelersKey = useMemo(
    () => serializeInsuranceTravelers(insuranceTravelers),
    [insuranceTravelers]
  );
  const storedInsuranceTravelersKey = useMemo(
    () => serializeInsuranceTravelers(insuranceSelection?.travelers ?? []),
    [insuranceSelection?.travelers]
  );

  useEffect(() => {
    if (!insuranceSelection?.selected) return;
    if (insuranceTravelersKey === storedInsuranceTravelersKey) return;
    if (insuranceSyncRef.current === insuranceTravelersKey) return;
    insuranceSyncRef.current = insuranceTravelersKey;
    updatePackageBuilderState((state) => {
      if (!state.insurance?.selected) return state;
      return {
        ...state,
        insurance: {
          ...state.insurance,
          travelers: insuranceTravelers,
        },
        updatedAt: Date.now(),
      };
    });
  }, [
    insuranceSelection?.selected,
    insuranceTravelers,
    insuranceTravelersKey,
    storedInsuranceTravelersKey,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPay || paymentLoading) return;
    setPaymentError(null);
    setInsuranceQuoteError(null);
    setDevInsuranceMessage(null);
    if (!guestDetailsValid) {
      setPaymentError(t.packageBuilder.checkout.errors.missingGuestDetails);
      return;
    }

    if (insuranceActive && !insuranceDetailsValid) {
      setPaymentError(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
      return;
    }

    if (paymentMethod !== "idram") {
      setPaymentError(t.packageBuilder.checkout.errors.cardUnavailable);
      return;
    }

    let insuranceTravelersPayload: BookingInsuranceTraveler[] | null = null;
    let insuranceQuote: EfesQuoteResult | null = null;
    if (insuranceActive) {
      const quoteRequest = insuranceQuoteRequest;
      if (!quoteRequest) {
        setPaymentError(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
        return;
      }
      insuranceQuote = await runInsuranceQuote(quoteRequest, {
        useCache: true,
        setPaymentError: true,
      });
      if (!insuranceQuote) return;
      const updatedTravelers = applyInsuranceQuote(insuranceQuote);
      insuranceTravelersPayload = buildInsuranceTravelersPayload(updatedTravelers);
    }

    let payload: BookingPayloadInput;
    try {
      const hotelSelection = builderState.hotel;
      if (!hotelSelection?.selected) {
        throw new Error(t.packageBuilder.checkout.errors.missingHotel);
      }
      const hotelCode = hotelSelection.hotelCode?.trim() ?? "";
      const destinationCode = hotelSelection.destinationCode?.trim() ?? "";
      if (!hotelCode || !destinationCode) {
        throw new Error(t.packageBuilder.checkout.errors.missingDetails);
      }
      const insuranceStartDate =
        builderState.insurance?.startDate ?? hotelSelection.checkInDate ?? null;
      const insuranceEndDate =
        builderState.insurance?.endDate ?? hotelSelection.checkOutDate ?? null;

      payload = {
        hotelCode,
        hotelName: hotelSelection.hotelName ?? null,
        checkInDate: hotelSelection.checkInDate ?? null,
        checkOutDate: hotelSelection.checkOutDate ?? null,
        destinationCode,
        countryCode: hotelSelection.countryCode ?? "AE",
        currency: hotelSelection.currency ?? "USD",
        nationality: hotelSelection.nationality ?? "AM",
        customerRefNumber: `MEGA-${Date.now()}`,
        rooms: buildRoomsPayload(),
        transferSelection:
          builderState.transfer?.selected
            ? (() => {
                const transferSelection = builderState.transfer;
                if (!transferSelection) return undefined;
                const origin =
                  transferSelection.origin ??
                  (transferSelection.transferOrigin
                    ? { name: transferSelection.transferOrigin }
                    : undefined);
                const destination =
                  transferSelection.destination ??
                  (transferSelection.transferDestination
                    ? { name: transferSelection.transferDestination }
                    : undefined);
                const vehicle =
                  transferSelection.vehicle ??
                  (transferSelection.vehicleName
                    ? {
                        name: transferSelection.vehicleName,
                        maxPax: transferSelection.vehicleMaxPax ?? undefined,
                      }
                    : undefined);
                const pricingSource = transferSelection.pricing ?? null;
                const pricing = pricingSource
                  ? {
                      currency: pricingSource.currency ?? transferSelection.currency ?? undefined,
                      chargeType:
                        pricingSource.chargeType ?? transferSelection.chargeType ?? undefined,
                      oneWay:
                        typeof pricingSource.oneWay === "number"
                          ? pricingSource.oneWay
                          : undefined,
                      return:
                        typeof pricingSource.return === "number"
                          ? pricingSource.return
                          : undefined,
                    }
                  : {
                      currency: transferSelection.currency ?? undefined,
                      chargeType: transferSelection.chargeType ?? undefined,
                      ...(transferSelection.includeReturn
                        ? {
                            return:
                              typeof transferSelection.price === "number"
                                ? transferSelection.price
                                : undefined,
                          }
                        : {
                            oneWay:
                              typeof transferSelection.price === "number"
                                ? transferSelection.price
                                : undefined,
                          }),
                    };
                return {
                  id: transferSelection.selectionId ?? "transfer",
                  includeReturn: transferSelection.includeReturn ?? undefined,
                  transferType: normalizeTransferType(transferSelection.transferType ?? null),
                  origin,
                  destination,
                  vehicle,
                  paxRange: transferSelection.paxRange ?? undefined,
                  pricing,
                  validity: transferSelection.validity ?? undefined,
                  quantity:
                    typeof transferSelection.vehicleQuantity === "number"
                      ? transferSelection.vehicleQuantity
                      : undefined,
                  paxCount:
                    typeof transferSelection.paxCount === "number"
                      ? transferSelection.paxCount
                      : undefined,
                  totalPrice: transferSelection.price ?? null,
                };
              })()
            : undefined,
        excursions:
          builderState.excursion?.selected
            ? (() => {
                const excursionSelection = builderState.excursion;
                if (!excursionSelection) return undefined;
                const detailedSelections = Array.isArray(
                  excursionSelection.selectionsDetailed
                )
                  ? excursionSelection.selectionsDetailed ?? []
                  : [];
                const selectionCurrency = excursionSelection.currency ?? undefined;
                const fallbackSelections = (excursionSelection.items ?? [])
                  .filter((item) => item?.id)
                  .map((item) => ({
                    id: item.id,
                    name: item.name ?? undefined,
                    currency: selectionCurrency,
                    totalPrice: null,
                  }));
                const selections =
                  detailedSelections.length > 0
                    ? detailedSelections
                    : fallbackSelections.length > 0
                    ? fallbackSelections
                    : [
                        {
                            id: excursionSelection.selectionId ?? "excursion",
                            currency: selectionCurrency,
                            totalPrice: excursionSelection.price ?? null,
                          },
                        ];
                return {
                  totalAmount:
                    typeof excursionSelection.price === "number"
                      ? excursionSelection.price
                      : 0,
                  selections,
                };
              })()
            : undefined,
        insurance:
          insuranceActive && insuranceSelection
            ? {
                planId: insuranceSelection.planId ?? insuranceSelection.selectionId ?? "insurance",
                planName: insuranceSelection.planLabel ?? insuranceSelection.label ?? null,
                planLabel: insuranceSelection.planLabel ?? insuranceSelection.label ?? null,
                price: insuranceQuote?.totalPremium ?? insuranceSelection.price ?? null,
                currency: insuranceQuote?.currency ?? insuranceSelection.currency ?? null,
                provider: "efes",
                riskAmount: insuranceSelection.riskAmount ?? null,
                riskCurrency: insuranceSelection.riskCurrency ?? null,
                riskLabel: insuranceSelection.riskLabel ?? null,
                territoryCode: insuranceSelection.territoryCode ?? null,
                territoryLabel: insuranceSelection.territoryLabel ?? null,
                territoryPolicyLabel: insuranceSelection.territoryPolicyLabel ?? null,
                travelCountries: insuranceSelection.travelCountries ?? null,
                startDate: insuranceStartDate,
                endDate: insuranceEndDate,
                days: calculateTripDays(insuranceStartDate, insuranceEndDate),
                subrisks: insuranceSelection.subrisks ?? null,
                travelers: insuranceTravelersPayload ?? buildInsuranceTravelersPayload(insuranceTravelers),
              }
            : undefined,
        airTickets:
          builderState.flight?.selected
            ? {
                origin: builderState.flight.origin ?? null,
                destination: builderState.flight.destination ?? null,
                departureDate: builderState.flight.departureDate ?? null,
                returnDate: builderState.flight.returnDate ?? null,
                cabinClass: builderState.flight.cabinClass ?? null,
                notes: builderState.flight.notes ?? null,
                price: builderState.flight.price ?? null,
                currency: builderState.flight.currency ?? null,
              }
            : undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.packageBuilder.checkout.errors.paymentFailed;
      setPaymentError(message);
      return;
    }

    setPaymentLoading(true);
    try {
      const requestPayload = { ...payload, locale };
      const checkout = await postJson<IdramCheckoutResponse>(
        "/api/payments/idram/checkout",
        requestPayload
      );
      if (typeof document === "undefined") {
        throw new Error(t.packageBuilder.checkout.errors.paymentFailed);
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = checkout.action;
      Object.entries(checkout.fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.packageBuilder.checkout.errors.paymentFailed;
      setPaymentError(message);
      setPaymentLoading(false);
    }
  };

  const handleDevInsuranceSubmit = async () => {
    if (!isDevEnvironment || devInsuranceLoading) return;
    if (!insuranceActive || !insuranceSelection) return;
    setPaymentError(null);
    setInsuranceQuoteError(null);
    setDevInsuranceMessage(null);
    if (!insuranceDetailsValid) {
      setDevInsuranceMessage(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
      return;
    }

    const quoteRequest = insuranceQuoteRequest;
    if (!quoteRequest) {
      setDevInsuranceMessage(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
      return;
    }

    setDevInsuranceLoading(true);
    try {
      const insuranceQuote = await runInsuranceQuote(quoteRequest, { useCache: true });
      if (!insuranceQuote) {
        setDevInsuranceMessage(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
        return;
      }
      const updatedTravelers = applyInsuranceQuote(insuranceQuote);
      const insuranceTravelersPayload = buildInsuranceTravelersPayload(updatedTravelers);
      const insuranceStartDate =
        insuranceSelection.startDate ?? hotel?.checkInDate ?? null;
      const insuranceEndDate =
        insuranceSelection.endDate ?? hotel?.checkOutDate ?? null;
      const payload = {
        insurance: {
          planId: insuranceSelection.planId ?? insuranceSelection.selectionId ?? "insurance",
          planName: insuranceSelection.planLabel ?? insuranceSelection.label ?? null,
          planLabel: insuranceSelection.planLabel ?? insuranceSelection.label ?? null,
          price: insuranceQuote.totalPremium ?? insuranceSelection.price ?? null,
          currency: insuranceQuote.currency ?? insuranceSelection.currency ?? null,
          provider: "efes" as const,
          riskAmount: insuranceSelection.riskAmount ?? null,
          riskCurrency: insuranceSelection.riskCurrency ?? null,
          riskLabel: insuranceSelection.riskLabel ?? null,
          territoryCode: insuranceSelection.territoryCode ?? null,
          territoryLabel: insuranceSelection.territoryLabel ?? null,
          territoryPolicyLabel: insuranceSelection.territoryPolicyLabel ?? null,
          travelCountries: insuranceSelection.travelCountries ?? null,
          startDate: insuranceStartDate,
          endDate: insuranceEndDate,
          days: calculateTripDays(insuranceStartDate, insuranceEndDate),
          subrisks: insuranceSelection.subrisks ?? null,
          travelers: insuranceTravelersPayload,
        },
        checkInDate: insuranceStartDate,
        checkOutDate: insuranceEndDate,
      };
      const response = await postJson<{ policies?: unknown[] }>(
        "/api/insurance/efes/dev-submit",
        payload
      );
      console.log("[EFES][dev-submit] response", response);
      setDevInsuranceMessage(t.packageBuilder.checkout.devInsuranceSuccess);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.packageBuilder.checkout.errors.paymentFailed;
      console.error("[EFES][dev-submit] error", error);
      setDevInsuranceMessage(message);
    } finally {
      setDevInsuranceLoading(false);
    }
  };

  const formatServicePrice = (
    amount: number | null | undefined,
    currency: string | null | undefined,
    rates: typeof baseRates
  ) => {
    const normalized = normalizeAmount(amount ?? null, currency ?? null, rates);
    return normalized
      ? formatCurrencyAmount(normalized.amount, normalized.currency, intlLocale)
      : null;
  };

  const serviceIconMap: Record<PackageBuilderService, string> = {
    hotel: "hotel",
    flight: "flight",
    transfer: "directions_car",
    excursion: "tour",
    insurance: "shield_with_heart",
  };

  const serviceCards = (() => {
    const cards: {
      id: PackageBuilderService;
      label: string;
      selected: boolean;
      icon: string;
      count?: number;
      details: string[];
    }[] = [];

    const hotelDetails: string[] = [];
    const hotelLabel = hotel?.hotelName ?? null;
    if (hotelLabel) hotelDetails.push(hotelLabel);
    const hotelCodeLine = buildDetailLine(
      t.packageBuilder.checkout.labels.hotelCode,
      hotel?.hotelCode ?? null
    );
    if (hotelCodeLine) hotelDetails.push(hotelCodeLine);
    const destinationLine = buildDetailLine(
      t.packageBuilder.checkout.labels.destination,
      hotel?.destinationName ?? null
    );
    if (destinationLine) hotelDetails.push(destinationLine);
    const dateRange = formatDateRange(hotel?.checkInDate, hotel?.checkOutDate, intlLocale);
    const dateLine = buildDetailLine(t.packageBuilder.checkout.labels.dates, dateRange);
    if (dateLine) hotelDetails.push(dateLine);
    const roomLine = buildDetailLine(
      t.packageBuilder.checkout.labels.rooms,
      typeof hotel?.roomCount === "number" ? hotel.roomCount.toString() : null
    );
    if (roomLine) hotelDetails.push(roomLine);
    const mealPlanLabel = localizeMealPlan(hotel?.mealPlan ?? null, t.hotel.roomOptions.mealPlans);
    const mealPlanLine = buildDetailLine(t.hotel.booking.mealPlanLabel, mealPlanLabel);
    if (mealPlanLine) hotelDetails.push(mealPlanLine);
    const guestLine = buildDetailLine(
      t.packageBuilder.checkout.labels.guests,
      typeof hotel?.guestCount === "number" ? hotel.guestCount.toString() : null
    );
    if (guestLine) hotelDetails.push(guestLine);

    cards.push({
      id: "hotel",
      label: t.packageBuilder.services.hotel,
      selected: hotel?.selected === true,
      icon: serviceIconMap.hotel,
      details: hotelDetails.length > 0 ? hotelDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const transferDetails: string[] = [];
    const routeConnector = transfer?.includeReturn ? " <-> " : " -> ";
    const route = [transfer?.transferOrigin, transfer?.transferDestination]
      .filter(Boolean)
      .join(routeConnector);
    const routeLine = buildDetailLine(t.packageBuilder.checkout.labels.route, route || null);
    if (routeLine) transferDetails.push(routeLine);
    const includeReturnLine = buildDetailLine(
      t.hotel.addons.transfers.includeReturn,
      transfer?.includeReturn ? t.common.yes : t.common.no
    );
    if (includeReturnLine) transferDetails.push(includeReturnLine);
    const vehicleName = transfer?.vehicleName?.trim() ?? null;
    const vehicleQty =
      typeof transfer?.vehicleQuantity === "number" ? transfer.vehicleQuantity : null;
    const transferType = normalizeTransferType(transfer?.transferType ?? null);
    const transferMaxPax =
      typeof transfer?.vehicleMaxPax === "number" && Number.isFinite(transfer.vehicleMaxPax)
        ? transfer.vehicleMaxPax
        : null;
    const baseIndividualLabel = t.packageBuilder.transfers.individual;
    const individualLabel = transferMaxPax
      ? /\d+/.test(baseIndividualLabel)
        ? baseIndividualLabel.replace(/\d+/, transferMaxPax.toString())
        : baseIndividualLabel
      : baseIndividualLabel.replace(/\s*\([^)]*\d+[^)]*\)/, "").trim();
    const vehicleLabel =
      transferType === "GROUP"
        ? null
        : vehicleName && transferType === "INDIVIDUAL" && vehicleQty && vehicleQty > 1
          ? `${vehicleName} x ${vehicleQty}`
          : vehicleName;
    const vehicleLine = buildDetailLine(
      t.packageBuilder.checkout.labels.vehicle,
      vehicleLabel
    );
    if (vehicleLine) transferDetails.push(vehicleLine);
    const transferTypeLabel =
      transferType === "GROUP"
        ? t.packageBuilder.transfers.group
        : transferType === "INDIVIDUAL"
          ? individualLabel
          : null;
    const typeLine = buildDetailLine(
      t.packageBuilder.checkout.labels.type,
      transferTypeLabel
    );
    if (typeLine) transferDetails.push(typeLine);

    cards.push({
      id: "transfer",
      label: t.packageBuilder.services.transfer,
      selected: transfer?.selected === true,
      icon: serviceIconMap.transfer,
      details: transferDetails.length > 0 ? transferDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const excursionDetails: string[] = [];
    const excursionSelections = excursion?.selections ?? {};
    const excursionSelectionIds = Object.values(excursionSelections)
      .flatMap((ids) => (Array.isArray(ids) ? ids : []))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const excursionItems = (excursion?.items ?? []).filter((item) => item?.id);
    const excursionNameLookup = new Map(
      excursionItems.map((item) => [
        item.id,
        item.name?.trim() || t.hotel.addons.excursions.unnamed,
      ])
    );
    if (excursionSelectionIds.length > 0) {
      const counts = new Map<string, number>();
      const orderedIds: string[] = [];
      excursionSelectionIds.forEach((id) => {
        if (!counts.has(id)) {
          orderedIds.push(id);
        }
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      orderedIds.forEach((id) => {
        const name = excursionNameLookup.get(id) ?? t.hotel.addons.excursions.unnamed;
        const count = counts.get(id) ?? 0;
        if (name) {
          excursionDetails.push(count > 1 ? `${name} x${count}` : name);
        }
      });
    } else {
      excursionItems
        .map((item) => item.name?.trim() || t.hotel.addons.excursions.unnamed)
        .forEach((name) => {
          if (name) excursionDetails.push(name);
        });
    }
    const excursionCount =
      excursionSelectionIds.length > 0 ? excursionSelectionIds.length : excursionItems.length;

    cards.push({
      id: "excursion",
      label: t.packageBuilder.services.excursion,
      selected: excursion?.selected === true,
      icon: serviceIconMap.excursion,
      count: excursionCount > 0 ? excursionCount : undefined,
      details: excursionDetails.length > 0 ? excursionDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const flight = builderState.flight;
    const flightDetails: string[] = [];
    const flightRoute = [flight?.origin, flight?.destination].filter(Boolean).join(" -> ");
    const flightRouteLine = buildDetailLine(
      t.packageBuilder.checkout.labels.route,
      flightRoute || null
    );
    if (flightRouteLine) flightDetails.push(flightRouteLine);
    const flightDates = [flight?.departureDate, flight?.returnDate].filter(Boolean).join(" / ");
    const flightDatesLine = buildDetailLine(
      t.packageBuilder.checkout.labels.dates,
      flightDates || null
    );
    if (flightDatesLine) flightDetails.push(flightDatesLine);
    const cabinClass = flight?.cabinClass?.trim().toLowerCase();
    const cabinLabel =
      cabinClass === "economy"
        ? t.hotel.addons.flights.cabin.economy
        : cabinClass === "premium"
          ? t.hotel.addons.flights.cabin.premium
          : cabinClass === "business"
            ? t.hotel.addons.flights.cabin.business
            : cabinClass === "first"
              ? t.hotel.addons.flights.cabin.first
              : flight?.cabinClass ?? null;
    const cabinLine = buildDetailLine(t.hotel.addons.flights.cabinLabel, cabinLabel);
    if (cabinLine) flightDetails.push(cabinLine);

    cards.push({
      id: "flight",
      label: t.packageBuilder.services.flight,
      selected: flight?.selected === true,
      icon: serviceIconMap.flight,
      details: flightDetails.length > 0 ? flightDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const insuranceSelection = builderState.insurance;
    const insuranceDetails: string[] = [];
    const insurancePlanMap = t.packageBuilder.insurance.plans as Record<
      string,
      { title?: string }
    >;
    const insurancePlanLabel =
      (insuranceSelection?.planId
        ? insurancePlanMap[insuranceSelection.planId]?.title
        : null) ??
      insuranceSelection?.planLabel ??
      insuranceSelection?.label ??
      null;
    if (insurancePlanLabel) insuranceDetails.push(insurancePlanLabel);
    const insuranceTerritoryLabel =
      insuranceSelection?.territoryCode === "whole_world_exc_uk_sch_us_ca_au_jp"
        ? t.packageBuilder.insurance.territories.worldwideExcluding
        : insuranceSelection?.territoryLabel ?? null;
    const insuranceTerritory = buildDetailLine(
      t.packageBuilder.insurance.territoryLabel,
      insuranceTerritoryLabel
    );
    if (insuranceTerritory) insuranceDetails.push(insuranceTerritory);
    const insuranceCountriesLabel =
      insuranceSelection?.provider === "efes"
        ? t.packageBuilder.insurance.defaultTravelCountry ??
          insuranceSelection?.travelCountries ??
          null
        : insuranceSelection?.travelCountries ?? null;
    const insuranceCountries = buildDetailLine(
      t.packageBuilder.insurance.travelCountriesLabel,
      insuranceCountriesLabel
    );
    if (insuranceCountries) insuranceDetails.push(insuranceCountries);
    if (insuranceSelection?.selected && !insuranceSelection.quoteError) {
      cards.push({
        id: "insurance",
        label: t.packageBuilder.services.insurance,
        selected: true,
        icon: serviceIconMap.insurance,
        details: insuranceDetails.length > 0 ? insuranceDetails : [t.packageBuilder.checkout.pendingDetails],
      });
    }

    return cards.filter((card) => card.selected);
  })();

  const serviceTotals = (() => {
    const totals: {
      id: PackageBuilderService;
      label: string;
      value: string;
      icon: string;
    }[] = [];
    const add = (
      id: PackageBuilderService,
      label: string,
      amount: number | null | undefined,
      currency: string | null | undefined,
      rates: typeof baseRates
    ) => {
      const formatted = formatServicePrice(amount ?? null, currency ?? null, rates);
      totals.push({ id, label, value: formatted ?? t.common.contact, icon: serviceIconMap[id] });
    };

    if (hotel?.selected) {
      add(
        "hotel",
        t.packageBuilder.services.hotel,
        hotel.price,
        hotel.currency,
        hotelRates
      );
    }
    if (transfer?.selected) {
      add(
        "transfer",
        t.packageBuilder.services.transfer,
        transfer.price,
        
        transfer.currency,
        baseRates
      );
    }
    if (excursion?.selected) {
      add(
        "excursion",
        t.packageBuilder.services.excursion,
        excursion.price,
        excursion.currency,
        baseRates
      );
    }
    if (builderState.flight?.selected) {
      add(
        "flight",
        t.packageBuilder.services.flight,
        builderState.flight.price,
        builderState.flight.currency,
        baseRates
      );
    }
    if (builderState.insurance?.selected && !builderState.insurance?.quoteError) {
      add(
        "insurance",
        t.packageBuilder.services.insurance,
        builderState.insurance.price,
        builderState.insurance.currency,
        baseRates
      );
    }

    return totals;
  })();

  const estimatedTotal = (() => {
    let missingPrice = false;
    const totals: { amount: number; currency: string }[] = [];
    let selectedCount = 0;
    const addSelection = (
      selected: boolean,
      amount: number | null | undefined,
      currency: string | null | undefined,
      rates: typeof baseRates
    ) => {
      if (!selected) return;
      selectedCount += 1;
      const normalized = normalizeAmount(amount ?? null, currency ?? null, rates);
      if (!normalized) {
        missingPrice = true;
        return;
      }
      totals.push({ amount: normalized.amount, currency: normalized.currency });
    };

    addSelection(
      hotel?.selected === true,
      hotel?.price ?? null,
      hotel?.currency ?? null,
      hotelRates
    );
    addSelection(transfer?.selected === true, transfer?.price ?? null, transfer?.currency ?? null, baseRates);
    addSelection(excursion?.selected === true, excursion?.price ?? null, excursion?.currency ?? null, baseRates);
    addSelection(builderState.flight?.selected === true, builderState.flight?.price ?? null, builderState.flight?.currency ?? null, baseRates);
    if (builderState.insurance?.selected && !builderState.insurance?.quoteError) {
      addSelection(
        true,
        builderState.insurance?.price ?? null,
        builderState.insurance?.currency ?? null,
        baseRates
      );
    }

    if (selectedCount === 0) return null;
    if (totals.length === 0 || missingPrice) return t.common.contactForRates;
    const currency = totals[0].currency;
    if (totals.some((item) => item.currency !== currency)) return t.common.contactForRates;
    const totalAmount = totals.reduce((sum, item) => sum + item.amount, 0);
    return formatCurrencyAmount(totalAmount, currency, intlLocale);
  })();

  const guestDetailsValid =
    guestDetails.length > 0 &&
    guestDetails.every(
      (room) =>
        room.guests.length > 0 &&
        room.guests.every(
          (guest) =>
            guest.firstName.trim().length > 0 &&
            guest.lastName.trim().length > 0 &&
            Number.isFinite(guest.age) &&
            guest.age >= 0
        )
    );

  const insuranceDetailsValid = (() => {
    if (!insuranceActive) return true;
    if (!hotel?.checkInDate || !hotel?.checkOutDate) return false;
    const planId = insuranceSelection.planId ?? insuranceSelection.selectionId ?? null;
    if (
      !planId ||
      !insuranceSelection.riskAmount ||
      !insuranceSelection.riskCurrency ||
      !normalizeOptional(insuranceSelection.territoryCode) ||
      !normalizeOptional(insuranceSelection.travelCountries)
    ) {
      return false;
    }
    if (insuranceTravelers.length === 0) return false;
    return insuranceTravelers.every((traveler) => {
      const address = traveler.address ?? {};
      return (
        Boolean(normalizeOptional(traveler.firstNameEn)) &&
        Boolean(normalizeOptional(traveler.lastNameEn)) &&
        Boolean(traveler.gender) &&
        Boolean(normalizeOptional(traveler.birthDate)) &&
        Boolean(normalizeOptional(traveler.passportNumber)) &&
        Boolean(normalizeOptional(traveler.passportAuthority)) &&
        Boolean(normalizeOptional(traveler.passportIssueDate)) &&
        Boolean(normalizeOptional(traveler.passportExpiryDate)) &&
        (traveler.type !== "Adult" || Boolean(normalizeOptional(traveler.socialCard))) &&
        Boolean(normalizeOptional(traveler.citizenship)) &&
        traveler.residency !== null &&
        traveler.residency !== undefined &&
        Boolean(normalizeOptional(traveler.mobilePhone)) &&
        Boolean(normalizeOptional(traveler.email)) &&
        Boolean(normalizeOptional(address.full)) &&
        Boolean(normalizeOptional(address.fullEn)) &&
        Boolean(normalizeOptional(address.country)) &&
        Boolean(normalizeOptional(address.region)) &&
        Boolean(normalizeOptional(address.city))
      );
    });
  })();

  const canPay = Boolean(
    termsAccepted &&
      (!insuranceActive || insuranceTermsAccepted) &&
      contact.firstName.trim().length > 0 &&
      contact.email.trim().length > 0 &&
      guestDetailsValid &&
      insuranceDetailsValid &&
      !insuranceQuoteLoading &&
      (paymentMethod === "idram" ||
        (card.name.trim() &&
          card.number.trim() &&
          card.expiry.trim() &&
          card.cvc.trim())) &&
      !paymentLoading
  );

  return (
    <main className="package-checkout">
      <div className="container">
        <div className="package-checkout__header">
          <h1>{t.packageBuilder.checkout.title}</h1>
          <p>{t.packageBuilder.checkout.subtitle}</p>
          {formattedSessionRemaining ? (
            <p className="package-checkout__timer">
              <span className="material-symbols-rounded">timer</span>
              {t.packageBuilder.sessionExpiresIn}:{" "}
              <strong>{formattedSessionRemaining}</strong>
            </p>
          ) : null}
        </div>

        <form className="package-checkout__layout" onSubmit={handleSubmit}>
          <section className="package-checkout__panel">
            <div className="checkout-section">
              <div className="checkout-section__heading">
                <h2>{t.packageBuilder.checkout.summaryTitle}</h2>
                <p className="checkout-section__hint">{t.packageBuilder.checkout.summaryHint}</p>
              </div>
              {serviceCards.length === 0 ? (
                <p className="checkout-empty">{t.packageBuilder.checkout.emptySummary}</p>
              ) : (
                <div className="checkout-service-list">
                  {serviceCards.map((card) => (
                    <fieldset key={card.id} className="checkout-service">
                      <legend className="checkout-service__title">
                        <span className="material-symbols-rounded" aria-hidden="true">
                          {card.icon}
                        </span>
                        {card.label}
                        {typeof card.count === "number" && card.count > 0 ? (
                          <span className="checkout-service__count">({card.count})</span>
                        ) : null}
                      </legend>
                      <ul className="checkout-service__details">
                        {card.details.map((detail, index) => (
                          <li key={`${card.id}-${index}`}>{detail}</li>
                        ))}
                      </ul>
                    </fieldset>
                  ))}
                </div>
              )}
            </div>

            <div className="checkout-section">
              <div className="checkout-section__heading">
                <h2>{t.packageBuilder.checkout.contactTitle}</h2>
                <p className="checkout-section__hint">{t.packageBuilder.checkout.contactHint}</p>
              </div>
              <div className="checkout-field-grid">
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.firstName} {t.packageBuilder.checkout.latinHint}</span>
                  <input
                    className="checkout-input"
                    type="text"
                    value={contact.firstName}
                    spellCheck="false"
                    onChange={(event) =>
                      setContact((prev) => ({
                        ...prev,
                        firstName: sanitizeLatinInput(event.target.value),
                      }))
                    }
                    autoComplete="given-name"
                    lang="en"
                    inputMode="text"
                    pattern="[A-Za-z\\s'-]*"
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.lastName} {t.packageBuilder.checkout.latinHint}</span>

                  <input
                    className="checkout-input"
                    type="text"
                    value={contact.lastName}
                    spellCheck="false"
                    onChange={(event) =>
                      setContact((prev) => ({
                        ...prev,
                        lastName: sanitizeLatinInput(event.target.value),
                      }))
                    }
                    autoComplete="family-name"
                    lang="en"
                    inputMode="text"
                    pattern="[A-Za-z\\s'-]*"
                  />
                </label>
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.email}</span>
                  <input
                    className="checkout-input"
                    type="email"
                    value={contact.email}
                    onChange={(event) =>
                      setContact((prev) => ({ ...prev, email: event.target.value }))
                    }
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.phone}</span>
                  <input
                    className="checkout-input"
                    type="tel"
                    value={contact.phone}
                    onChange={(event) =>
                      setContact((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    autoComplete="tel"
                  />
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <div className="checkout-section__heading">
                <h2>{t.packageBuilder.checkout.guestTitle}</h2>
                <p className="checkout-section__hint">{t.packageBuilder.checkout.guestHint}</p>
              </div>
              {guestDetails.length === 0 ? (
                <p className="checkout-empty">{t.packageBuilder.checkout.guestEmpty}</p>
              ) : (
                <div className="checkout-guests">
                  {guestDetails.map((room, roomIndex) => {
                    let adultIndex = 0;
                    let childIndex = 0;
                    const guestCards = room.guests.map((guest) => {
                      const isAdult = guest.type === "Adult";
                      const index = isAdult ? (adultIndex += 1) : (childIndex += 1);
                      return (
                        <div key={guest.id} className="checkout-guest-card">
                          <div className="checkout-guest-card__heading">
                            <span>
                              {isAdult
                                ? t.packageBuilder.checkout.guestAdultLabel
                                : t.packageBuilder.checkout.guestChildLabel}{" "}
                              {index}
                            </span>
                            {leadGuestId === guest.id ? (
                              <span className="checkout-guest-card__lead">
                                {t.packageBuilder.checkout.guestLeadLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="checkout-field-grid checkout-field-grid--guests">
                            <label className="checkout-field">
                              <span>{t.packageBuilder.checkout.firstName} {t.packageBuilder.checkout.latinHint}</span>
                              <input
                                className="checkout-input"
                                type="text"
                                value={guest.firstName}
                                spellCheck="false"
                                onChange={(event) =>
                                  updateGuestDetails(room.roomIdentifier, guest.id, {
                                    firstName: event.target.value,
                                  })
                                }
                                lang="en"
                                inputMode="text"
                                pattern="[A-Za-z\\s'-]*"
                                required
                              />
                            </label>
                            <label className="checkout-field">
                              <span>{t.packageBuilder.checkout.lastName} {t.packageBuilder.checkout.latinHint}</span>
                              <input
                                className="checkout-input"
                                type="text"
                                value={guest.lastName}
                                spellCheck="false"
                                onChange={(event) =>
                                  updateGuestDetails(room.roomIdentifier, guest.id, {
                                    lastName: event.target.value,
                                  })
                                }
                                lang="en"
                                inputMode="text"
                                pattern="[A-Za-z\\s'-]*"
                                required
                              />
                            </label>
                            <label className="checkout-field">
                              <span>{t.packageBuilder.checkout.ageLabel}</span>
                              {isAdult ? (
                                <input
                                  className="checkout-input"
                                  type="number"
                                  min="0"
                                  max="99"
                                  step="1"
                                  inputMode="numeric"
                                  value={Number.isFinite(guest.age) ? guest.age : ""}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    const nextAge =
                                      value.trim().length === 0
                                        ? Number.NaN
                                        : Number(value);
                                    updateGuestDetails(room.roomIdentifier, guest.id, {
                                      age: nextAge,
                                    });
                                  }}
                                  required
                                />
                              ) : (
                                <div
                                  className="checkout-input checkout-input--static"
                                  aria-readonly="true"
                                >
                                  {Number.isFinite(guest.age) ? guest.age : "-"}
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      );
                    });

                    if (guestDetails.length === 1) {
                      return (
                        <div key={room.roomIdentifier} className="checkout-guest-list">
                          {guestCards}
                        </div>
                      );
                    }

                    return (
                      <fieldset key={room.roomIdentifier} className="checkout-guest-room">
                        <legend className="checkout-guest-room__title">
                          {t.packageBuilder.checkout.guestRoomLabel} {roomIndex + 1}
                        </legend>
                        <div className="checkout-guest-list">
                          {guestCards}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </div>

            {insuranceActive && (
              <div className="checkout-section">
                <div className="checkout-section__heading">
                  <h2>{t.packageBuilder.checkout.insuranceTitle}</h2>
                  <p className="checkout-section__hint">{t.packageBuilder.checkout.insuranceHint}</p>
                </div>
                {insuranceTravelers.length === 0 ? (
                  <p className="checkout-empty">{t.packageBuilder.checkout.insuranceEmpty}</p>
                ) : (
                  <div className="checkout-guests">
                    {insuranceTravelers.map((traveler, index) => {
                      const addressCountry = resolveCountryAlpha2(traveler.address?.country) ?? null;
                      const regionOptions = getEfesRegionOptions(addressCountry, locale);
                      const cityOptions = getEfesCityOptions(
                        addressCountry,
                        traveler.address?.region ?? null,
                        locale
                      );
                      const useRegionSelect = regionOptions.length > 0;
                      const useCitySelect = regionOptions.length > 0;

                      return (
                        <div key={traveler.id} className="checkout-guest-card">
                        <div className="checkout-guest-card__heading">
                          <span>
                            {t.packageBuilder.checkout.insuranceTravelerLabel.replace("{index}", (index + 1).toString())}
                          </span>
                          <span className="checkout-guest-card__lead">
                            {traveler.type === "Adult"
                              ? t.packageBuilder.checkout.guestAdultLabel
                              : t.packageBuilder.checkout.guestChildLabel}
                          </span>
                        </div>
                        <div className="checkout-guest-card__subrisks">
                          <span>{t.packageBuilder.insurance.subrisksTitle}</span>
                          {(() => {
                            const rawSubrisks = resolveGuestSubrisks(traveler.id);
                            const normalizedSubrisks = Array.isArray(rawSubrisks)
                              ? rawSubrisks
                                  .map((value) => value.trim())
                                  .filter((value) => value.length > 0)
                              : [];
                            const labels = normalizedSubrisks.map(resolveSubriskLabel);
                            if (labels.length === 0) {
                              return <span className="checkout-guest-card__subrisk-empty">—</span>;
                            }
                            return (
                              <div className="checkout-guest-card__subrisk-list">
                                {labels.map((label, labelIndex) => (
                                  <span
                                    key={`${traveler.id}-subrisk-${labelIndex}`}
                                    className="checkout-guest-card__subrisk"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="checkout-field-grid">
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.firstName} {t.packageBuilder.checkout.armenianHint}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.firstName}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  firstName: sanitizeArmenianInput(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.lastName} {t.packageBuilder.checkout.armenianHint}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.lastName}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  lastName: sanitizeArmenianInput(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.firstNameEn} {t.packageBuilder.checkout.latinHint}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.firstNameEn ?? ""}
                              onChange={(event) => {
                                const value = sanitizeLatinInput(event.target.value);
                                const updates: Partial<InsuranceTravelerForm> = { firstNameEn: value };
                                if (shouldSyncArmenian(traveler.firstName, traveler.firstNameEn)) {
                                  updates.firstName = transliterateLatinToArmenian(value);
                                }
                                updateInsuranceTraveler(traveler.id, updates);
                              }}
                              lang="en"
                              inputMode="text"
                              pattern="[A-Za-z\\s'-]*"
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.lastNameEn} {t.packageBuilder.checkout.latinHint}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.lastNameEn ?? ""}
                              onChange={(event) => {
                                const value = sanitizeLatinInput(event.target.value);
                                const updates: Partial<InsuranceTravelerForm> = { lastNameEn: value };
                                if (shouldSyncArmenian(traveler.lastName, traveler.lastNameEn)) {
                                  updates.lastName = transliterateLatinToArmenian(value);
                                }
                                updateInsuranceTraveler(traveler.id, updates);
                              }}
                              lang="en"
                              inputMode="text"
                              pattern="[A-Za-z\\s'-]*"
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.gender}</span>
                            <select
                              className="checkout-input"
                              value={traveler.gender ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  gender: event.target.value === "M" || event.target.value === "F"
                                    ? event.target.value
                                    : null,
                                })
                              }
                              required
                            >
                              <option value="">{t.packageBuilder.checkout.insuranceFields.genderPlaceholder}</option>
                              <option value="M">{t.packageBuilder.checkout.insuranceFields.genderMale}</option>
                              <option value="F">{t.packageBuilder.checkout.insuranceFields.genderFemale}</option>
                            </select>
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.birthDate}</span>
                            <input
                              className="checkout-input"
                              type="date"
                              value={traveler.birthDate ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { birthDate: event.target.value })
                              }
                              required
                            />
                          </label>
                        </div>
                        <div className="checkout-field-grid">
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.passportNumber}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.passportNumber ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { passportNumber: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.passportAuthority}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.passportAuthority ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { passportAuthority: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.passportIssueDate}</span>
                            <input
                              className="checkout-input"
                              type="date"
                              value={traveler.passportIssueDate ?? ""}
                              onChange={(event) => {
                                const issueDate = event.target.value;
                                if (traveler.type === "Adult") {
                                  const expiryDate = issueDate
                                    ? addYearsToDateInput(issueDate, 10)
                                    : null;
                                  updateInsuranceTraveler(traveler.id, {
                                    passportIssueDate: issueDate,
                                    passportExpiryDate: expiryDate ?? null,
                                  });
                                  return;
                                }
                                updateInsuranceTraveler(traveler.id, { passportIssueDate: issueDate });
                              }}
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.passportExpiryDate}</span>
                            <input
                              className="checkout-input"
                              type="date"
                              value={traveler.passportExpiryDate ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { passportExpiryDate: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.residency}</span>
                            <select
                              className="checkout-input"
                              value={
                                traveler.residency === true
                                  ? "1"
                                  : traveler.residency === false
                                    ? "0"
                                    : ""
                              }
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  residency: event.target.value === "1",
                                })
                              }
                              required
                            >
                              <option value="1">{t.common.yes}</option>
                              <option value="0">{t.common.no}</option>
                            </select>
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.citizenship}</span>
                            <select
                              className="checkout-input"
                              value={resolveCountryAlpha2(traveler.citizenship) ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { citizenship: event.target.value })
                              }
                              required
                            >
                              <option value="">{t.packageBuilder.checkout.countryPlaceholder}</option>
                              {citizenshipOptions.map((option) => {
                                const suffix = option.alpha3
                                  ? `${option.code}/${option.alpha3}`
                                  : option.code;
                                return (
                                  <option key={option.code} value={option.code}>
                                    {option.flag} {option.label} ({suffix})
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.socialCard}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.socialCard ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { socialCard: event.target.value })
                              }
                              required={traveler.type === "Adult"}
                            />
                          </label>
                        </div>
                        <div className="checkout-field-grid">
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.mobilePhone}</span>
                            <input
                              className="checkout-input"
                              type="tel"
                              value={traveler.mobilePhone ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { mobilePhone: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.phone}</span>
                            <input
                              className="checkout-input"
                              type="tel"
                              value={traveler.phone ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { phone: event.target.value })
                              }
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.email}</span>
                            <input
                              className="checkout-input"
                              type="email"
                              value={traveler.email ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { email: event.target.value })
                              }
                              required
                            />
                          </label>
                        </div>
                        <div className="checkout-field-grid">
                          <label className="checkout-field checkout-field--full">
                            <span>{t.packageBuilder.checkout.insuranceFields.address}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.address?.full ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  address: { ...(traveler.address ?? {}), full: event.target.value },
                                })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field checkout-field--full">
                            <span>{t.packageBuilder.checkout.insuranceFields.addressEn}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.address?.fullEn ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  address: { ...(traveler.address ?? {}), fullEn: event.target.value },
                                })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.country}</span>
                            <select
                              className="checkout-input"
                              value={resolveCountryAlpha2(traveler.address?.country) ?? ""}
                              onChange={(event) => {
                                const country = event.target.value;
                                const nextRegionOptions = getEfesRegionOptions(country, locale);
                                const nextRegion = nextRegionOptions[0]?.code ?? null;
                                const nextCityOptions = getEfesCityOptions(country, nextRegion, locale);
                                const nextCity = nextCityOptions[0]?.code ?? null;
                                updateInsuranceTraveler(traveler.id, {
                                  address: {
                                    ...(traveler.address ?? {}),
                                    country,
                                    region: nextRegion,
                                    city: nextCity,
                                  },
                                });
                              }}
                              required
                            >
                              <option value="">{t.packageBuilder.checkout.countryPlaceholder}</option>
                              {countryOptions.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.flag} {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.region}</span>
                            {useRegionSelect ? (
                              <select
                                className="checkout-input"
                                value={traveler.address?.region ?? ""}
                                onChange={(event) => {
                                  const region = event.target.value;
                                  const nextCityOptions = getEfesCityOptions(
                                    addressCountry,
                                    region,
                                    locale
                                  );
                                  const nextCity = nextCityOptions[0]?.code ?? null;
                                  updateInsuranceTraveler(traveler.id, {
                                    address: {
                                      ...(traveler.address ?? {}),
                                      region,
                                      city: nextCity,
                                    },
                                  });
                                }}
                                required
                              >
                                <option value="">{t.packageBuilder.checkout.countryPlaceholder}</option>
                                {regionOptions.map((option) => (
                                  <option key={option.code} value={option.code}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className="checkout-input"
                                type="text"
                                value={traveler.address?.region ?? ""}
                                onChange={(event) =>
                                  updateInsuranceTraveler(traveler.id, {
                                    address: { ...(traveler.address ?? {}), region: event.target.value },
                                  })
                                }
                                required
                              />
                            )}
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.city}</span>
                            {useCitySelect ? (
                              <select
                                className="checkout-input"
                                value={traveler.address?.city ?? ""}
                                onChange={(event) =>
                                  updateInsuranceTraveler(traveler.id, {
                                    address: { ...(traveler.address ?? {}), city: event.target.value },
                                  })
                                }
                                disabled={!traveler.address?.region}
                                required
                              >
                                <option value="">{t.packageBuilder.checkout.countryPlaceholder}</option>
                                {cityOptions.map((option) => (
                                  <option key={option.code} value={option.code}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className="checkout-input"
                                type="text"
                                value={traveler.address?.city ?? ""}
                                onChange={(event) =>
                                  updateInsuranceTraveler(traveler.id, {
                                    address: { ...(traveler.address ?? {}), city: event.target.value },
                                  })
                                }
                                required
                              />
                            )}
                          </label>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
                {insuranceQuoteError ? (
                  <p className="checkout-error" role="alert">
                    {insuranceQuoteError}
                  </p>
                ) : null}
                {isDevEnvironment && insuranceActive ? (
                  <div className="checkout-dev-insurance">
                    <button
                      type="button"
                      className="checkout-dev-submit"
                      onClick={handleDevInsuranceSubmit}
                      disabled={!insuranceDetailsValid || devInsuranceLoading}
                    >
                      {t.packageBuilder.checkout.devInsuranceSubmit}
                    </button>
                    {devInsuranceMessage ? (
                      <p className="checkout-dev-message" role="status">
                        {devInsuranceMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            <div className="checkout-section">
              <div className="checkout-section__heading">
                <h2>{t.packageBuilder.checkout.billingTitle}</h2>
                <p className="checkout-section__hint">{t.packageBuilder.checkout.billingHint}</p>
              </div>
              <div className="checkout-field-grid">
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.country}</span>
                  <select
                    className="checkout-input"
                    value={resolveCountryAlpha2(billing.country) ?? ""}
                    onChange={(event) =>
                      setBilling((prev) => ({ ...prev, country: event.target.value }))
                    }
                    autoComplete="country-name"
                  >
                    <option value="">{t.packageBuilder.checkout.countryPlaceholder}</option>
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.flag} {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.city}</span>
                  <input
                    className="checkout-input"
                    type="text"
                    value={billing.city}
                    onChange={(event) =>
                      setBilling((prev) => ({ ...prev, city: event.target.value }))
                    }
                    autoComplete="address-level2"
                  />
                </label>
                <label className="checkout-field checkout-field--full">
                  <span>{t.packageBuilder.checkout.address}</span>
                  <input
                    className="checkout-input"
                    type="text"
                    value={billing.address}
                    onChange={(event) =>
                      setBilling((prev) => ({ ...prev, address: event.target.value }))
                    }
                    autoComplete="street-address"
                  />
                </label>
              </div>
            </div>
            <div className="checkout-section">
              <div className="checkout-section__heading">
                <h2>{t.packageBuilder.checkout.paymentTitle}</h2>
                <p className="checkout-section__hint">{t.packageBuilder.checkout.paymentHint}</p>
              </div>
              <div className="checkout-payment">
                <label className="checkout-radio">
                  <input
                    type="radio"
                    name="payment-method"
                    value="idram"
                    checked={paymentMethod === "idram"}
                    onChange={() => setPaymentMethod("idram")}
                  />
                  <span>{t.packageBuilder.checkout.methodIdram}</span>
                </label>
                {/* <label className="checkout-radio">
                  <input
                    type="radio"
                    name="payment-method"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span>{t.packageBuilder.checkout.methodCard}</span>
                </label> */}
                {paymentMethod === "card" && (
                  <div className="checkout-card-grid">
                    <label className="checkout-field checkout-field--full">
                      <span>{t.packageBuilder.checkout.cardName}</span>
                      <input
                        className="checkout-input"
                        type="text"
                        value={card.name}
                        onChange={(event) =>
                          setCard((prev) => ({ ...prev, name: event.target.value }))
                        }
                        autoComplete="cc-name"
                        required
                      />
                    </label>
                    <label className="checkout-field checkout-field--full">
                      <span>{t.packageBuilder.checkout.cardNumber}</span>
                      <input
                        className="checkout-input"
                        type="text"
                        value={card.number}
                        onChange={(event) =>
                          setCard((prev) => ({ ...prev, number: event.target.value }))
                        }
                        autoComplete="cc-number"
                        inputMode="numeric"
                        required
                      />
                    </label>
                    <label className="checkout-field">
                      <span>{t.packageBuilder.checkout.cardExpiry}</span>
                      <input
                        className="checkout-input"
                        type="text"
                        value={card.expiry}
                        onChange={(event) =>
                          setCard((prev) => ({ ...prev, expiry: event.target.value }))
                        }
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        required
                      />
                    </label>
                    <label className="checkout-field">
                      <span>{t.packageBuilder.checkout.cardCvc}</span>
                      <input
                        className="checkout-input"
                        type="text"
                        value={card.cvc}
                        onChange={(event) =>
                          setCard((prev) => ({ ...prev, cvc: event.target.value }))
                        }
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        required
                      />
                    </label>
                  </div>
                )}
              </div>
              <label className="checkout-terms">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>
                  {t.packageBuilder.checkout.termsLabel}{" "}
                  <Link href={`/${locale}/refund-policy`} target="_blank">{t.footer.refundPolicy}</Link>{" "}
                  {t.packageBuilder.checkout.termsConnector}{" "}
                  <Link href={`/${locale}/privacy-policy`} target="_blank">{t.footer.securityPolicy}</Link>.
                </span>
              </label>
              {insuranceActive ? (
                <label className="checkout-terms">
                  <input
                    type="checkbox"
                    checked={insuranceTermsAccepted}
                    onChange={(event) => setInsuranceTermsAccepted(event.target.checked)}
                  />
                  <span>
                    {t.packageBuilder.checkout.insuranceTerms.prefix}
                    <Link
                      href="https://online.efes.am/pdfs/04-11-01-Travel-insurance-rules-3-0-arm.pdf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.packageBuilder.checkout.insuranceTerms.link}
                    </Link>
                    {t.packageBuilder.checkout.insuranceTerms.suffix}
                  </span>
                </label>
              ) : null}
            </div>
          </section>

          <aside className="package-checkout__summary">
            <div className="checkout-summary__card">
              <h3><span className="material-symbols-rounded" aria-hidden="true">payments</span>{t.packageBuilder.checkout.totalTitle}</h3>
              {serviceTotals.map((service) => (
                <div key={service.id} className="checkout-summary__line">
                  <span>
                    <span className="material-symbols-rounded" aria-hidden="true">
                      {service.icon}
                    </span>
                    {service.label}
                  </span>
                  <strong>{service.value}</strong>
                </div>
              ))}
              <div className="checkout-summary__line">
                <b>{t.packageBuilder.checkout.totalLabel}</b>
                <strong>{estimatedTotal ?? 0}</strong>
              </div>
              <div className="checkout-coupon">
                <input
                  className="checkout-input"
                  type="text"
                  placeholder={t.packageBuilder.checkout.couponTitle}
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                />
                <button type="button" className="checkout-apply">
                  {t.packageBuilder.checkout.applyCoupon}
                </button>
              </div>
              {paymentError ? (
                <p className="checkout-error" role="alert">
                  {paymentError}
                </p>
              ) : null}
              <button type="submit" className="checkout-pay" disabled={!canPay}>
                {paymentMethod === "idram"
                  ? t.packageBuilder.checkout.payIdram
                  : t.packageBuilder.checkout.payCard}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
