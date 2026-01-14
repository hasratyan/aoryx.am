"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";
import { postJson } from "@/lib/api-helpers";
import type { Locale as AppLocale } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import type { PackageBuilderState, PackageBuilderService } from "@/lib/package-builder-state";
import {
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
} from "@/lib/package-builder-state";
import { useAmdRates } from "@/lib/use-amd-rates";
import type {
  AoryxBookingPayload,
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
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
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
  hotelSelection: PackageBuilderState["hotel"],
  contact: { firstName: string; lastName: string },
  previous: RoomGuestForm[]
) => {
  const rooms = Array.isArray(hotelSelection?.rooms) ? hotelSelection.rooms : [];
  if (rooms.length === 0) return [];

  return rooms.map((room, roomIndex) => {
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
        firstName: resolvedFirst,
        lastName: resolvedLast,
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
        firstName: existingGuest?.firstName ?? "",
        lastName: existingGuest?.lastName ?? "",
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
  const [couponCode, setCouponCode] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
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
  const [card, setCard] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
  });

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    const nameParts = splitNameParts(user.name ?? null);
    setContact((prev) => ({
      ...prev,
      firstName: prev.firstName.trim().length > 0 ? prev.firstName : nameParts.first,
      lastName: prev.lastName.trim().length > 0 ? prev.lastName : nameParts.last,
      email: prev.email.trim().length > 0 ? prev.email : user.email ?? "",
    }));
  }, [session?.user]);

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

  useEffect(() => {
    setGuestDetails((prev) => buildGuestDetails(builderState.hotel, contact, prev));
  }, [builderState.hotel?.rooms, builderState.hotel?.hotelCode, contact.firstName, contact.lastName]);

  const hotel = builderState.hotel;
  const transfer = builderState.transfer;
  const excursion = builderState.excursion;
  const insuranceSelection = builderState.insurance;
  const leadGuestId =
    guestDetails.flatMap((room) => room.guests).find((guest) => guest.type === "Adult")?.id ??
    null;

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
      const fallbackCitizenship = hotel?.nationality?.trim() || "ARM";

      const next = guestDetails.flatMap((room) =>
        room.guests.map((guest) => {
          const existing =
            previousById.get(guest.id) ??
            storedById.get(guest.id) ??
            null;
          const address = existing?.address ?? {};
          return {
            id: guest.id,
            age: guest.age,
            type: guest.type,
            firstName: guest.firstName,
            lastName: guest.lastName,
            firstNameEn: existing?.firstNameEn ?? guest.firstName,
            lastNameEn: existing?.lastNameEn ?? guest.lastName,
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
    insuranceSelection?.selected,
    insuranceSelection?.travelers,
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
    setGuestDetails((prev) =>
      prev.map((room) =>
        room.roomIdentifier === roomIdentifier
          ? {
              ...room,
              guests: room.guests.map((guest) =>
                guest.id === guestId ? { ...guest, ...updates } : guest
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
    if (!insuranceSelection?.selected) return null;
    const startDate = hotel?.checkInDate ?? null;
    const endDate = hotel?.checkOutDate ?? null;
    if (!startDate || !endDate) return null;
    const territoryCode = normalizeOptional(insuranceSelection.territoryCode) ?? "";
    const riskAmount = insuranceSelection.riskAmount ?? null;
    const riskCurrency = normalizeOptional(insuranceSelection.riskCurrency) ?? "";
    if (!territoryCode || !riskAmount || !riskCurrency) return null;
    if (insuranceTravelers.length === 0) return null;

    const travelers = insuranceTravelers
      .map((traveler) => {
        if (!Number.isFinite(traveler.age)) return null;
        return { id: traveler.id, age: traveler.age };
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
      days: insuranceSelection.days ?? calculateTripDays(startDate, endDate) ?? undefined,
      subrisks: insuranceSelection.subrisks ?? undefined,
      travelers,
    };
  }, [
    hotel?.checkInDate,
    hotel?.checkOutDate,
    insuranceSelection?.days,
    insuranceSelection?.riskAmount,
    insuranceSelection?.riskCurrency,
    insuranceSelection?.riskLabel,
    insuranceSelection?.selected,
    insuranceSelection?.subrisks,
    insuranceSelection?.territoryCode,
    insuranceTravelers,
  ]);

  const insuranceQuoteRequest = useMemo(() => {
    const payload = buildInsuranceQuotePayload();
    if (!payload) return null;
    return { key: JSON.stringify(payload), payload };
  }, [buildInsuranceQuotePayload]);

  const applyInsuranceQuote = (quote: EfesQuoteResult) => {
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
    setInsuranceTravelers(updated);
    updatePackageBuilderState((state) => {
      if (!state.insurance?.selected) return state;
      const startDate = hotel?.checkInDate ?? state.insurance.startDate ?? null;
      const endDate = hotel?.checkOutDate ?? state.insurance.endDate ?? null;
      return {
        ...state,
        insurance: {
          ...state.insurance,
          price: quote.totalPremium,
          currency: quote.currency,
          travelers: updated,
          startDate,
          endDate,
          days:
            typeof state.insurance.days === "number"
              ? state.insurance.days
              : calculateTripDays(startDate ?? null, endDate ?? null) ?? null,
        },
        updatedAt: Date.now(),
      };
    });
    return updated;
  };

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
          error instanceof Error ? error.message : t.packageBuilder.checkout.errors.insuranceQuoteFailed;
        setInsuranceQuoteError(message);
        if (options?.setPaymentError) {
          setPaymentError(message);
        }
        return null;
      } finally {
        if (requestId === insuranceQuoteRequestIdRef.current) {
          setInsuranceQuoteLoading(false);
        }
      }
    },
    [t.packageBuilder.checkout.errors.insuranceQuoteFailed]
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
    }));

  const updateInsuranceTraveler = (
    travelerId: string,
    updates: Partial<InsuranceTravelerForm>
  ) => {
    setInsuranceQuoteError(null);
    setInsuranceTravelers((prev) => {
      const next = prev.map((traveler) =>
        traveler.id === travelerId ? { ...traveler, ...updates } : traveler
      );
      updatePackageBuilderState((state) => {
        if (!state.insurance?.selected) return state;
        return {
          ...state,
          insurance: {
            ...state.insurance,
            travelers: next,
          },
          updatedAt: Date.now(),
        };
      });
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPay || paymentLoading) return;
    setPaymentError(null);
    setInsuranceQuoteError(null);
    if (!guestDetailsValid) {
      setPaymentError(t.packageBuilder.checkout.errors.missingGuestDetails);
      return;
    }

    if (insuranceSelection?.selected && !insuranceDetailsValid) {
      setPaymentError(t.packageBuilder.checkout.errors.insuranceDetailsRequired);
      return;
    }

    if (paymentMethod !== "idram") {
      setPaymentError(t.packageBuilder.checkout.errors.cardUnavailable);
      return;
    }

    let insuranceTravelersPayload: BookingInsuranceTraveler[] | null = null;
    let insuranceQuote: EfesQuoteResult | null = null;
    if (insuranceSelection?.selected) {
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
            ? {
                id: builderState.transfer.selectionId ?? "transfer",
                includeReturn: builderState.transfer.includeReturn ?? undefined,
                transferType: normalizeTransferType(builderState.transfer.transferType ?? null),
                origin: builderState.transfer.transferOrigin
                  ? { name: builderState.transfer.transferOrigin }
                  : undefined,
                destination: builderState.transfer.transferDestination
                  ? { name: builderState.transfer.transferDestination }
                  : undefined,
                vehicle: builderState.transfer.vehicleName
                  ? { name: builderState.transfer.vehicleName }
                  : undefined,
                quantity:
                  typeof builderState.transfer.vehicleQuantity === "number"
                    ? builderState.transfer.vehicleQuantity
                    : undefined,
                pricing: {
                  currency: builderState.transfer.currency ?? undefined,
                  ...(builderState.transfer.includeReturn
                    ? {
                        return:
                          typeof builderState.transfer.price === "number"
                            ? builderState.transfer.price
                            : undefined,
                      }
                    : {
                        oneWay:
                          typeof builderState.transfer.price === "number"
                            ? builderState.transfer.price
                            : undefined,
                      }),
                },
                totalPrice: builderState.transfer.price ?? null,
              }
            : undefined,
        excursions:
          builderState.excursion?.selected
            ? {
                totalAmount:
                  typeof builderState.excursion.price === "number"
                    ? builderState.excursion.price
                    : 0,
                selections: [
                  {
                    id: builderState.excursion.selectionId ?? "excursion",
                    currency: builderState.excursion.currency ?? undefined,
                    totalPrice: builderState.excursion.price ?? null,
                  },
                ],
              }
            : undefined,
        insurance:
          builderState.insurance?.selected
            ? {
                planId: builderState.insurance.planId ?? builderState.insurance.selectionId ?? "insurance",
                planName: builderState.insurance.planLabel ?? builderState.insurance.label ?? null,
                planLabel: builderState.insurance.planLabel ?? builderState.insurance.label ?? null,
                price: insuranceQuote?.totalPremium ?? builderState.insurance.price ?? null,
                currency: insuranceQuote?.currency ?? builderState.insurance.currency ?? null,
                provider: "efes",
                riskAmount: builderState.insurance.riskAmount ?? null,
                riskCurrency: builderState.insurance.riskCurrency ?? null,
                riskLabel: builderState.insurance.riskLabel ?? null,
                territoryCode: builderState.insurance.territoryCode ?? null,
                territoryLabel: builderState.insurance.territoryLabel ?? null,
                territoryPolicyLabel: builderState.insurance.territoryPolicyLabel ?? null,
                travelCountries: builderState.insurance.travelCountries ?? null,
                startDate: hotelSelection.checkInDate ?? null,
                endDate: hotelSelection.checkOutDate ?? null,
                days: calculateTripDays(hotelSelection.checkInDate, hotelSelection.checkOutDate),
                subrisks: builderState.insurance.subrisks ?? null,
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

  const serviceCards = (() => {
    const cards: {
      id: PackageBuilderService;
      label: string;
      selected: boolean;
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
    const transferType = transfer?.transferType?.trim().toUpperCase() ?? null;
    const vehicleLabel =
      vehicleName && transferType === "INDIVIDUAL" && vehicleQty && vehicleQty > 1
        ? `${vehicleName} x ${vehicleQty}`
        : vehicleName;
    const vehicleLine = buildDetailLine(
      t.packageBuilder.checkout.labels.vehicle,
      vehicleLabel
    );
    if (vehicleLine) transferDetails.push(vehicleLine);
    const typeLine = buildDetailLine(
      t.packageBuilder.checkout.labels.type,
      transfer?.transferType ?? null
    );
    if (typeLine) transferDetails.push(typeLine);

    cards.push({
      id: "transfer",
      label: t.packageBuilder.services.transfer,
      selected: transfer?.selected === true,
      details: transferDetails.length > 0 ? transferDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const excursionDetails: string[] = [];

    cards.push({
      id: "excursion",
      label: t.packageBuilder.services.excursion,
      selected: excursion?.selected === true,
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
      details: flightDetails.length > 0 ? flightDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    const insuranceSelection = builderState.insurance;
    const insuranceDetails: string[] = [];
    const insurancePlanLabel =
      insuranceSelection?.planLabel ?? insuranceSelection?.label ?? null;
    if (insurancePlanLabel) insuranceDetails.push(insurancePlanLabel);
    const insuranceTerritory = buildDetailLine(
      t.packageBuilder.insurance.territoryLabel,
      insuranceSelection?.territoryLabel ?? null
    );
    if (insuranceTerritory) insuranceDetails.push(insuranceTerritory);
    const insuranceCountries = buildDetailLine(
      t.packageBuilder.insurance.travelCountriesLabel,
      insuranceSelection?.travelCountries ?? null
    );
    if (insuranceCountries) insuranceDetails.push(insuranceCountries);
    cards.push({
      id: "insurance",
      label: t.packageBuilder.services.insurance,
      selected: insuranceSelection?.selected === true,
      details: insuranceDetails.length > 0 ? insuranceDetails : [t.packageBuilder.checkout.pendingDetails],
    });

    return cards.filter((card) => card.selected);
  })();

  const serviceTotals = (() => {
    const totals: { id: PackageBuilderService; label: string; value: string }[] = [];
    const add = (
      id: PackageBuilderService,
      label: string,
      amount: number | null | undefined,
      currency: string | null | undefined,
      rates: typeof baseRates
    ) => {
      const formatted = formatServicePrice(amount ?? null, currency ?? null, rates);
      totals.push({ id, label, value: formatted ?? t.common.contact });
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
    if (builderState.insurance?.selected) {
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
    addSelection(builderState.insurance?.selected === true, builderState.insurance?.price ?? null, builderState.insurance?.currency ?? null, baseRates);

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
    if (!insuranceSelection?.selected) return true;
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
                      <legend className="checkout-service__title">{card.label}</legend>
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
                  <span>{t.packageBuilder.checkout.firstName}</span>
                  <input
                    className="checkout-input"
                    type="text"
                    value={contact.firstName}
                    spellCheck="false"
                    onChange={(event) =>
                      setContact((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>{t.packageBuilder.checkout.lastName}</span>
                  <input
                    className="checkout-input"
                    type="text"
                    value={contact.lastName}
                    spellCheck="false"
                    onChange={(event) =>
                      setContact((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    autoComplete="family-name"
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
                    return (
                      <fieldset key={room.roomIdentifier} className="checkout-guest-room">
                        <legend className="checkout-guest-room__title">
                          {t.packageBuilder.checkout.guestRoomLabel} {roomIndex + 1}
                        </legend>
                        <div className="checkout-guest-list">
                          {room.guests.map((guest) => {
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
                                    <span>{t.packageBuilder.checkout.firstName}</span>
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
                                      required
                                    />
                                  </label>
                                  <label className="checkout-field">
                                    <span>{t.packageBuilder.checkout.lastName}</span>
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
                          })}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </div>

            {insuranceSelection?.selected === true && (
              <div className="checkout-section">
                <div className="checkout-section__heading">
                  <h2>{t.packageBuilder.checkout.insuranceTitle}</h2>
                  <p className="checkout-section__hint">{t.packageBuilder.checkout.insuranceHint}</p>
                </div>
                {insuranceTravelers.length === 0 ? (
                  <p className="checkout-empty">{t.packageBuilder.checkout.insuranceEmpty}</p>
                ) : (
                  <div className="checkout-guests">
                    {insuranceTravelers.map((traveler, index) => (
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
                        <div className="checkout-field-grid">
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.firstName}</span>
                            <input
                              className="checkout-input checkout-input--static"
                              type="text"
                              value={traveler.firstName}
                              readOnly
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.lastName}</span>
                            <input
                              className="checkout-input checkout-input--static"
                              type="text"
                              value={traveler.lastName}
                              readOnly
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.firstNameEn}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.firstNameEn ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { firstNameEn: event.target.value })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.lastNameEn}</span>
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.lastNameEn ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { lastNameEn: event.target.value })
                              }
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
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { passportIssueDate: event.target.value })
                              }
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
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.citizenship ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, { citizenship: event.target.value })
                              }
                              required
                            />
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
                            <input
                              className="checkout-input"
                              type="text"
                              value={traveler.address?.country ?? ""}
                              onChange={(event) =>
                                updateInsuranceTraveler(traveler.id, {
                                  address: { ...(traveler.address ?? {}), country: event.target.value },
                                })
                              }
                              required
                            />
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.region}</span>
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
                          </label>
                          <label className="checkout-field">
                            <span>{t.packageBuilder.checkout.insuranceFields.city}</span>
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
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {insuranceQuoteError ? (
                  <p className="checkout-error" role="alert">
                    {insuranceQuoteError}
                  </p>
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
                  <input
                    className="checkout-input"
                    type="text"
                    value={billing.country}
                    onChange={(event) =>
                      setBilling((prev) => ({ ...prev, country: event.target.value }))
                    }
                    autoComplete="country-name"
                  />
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
            </div>
          </section>

          <aside className="package-checkout__summary">
            <div className="checkout-summary__card">
              <h3>{t.packageBuilder.checkout.totalTitle}</h3>
              {serviceTotals.map((service) => (
                <div key={service.id} className="checkout-summary__line">
                  <span>{service.label}</span>
                  <strong>{service.value}</strong>
                </div>
              ))}
              <div className="checkout-summary__line">
                <b>{t.packageBuilder.checkout.totalLabel}</b>
                <strong>{estimatedTotal ?? 0}</strong>
              </div>
              <p className="checkout-summary__note">{t.packageBuilder.checkout.processingNote}</p>
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
