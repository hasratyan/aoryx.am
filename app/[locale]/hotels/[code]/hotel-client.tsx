"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import SearchForm from "@/components/search-form";
import Loader from "@/components/loader";
import { postJson } from "@/lib/api-helpers";
import { parseSearchParams } from "@/lib/search-query";
import { useLanguage, useTranslations } from "@/components/language-provider";
import type { Locale as AppLocale, PluralForms } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount, type AmdRates } from "@/lib/currency";
import { useAmdRates } from "@/lib/use-amd-rates";
import Image from "next/image";
import ImageGallery from "./ImageGallery";
import {
  PACKAGE_BUILDER_SESSION_MS,
  openPackageBuilder,
  updatePackageBuilderState,
  type PackageBuilderHotelSelection,
} from "@/lib/package-builder-state";
import type {
  AoryxBookingPayload,
  AoryxBookingResult,
  AoryxExcursionTicket,
  AoryxExcursionsPayload,
  AoryxHotelInfoResult,
  AoryxRoomOption,
  AoryxRoomSearch,
  AoryxTransferRate,
  AoryxTransferSelection,
  BookingAirTicketRequest,
  BookingInsuranceSelection,
} from "@/types/aoryx";

function toFinite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeMealLabel = (value: string) => value.trim().toLowerCase();

const pickMealLabel = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const intlLocales: Record<AppLocale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const getGroupMealLabel = (group: { option: AoryxRoomOption; items: AoryxRoomOption[] }) =>
  pickMealLabel(group.option.boardType) ??
  pickMealLabel(group.option.meal) ??
  pickMealLabel(group.items.find((item) => pickMealLabel(item.boardType))?.boardType) ??
  pickMealLabel(group.items.find((item) => pickMealLabel(item.meal))?.meal) ??
  null;

const buildTransferId = (transfer: AoryxTransferRate) =>
  transfer._id ??
  [
    transfer.transferType ?? "transfer",
    transfer.origin?.locationCode ?? transfer.origin?.name ?? "origin",
    transfer.destination?.locationCode ?? transfer.destination?.name ?? "destination",
    transfer.vehicle?.name ?? transfer.vehicle?.category ?? "vehicle",
    transfer.paxRange?.maxPax ?? "pax",
    transfer.pricing?.oneWay ?? "price",
  ].join("|");

const buildExcursionId = (excursion: AoryxExcursionTicket) =>
  excursion._id ?? excursion.activityCode ?? excursion.name ?? "excursion";

type GuestForm = {
  id: string;
  type: "Adult" | "Child";
  title: string;
  firstName: string;
  lastName: string;
  age: number;
};

type BookingRoomState = {
  roomIdentifier: number;
  rateKey: string;
  roomName: string | null;
  meal: string | null;
  rateType: string | null;
  refundable: boolean | null;
  bedTypes: string[];
  inclusions: string[];
  policies: NonNullable<AoryxRoomOption["policies"]>;
  remarks: NonNullable<AoryxRoomOption["remarks"]>;
  cancellationPolicy: string | null;
  price: {
    gross: number | null;
    net: number | null;
    tax: number | null;
  };
  guests: GuestForm[];
  childAges: number[];
};

type TransferFieldErrors = Record<
  string,
  {
    flightNumber?: string;
    arrivalDateTime?: string;
  }
>;

type TransferFlightDetails = {
  flightNumber: string;
  arrivalDateTime: string;
};

type ExcursionSelectionState = {
  adults: number;
  children: number;
};

type InsurancePlan = {
  id: string;
  title: string;
  description: string;
  highlight?: string;
};

type PrebookContext = {
  rateKeys: string[];
  isBookable: boolean | null;
  isSoldOut: boolean | null;
  isPriceChanged: boolean | null;
  currency: string | null;
};

type PrebookRoomSnapshot = {
  roomIdentifier: number | null;
  policies: NonNullable<AoryxRoomOption["policies"]>;
  remarks: NonNullable<AoryxRoomOption["remarks"]>;
  cancellationPolicy: string | null;
};

type PrebookSummary = {
  isBookable: boolean | null;
  isSoldOut: boolean | null;
  isPriceChanged: boolean | null;
  currency?: string | null;
  rooms?: PrebookRoomSnapshot[];
};

type DestinationApiResponse = {
  destinations?: Array<{
    id: string;
    name: string;
    rawId?: string;
  }>;
  rawDestinations?: Array<{
    id: string;
    name: string;
    rawId?: string;
  }>;
};

type BookingPayloadInput = Omit<AoryxBookingPayload, "groupCode" | "sessionId"> & {
  groupCode?: number;
  sessionId?: string;
};

type SafeRoomDetails = {
  currency: string | null;
  rooms: AoryxRoomOption[];
};

type HotelClientProps = {
  initialHotelInfo: AoryxHotelInfoResult | null;
  initialRoomDetails: SafeRoomDetails | null;
  initialHotelError?: string | null;
  initialRoomsError?: string | null;
  initialFallbackCoordinates?: { lat: number; lon: number } | null;
  initialAmdRates?: AmdRates | null;
  initialTransferOptions?: AoryxTransferRate[] | null;
  initialTransferError?: string | null;
  initialExcursionOptions?: AoryxExcursionTicket[] | null;
  initialExcursionError?: string | null;
  initialExcursionFee?: number | null;
};

type IdramCheckoutResponse = {
  action: string;
  fields: Record<string, string>;
  billNo: string;
};

type RemarkVariant = "mandatory" | "warning" | "info" | "note";

type RemarkLabels = {
  mandatory: string;
  mandatoryTax: string;
  mandatoryFee: string;
  mandatoryCharge: string;
  optional: string;
  knowBeforeYouGo: string;
  disclaimer: string;
  note: string;
};

type PolicyLabels = {
  cancellation: string;
  noShow: string;
  modification: string;
};

type RemarkMeta = {
  label: string;
  icon: string;
  variant: RemarkVariant;
};

type RemarkMetaConfig = {
  labelKey: keyof RemarkLabels;
  icon: string;
  variant: RemarkVariant;
};

const REMARK_TYPE_META: Record<string, RemarkMetaConfig> = {
  MANDATORY: { labelKey: "mandatory", icon: "priority_high", variant: "mandatory" },
  MANDATORYTAX: { labelKey: "mandatoryTax", icon: "receipt_long", variant: "mandatory" },
  MANDATORYFEE: { labelKey: "mandatoryFee", icon: "receipt_long", variant: "mandatory" },
  MANDATORYCHARGE: { labelKey: "mandatoryCharge", icon: "receipt_long", variant: "mandatory" },
  OPTIONAL: { labelKey: "optional", icon: "info", variant: "info" },
  KNOWBEFOREYOUGO: { labelKey: "knowBeforeYouGo", icon: "travel_explore", variant: "warning" },
  DISCLAIMER: { labelKey: "disclaimer", icon: "gavel", variant: "warning" },
  NOTE: { labelKey: "note", icon: "sticky_note_2", variant: "note" },
};

const normalizeRemarkType = (input?: string | null) =>
  input ? input.replace(/[\s_-]/g, "").toUpperCase() : null;

const getRemarkMeta = (
  type: string | null | undefined,
  labels: RemarkLabels,
  fallbackLabel: string
): RemarkMeta => {
  const normalized = normalizeRemarkType(type);
  if (normalized) {
    const match = REMARK_TYPE_META[normalized];
    if (match) {
      return { label: labels[match.labelKey], icon: match.icon, variant: match.variant };
    }
    if (normalized.startsWith("MANDATORY")) {
      const fallback = REMARK_TYPE_META.MANDATORY;
      return { label: labels[fallback.labelKey], icon: fallback.icon, variant: fallback.variant };
    }
  }
  return {
    label: type?.trim() || fallbackLabel,
    icon: "info",
    variant: "info",
  };
};

type PolicyMetaConfig = {
  labelKey: keyof PolicyLabels;
  icon: string;
  variant: RemarkVariant;
};

const POLICY_TYPE_META: Record<string, PolicyMetaConfig> = {
  CAN: { labelKey: "cancellation", icon: "event_busy", variant: "warning" },
  NOS: { labelKey: "noShow", icon: "hotel", variant: "mandatory" },
  MOD: { labelKey: "modification", icon: "edit", variant: "info" },
};

const getPolicyMeta = (
  type: string | null | undefined,
  labels: PolicyLabels,
  fallbackLabel: string
): RemarkMeta => {
  const normalized = normalizeRemarkType(type);
  if (normalized && POLICY_TYPE_META[normalized]) {
    const match = POLICY_TYPE_META[normalized];
    return { label: labels[match.labelKey], icon: match.icon, variant: match.variant };
  }
  return {
    label: type?.trim() || fallbackLabel,
    icon: "policy",
    variant: "info",
  };
};

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const buildBookingGuests = (
  selectedRooms: AoryxRoomOption[],
  rooms: AoryxRoomSearch[] | null
): BookingRoomState[] => {
  if (!rooms || rooms.length === 0) return [];
  const selectedRoomList = selectedRooms ?? [];
  const prebookByIdentifier = new Map<number, AoryxRoomOption>();
  selectedRoomList.forEach((room, index) => {
    if (typeof room.roomIdentifier === "number") {
      prebookByIdentifier.set(room.roomIdentifier, room);
    } else {
      prebookByIdentifier.set(index + 1, room);
    }
  });

  return rooms.map((room, index) => {
    const prebookRoom = prebookByIdentifier.get(room.roomIdentifier) ?? selectedRoomList[index];
    const roomIdentifier =
      (typeof prebookRoom?.roomIdentifier === "number" ? prebookRoom.roomIdentifier : null) ??
      room.roomIdentifier ??
      index + 1;
    const adultCount =
      (typeof prebookRoom?.adultCount === "number" ? prebookRoom.adultCount : null) ?? room.adults;
    const childAgesRaw =
      Array.isArray(prebookRoom?.childAges) && prebookRoom.childAges.length > 0
        ? prebookRoom.childAges
        : room.childrenAges;
    const childAges = Array.isArray(childAgesRaw)
      ? childAgesRaw.filter((age): age is number => typeof age === "number")
      : [];

    const guests: GuestForm[] = [
      ...Array.from({ length: Math.max(1, adultCount) }).map((_, guestIndex) => ({
        id: `room-${roomIdentifier}-adult-${guestIndex + 1}`,
        type: "Adult" as const,
        title: "Mr.",
        firstName: "",
        lastName: "",
        age: 30,
      })),
      ...childAges.map((age, guestIndex) => ({
        id: `room-${roomIdentifier}-child-${guestIndex + 1}`,
        type: "Child" as const,
        title: "Master",
        firstName: "",
        lastName: "",
        age: age ?? 5,
      })),
    ];

    return {
      roomIdentifier,
      rateKey: prebookRoom?.rateKey ?? "",
      roomName: prebookRoom?.name ?? null,
      meal: prebookRoom?.meal ?? prebookRoom?.boardType ?? null,
      rateType: prebookRoom?.rateType ?? null,
      refundable: prebookRoom?.refundable ?? null,
      bedTypes: prebookRoom?.bedTypes ?? [],
      inclusions: prebookRoom?.inclusions ?? [],
      policies: prebookRoom?.policies ?? [],
      remarks: prebookRoom?.remarks ?? [],
      cancellationPolicy: prebookRoom?.cancellationPolicy ?? null,
      price: {
        gross: prebookRoom?.price?.gross ?? null,
        net: prebookRoom?.price?.net ?? null,
        tax: prebookRoom?.price?.tax ?? null,
      },
      guests,
      childAges,
    };
  });
};

const mergePrebookExtras = (
  selectedRooms: AoryxRoomOption[],
  prebookRooms?: PrebookRoomSnapshot[]
): AoryxRoomOption[] => {
  if (!prebookRooms || prebookRooms.length === 0) return selectedRooms;
  const prebookByIdentifier = new Map<number, PrebookRoomSnapshot>();
  prebookRooms.forEach((room) => {
    if (typeof room.roomIdentifier === "number") {
      prebookByIdentifier.set(room.roomIdentifier, room);
    }
  });

  return selectedRooms.map((room, index) => {
    const identifier = typeof room.roomIdentifier === "number" ? room.roomIdentifier : null;
    const matched = identifier !== null ? prebookByIdentifier.get(identifier) : prebookRooms[index];
    if (!matched) return room;
    return {
      ...room,
      policies: matched.policies.length > 0 ? matched.policies : room.policies ?? [],
      remarks: matched.remarks.length > 0 ? matched.remarks : room.remarks ?? [],
      cancellationPolicy: matched.cancellationPolicy ?? room.cancellationPolicy ?? null,
    };
  });
};

type BookingValidationCopy = {
  roomNeedsAdult: string;
  missingGuestNames: string;
  invalidGuestAges: string;
  invalidChildAge: string;
  invalidAdultAge: string;
};

const fillTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const validateBookingGuests = (
  rooms: BookingRoomState[],
  copy: BookingValidationCopy
): string | null => {
  for (const room of rooms) {
    const adultCount = room.guests.filter((guest) => guest.type === "Adult").length;
    if (adultCount === 0) {
      return fillTemplate(copy.roomNeedsAdult, { room: room.roomIdentifier });
    }
    for (const guest of room.guests) {
      if (!guest.firstName.trim() || !guest.lastName.trim()) {
        return copy.missingGuestNames;
      }
      if (!Number.isFinite(guest.age) || guest.age < 0) {
        return copy.invalidGuestAges;
      }
      if (guest.type === "Child" && guest.age > 17) {
        return copy.invalidChildAge;
      }
      if (guest.type === "Adult" && guest.age < 18) {
        return copy.invalidAdultAge;
      }
    }
  }
  return null;
};

function decodeHtmlEntities(text: string): string {
  if (typeof window === "undefined") return text;
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

type FormatPlural = (count: number, forms: PluralForms) => string;
type FormatMoney = (amount: number | null | undefined, currency: string | null | undefined) => string | null;

const formatPolicyDateTime = (
  iso: string | null | undefined,
  time: string | null | undefined,
  locale: string
) => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    const base = iso.split("T")[0] ?? iso;
    return time ? `${base} ${time}` : base;
  }
  const formatted = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
  return time ? `${formatted} ${time}` : formatted;
};

const describePolicyPenalty = (
  condition: BookingRoomState["policies"][number]["conditions"][number],
  currency: string | null | undefined,
  formatPlural: FormatPlural,
  nightCopy: PluralForms,
  freeCancellationLabel: string,
  formatMoney: FormatMoney
) => {
  const parts: string[] = [];
  if (typeof condition.percentage === "number" && condition.percentage > 0) {
    parts.push(`${condition.percentage}%`);
  }
  if (typeof condition.nights === "number" && condition.nights > 0) {
    parts.push(formatPlural(condition.nights, nightCopy));
  }
  if (typeof condition.fixed === "number" && condition.fixed > 0) {
    const formatted = formatMoney(condition.fixed, currency ?? "USD");
    if (formatted) parts.push(formatted);
  }
  if (condition.text) {
    parts.push(condition.text);
  }
  return parts.length > 0 ? parts.join(" + ") : freeCancellationLabel;
};

const describePolicyCondition = (
  condition: BookingRoomState["policies"][number]["conditions"][number],
  currency: string | null | undefined,
  locale: string,
  formatPlural: FormatPlural,
  nightCopy: PluralForms,
  freeCancellationLabel: string,
  fromLabel: string,
  untilLabel: string,
  formatMoney: FormatMoney
) => {
  const from = formatPolicyDateTime(condition.fromDate, condition.fromTime, locale);
  const to = formatPolicyDateTime(condition.toDate, condition.toTime, locale);
  const windowParts: string[] = [];
  if (from) windowParts.push(`${fromLabel} ${from}`);
  if (to) windowParts.push(`${untilLabel} ${to}`);
  const timeWindow = windowParts.length > 0 ? windowParts.join(" ") : null;
  const penalty = describePolicyPenalty(
    condition,
    currency,
    formatPlural,
    nightCopy,
    freeCancellationLabel,
    formatMoney
  );
  return timeWindow ? `${timeWindow} · ${penalty}` : penalty;
};

export default function HotelClient({
  initialHotelInfo,
  initialRoomDetails,
  initialHotelError = null,
  initialRoomsError = null,
  initialFallbackCoordinates = null,
  initialAmdRates,
  initialTransferOptions = null,
  initialTransferError = null,
  initialExcursionOptions = null,
  initialExcursionError = null,
  initialExcursionFee = null,
}: HotelClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { locale } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const pluralRules = useMemo(() => new Intl.PluralRules(intlLocale), [intlLocale]);
  const formatPlural = (count: number, forms: PluralForms) => {
    const category = pluralRules.select(count);
    const template = forms[category] ?? forms.other;
    return template.replace("{count}", count.toString());
  };
  const { data: session, status: authStatus } = useSession();
  const isSignedIn = Boolean(session?.user);
  const { rates: hotelRates } = useAmdRates(initialAmdRates);
  const { rates: addonRates } = useAmdRates(undefined, {
    endpoint: "/api/utils/exchange-rates?scope=transfers",
  });

  const formatDisplayPrice = useCallback(
    (amount: number | null | undefined, currency: string | null | undefined) => {
      const normalized = normalizeAmount(amount, currency, hotelRates);
      if (!normalized) return null;
      return formatCurrencyAmount(normalized.amount, normalized.currency, intlLocale);
    },
    [hotelRates, intlLocale]
  );

  const formatAddonPrice = useCallback(
    (amount: number | null | undefined, currency: string | null | undefined) => {
      const normalized = normalizeAmount(amount, currency, addonRates);
      if (!normalized) return null;
      return formatCurrencyAmount(normalized.amount, normalized.currency, intlLocale);
    },
    [addonRates, intlLocale]
  );

  const hotelCode = Array.isArray(params.code) ? params.code[0] : params.code;

  const parsed = useMemo(() => {
    const merged = new URLSearchParams(searchParams.toString());
    if (hotelCode) merged.set("hotelCode", hotelCode);
    return parseSearchParams(merged, {
      missingDates: t.search.errors.missingDates,
      missingLocation: t.search.errors.missingLocation,
      invalidRooms: t.search.errors.invalidRooms,
    });
  }, [searchParams, hotelCode, t]);
  const destinationCodeFromQuery =
    parsed.payload?.destinationCode ?? searchParams.get("destinationCode") ?? undefined;

  const [hotelInfo, setHotelInfo] = useState<AoryxHotelInfoResult | null>(initialHotelInfo);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{ lat: number; lon: number } | null>(
    initialFallbackCoordinates
  );
  const [roomOptions, setRoomOptions] = useState<AoryxRoomOption[]>(initialRoomDetails?.rooms ?? []);
  const [activePrebook, setActivePrebook] = useState<PrebookContext | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingGuests, setBookingGuests] = useState<BookingRoomState[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingPreparing, setBookingPreparing] = useState(false);
  const [bookingResult, setBookingResult] = useState<AoryxBookingResult | null>(null);
  const [confirmPriceChange, setConfirmPriceChange] = useState(false);
  const [pendingHotelSelection, setPendingHotelSelection] =
    useState<PackageBuilderHotelSelection | null>(null);
  const [prebookingKey, setPrebookingKey] = useState<string | null>(null);
  const [showTransfers, setShowTransfers] = useState(false);
  const [showExcursions, setShowExcursions] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [transferOptions, setTransferOptions] = useState<AoryxTransferRate[]>(
    initialTransferOptions ?? []
  );
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(initialTransferError);
  const [transferLoaded, setTransferLoaded] = useState(
    initialTransferOptions !== null || initialTransferError !== null
  );
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [includeReturnTransfer, setIncludeReturnTransfer] = useState(false);
  const [transferFlightDetails, setTransferFlightDetails] = useState<
    Record<string, TransferFlightDetails>
  >({});
  const [transferVehicleQuantity, setTransferVehicleQuantity] = useState<Record<string, number>>({});
  const [transferFieldErrors, setTransferFieldErrors] = useState<TransferFieldErrors>({});
  const [excursionOptions, setExcursionOptions] = useState<AoryxExcursionTicket[]>(
    initialExcursionOptions ?? []
  );
  const [excursionLoading, setExcursionLoading] = useState(false);
  const [excursionError, setExcursionError] = useState<string | null>(initialExcursionError);
  const [excursionLoaded, setExcursionLoaded] = useState(
    initialExcursionOptions !== null || initialExcursionError !== null
  );
  const [excursionSelections, setExcursionSelections] = useState<
    Record<string, ExcursionSelectionState>
  >({});
  const [excursionFee, setExcursionFee] = useState(initialExcursionFee ?? 0);
  const [insuranceSelection, setInsuranceSelection] = useState<BookingInsuranceSelection | null>(
    null
  );
  const [flightRequest, setFlightRequest] = useState<BookingAirTicketRequest>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    cabinClass: "",
    notes: "",
  });
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(initialRoomsError);
  const [mealFilter, setMealFilter] = useState<string>("all");
  const [priceSort, setPriceSort] = useState<"default" | "asc" | "desc">("default");
  const [favoriteChecking, setFavoriteChecking] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(initialHotelError);
  const [resolvedDestinationCode, setResolvedDestinationCode] = useState<string | null>(null);
  const amenitiesRef = useRef<HTMLDivElement | null>(null);
  const bookingPopoverRef = useRef<HTMLDivElement | null>(null);
  const destinationCode =
    destinationCodeFromQuery ?? hotelInfo?.destinationId ?? resolvedDestinationCode ?? undefined;
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [amenitiesOverflow, setAmenitiesOverflow] = useState(false);
  const finalError = error;

  useEffect(() => {
    setHotelInfo(initialHotelInfo);
    setFallbackCoordinates(initialFallbackCoordinates);
    setError(initialHotelError);
  }, [initialFallbackCoordinates, initialHotelError, initialHotelInfo]);

  const roomDetailsPayload = useMemo(() => {
    if (!parsed.payload || !hotelCode) return null;
    return { ...parsed.payload, hotelCode };
  }, [hotelCode, parsed.payload]);

  useEffect(() => {
    setRoomsLoading(false);
    setRoomsError(initialRoomsError ?? null);
    setRoomOptions(initialRoomDetails?.rooms ?? []);
    setActivePrebook(null);
    setBookingOpen(false);
    setBookingGuests([]);
    setBookingError(null);
    setBookingResult(null);
    setConfirmPriceChange(false);
    setPendingHotelSelection(null);
    setPrebookingKey(null);
    setShowTransfers(false);
    setShowExcursions(false);
    setShowInsurance(false);
    setShowFlights(false);
    setTransferOptions(initialTransferOptions ?? []);
    setTransferLoading(false);
    setTransferError(initialTransferError ?? null);
    setTransferLoaded(initialTransferOptions !== null || initialTransferError !== null);
    setSelectedTransferId(null);
    setIncludeReturnTransfer(false);
    setTransferFlightDetails({});
    setTransferVehicleQuantity({});
    setTransferFieldErrors({});
    setExcursionOptions(initialExcursionOptions ?? []);
    setExcursionLoading(false);
    setExcursionError(initialExcursionError ?? null);
    setExcursionLoaded(initialExcursionOptions !== null || initialExcursionError !== null);
    setExcursionSelections({});
    setExcursionFee(typeof initialExcursionFee === "number" ? initialExcursionFee : 0);
    setInsuranceSelection(null);
    setFlightRequest({
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      cabinClass: "",
      notes: "",
    });
  }, [
    initialExcursionError,
    initialExcursionFee,
    initialExcursionOptions,
    initialRoomDetails,
    initialRoomsError,
    initialTransferError,
    initialTransferOptions,
  ]);

  useEffect(() => {
    queueMicrotask(() => setAmenitiesExpanded(false));
  }, [hotelInfo?.systemId]);

  useEffect(() => {
    const element = amenitiesRef.current;
    if (!element) return;

    const measure = () => {
      if (amenitiesExpanded) return;
      const isOverflowing = element.scrollHeight > element.clientHeight + 1;
      setAmenitiesOverflow(isOverflowing);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [amenitiesExpanded, hotelInfo?.masterHotelAmenities]);

  useEffect(() => {
    const element = bookingPopoverRef.current;
    if (!element) return;
    const isOpen = element.matches?.(":popover-open");

    if (bookingOpen && element.showPopover && !isOpen) {
      element.showPopover();
    } else if (!bookingOpen && element.hidePopover && isOpen) {
      element.hidePopover();
    }
  }, [bookingOpen]);
  const roundedRating = Math.round(hotelInfo?.rating ?? 0);
  const galleryImages = useMemo(() => {
    const unique = new Set<string>();
    const add = (value?: string | null) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          unique.add(trimmed);
        }
      }
    };
    (hotelInfo?.imageUrls ?? []).forEach(add);
    return Array.from(unique);
  }, [hotelInfo?.imageUrls]);
  const hotelCoordinates = useMemo(() => {
    const lat = toFinite(hotelInfo?.geoCode?.lat) ?? fallbackCoordinates?.lat ?? null;
    const lon = toFinite(hotelInfo?.geoCode?.lon) ?? fallbackCoordinates?.lon ?? null;
    return lat !== null && lon !== null ? { lat, lon } : null;
  }, [fallbackCoordinates?.lat, fallbackCoordinates?.lon, hotelInfo?.geoCode?.lat, hotelInfo?.geoCode?.lon]);
  const mapPopoverId = "hotel-map-popover";
  const mapEmbedSrc = hotelCoordinates
    ? `https://www.google.com/maps?q=${hotelCoordinates.lat},${hotelCoordinates.lon}&output=embed`
    : null;
  const fallbackCurrency = hotelInfo?.currencyCode ?? parsed.payload?.currency ?? null;
  const tripAdvisorRating = hotelInfo?.tripAdvisorRating ?? null;
  const roomCount = roomDetailsPayload?.rooms.length ?? 1;
  const groupedRoomOptions = useMemo(() => {
    if (roomCount <= 1) {
      return roomOptions.map((option, index) => ({
        key: `${option.id}-${index}`,
        option,
        items: [option],
        totalPrice: option.totalPrice,
        currency: option.currency ?? fallbackCurrency,
      }));
    }

    const groups = new Map<
      string,
      { key: string; option: AoryxRoomOption; items: AoryxRoomOption[] }
    >();

    roomOptions.forEach((option) => {
      const groupKey = [
        option.id,
        option.boardType ?? "",
        option.refundable ?? "",
        option.cancellationPolicy ?? "",
      ].join("|");
      const existing = groups.get(groupKey);
      if (existing) {
        existing.items.push(option);
      } else {
        groups.set(groupKey, { key: groupKey, option, items: [option] });
      }
    });

    return Array.from(groups.values()).map((group) => {
      const items = group.items.slice(0, Math.max(1, roomCount));
      const hasAllPrices = items.every((item) => typeof item.totalPrice === "number");
      const totalPrice = hasAllPrices
        ? items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0)
        : null;
      const currency =
        group.option.currency ??
        fallbackCurrency ??
        items.find((item) => item.currency)?.currency ??
        null;

      return {
        ...group,
        items,
        totalPrice,
        currency,
      };
    });
  }, [fallbackCurrency, roomCount, roomOptions]);
  const mealOptions = useMemo(() => {
    const map = new Map<string, string>();
    groupedRoomOptions.forEach((group) => {
      const label = getGroupMealLabel(group);
      if (!label) return;
      const normalized = normalizeMealLabel(label);
      if (!map.has(normalized)) {
        map.set(normalized, label);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [groupedRoomOptions]);
  useEffect(() => {
    if (mealFilter !== "all" && !mealOptions.some((option) => option.value === mealFilter)) {
      setMealFilter("all");
    }
  }, [mealFilter, mealOptions]);
  const visibleRoomOptions = useMemo(() => {
    let filtered = groupedRoomOptions;
    if (mealFilter !== "all") {
      filtered = filtered.filter((group) => {
        const label = getGroupMealLabel(group);
        return label ? normalizeMealLabel(label) === mealFilter : false;
      });
    }
    if (priceSort === "default") return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aPrice = typeof a.totalPrice === "number" ? a.totalPrice : null;
      const bPrice = typeof b.totalPrice === "number" ? b.totalPrice : null;
      if (aPrice === null && bPrice === null) return 0;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return priceSort === "asc" ? aPrice - bPrice : bPrice - aPrice;
    });
    return sorted;
  }, [groupedRoomOptions, mealFilter, priceSort]);
  const isFiltered = mealFilter !== "all" || priceSort !== "default";
  const bookingCurrency =
    activePrebook?.currency ??
    initialRoomDetails?.currency ??
    fallbackCurrency ??
    parsed.payload?.currency ??
    "USD";
  const roomsTotal = useMemo(() => {
    if (bookingGuests.length === 0) return null;
    const total = bookingGuests.reduce((sum, room) => {
      const price = isFiniteNumber(room.price.net)
        ? room.price.net
        : isFiniteNumber(room.price.gross)
          ? room.price.gross
          : 0;
      return sum + price;
    }, 0);
    return total > 0 ? total : null;
  }, [bookingGuests]);

  const totalGuests = useMemo(
    () => bookingGuests.reduce((sum, room) => sum + room.guests.length, 0),
    [bookingGuests]
  );
  const adultGuests = useMemo(
    () =>
      bookingGuests.reduce(
        (sum, room) => sum + room.guests.filter((guest) => guest.type === "Adult").length,
        0
      ),
    [bookingGuests]
  );
  const childGuests = Math.max(totalGuests - adultGuests, 0);

  const transferOptionsWithId = useMemo(
    () => transferOptions.map((transfer) => ({ ...transfer, id: buildTransferId(transfer) })),
    [transferOptions]
  );
  const selectedTransfer = useMemo(
    () => transferOptionsWithId.find((transfer) => transfer.id === selectedTransferId) ?? null,
    [selectedTransferId, transferOptionsWithId]
  );
  const transferPaxCount = totalGuests > 0 ? totalGuests : null;
  const transferTotalPrice = useMemo(() => {
    if (!selectedTransfer || !transferPaxCount) return 0;
    const oneWay = toNumberValue(selectedTransfer.pricing?.oneWay);
    if (oneWay === null) return 0;
    const chargeType = selectedTransfer.pricing?.chargeType ?? "PER_PAX";
    const minPax = selectedTransfer.paxRange?.minPax ?? 1;
    const paxForCalc = Math.max(transferPaxCount, minPax);
    const vehicleQty = transferVehicleQuantity[selectedTransfer.id ?? ""] ?? 1;
    const multiplier = chargeType === "PER_PAX" ? paxForCalc : vehicleQty;
    const perDirection = oneWay * multiplier;
    return includeReturnTransfer ? perDirection * 2 : perDirection;
  }, [
    includeReturnTransfer,
    selectedTransfer,
    transferPaxCount,
    transferVehicleQuantity,
  ]);

  const excursionOptionsWithId = useMemo(
    () => excursionOptions.map((excursion) => ({ ...excursion, id: buildExcursionId(excursion) })),
    [excursionOptions]
  );
  const excursionSelectionsPayload = useMemo<AoryxExcursionsPayload | null>(() => {
    const selections = excursionOptionsWithId
      .map((excursion) => {
        const selection = excursionSelections[excursion.id] ?? { adults: 0, children: 0 };
        const totalCount = selection.adults + selection.children;
        if (totalCount <= 0) return null;
        const adultPrice = toNumberValue(excursion.pricing?.adult);
        const childPrice = toNumberValue(excursion.pricing?.child) ?? adultPrice;
        const totalPrice =
          (adultPrice ?? 0) * selection.adults + (childPrice ?? 0) * selection.children;
        return {
          id: excursion.id,
          name: excursion.name ?? null,
          quantityAdult: selection.adults,
          quantityChild: selection.children,
          priceAdult: adultPrice,
          priceChild: childPrice,
          currency: excursion.pricing?.currency ?? null,
          childPolicy: excursion.childPolicy ?? null,
          totalPrice,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (selections.length === 0) return null;
    const totalAmount = selections.reduce((sum, entry) => sum + (entry.totalPrice ?? 0), 0);
    return { totalAmount, selections };
  }, [excursionOptionsWithId, excursionSelections]);

  const excursionsTotal = excursionSelectionsPayload?.totalAmount ?? 0;
  const insuranceTotal =
    typeof insuranceSelection?.price === "number" ? insuranceSelection.price : 0;
  const flightsTotal =
    typeof flightRequest.price === "number" ? flightRequest.price : 0;
  const transferCurrency = selectedTransfer?.pricing?.currency ?? bookingCurrency;
  const excursionsCurrency = excursionSelectionsPayload?.selections[0]?.currency ?? bookingCurrency;
  const insuranceCurrency = insuranceSelection?.currency ?? bookingCurrency;
  const flightsCurrency = flightRequest.currency ?? bookingCurrency;
  const transferDisplayTotal =
    transferTotalPrice > 0
      ? formatAddonPrice(transferTotalPrice, transferCurrency)
      : null;
  const excursionsDisplayTotal =
    excursionsTotal > 0
      ? formatAddonPrice(excursionsTotal, excursionsCurrency)
      : null;
  const packageDisplayTotal = useMemo(() => {
    if (roomsTotal === null) return null;
    const totals: { amount: number; currency: string }[] = [];
    const addAmount = (
      amount: number | null | undefined,
      currency: string | null | undefined,
      rates: typeof hotelRates
    ) => {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return;
      const normalized = normalizeAmount(amount, currency, rates);
      if (!normalized) return;
      totals.push({ amount: normalized.amount, currency: normalized.currency });
    };

    addAmount(roomsTotal, bookingCurrency, hotelRates);
    addAmount(transferTotalPrice, transferCurrency, addonRates);
    addAmount(excursionsTotal, excursionsCurrency, addonRates);
    addAmount(insuranceTotal, insuranceCurrency, addonRates);
    addAmount(flightsTotal, flightsCurrency, addonRates);

    if (totals.length === 0) return null;
    const currency = totals[0].currency;
    if (totals.some((item) => item.currency !== currency)) return null;
    const totalAmount = totals.reduce((sum, item) => sum + item.amount, 0);
    return formatCurrencyAmount(totalAmount, currency, intlLocale);
  }, [
    roomsTotal,
    bookingCurrency,
    hotelRates,
    transferTotalPrice,
    transferCurrency,
    addonRates,
    excursionsTotal,
    excursionsCurrency,
    insuranceTotal,
    insuranceCurrency,
    flightsTotal,
    flightsCurrency,
    intlLocale,
  ]);

  const transferSelectionPayload = useMemo<AoryxTransferSelection | null>(() => {
    if (!showTransfers || !selectedTransfer) return null;
    const id = selectedTransfer.id ?? buildTransferId(selectedTransfer);
    const flightDetails = transferFlightDetails[id] ?? { flightNumber: "", arrivalDateTime: "" };
    const quantity = transferVehicleQuantity[id] ?? 1;
    return {
      ...selectedTransfer,
      id,
      includeReturn: includeReturnTransfer,
      quantity,
      flightDetails,
      totalPrice: transferTotalPrice,
      paxCount: transferPaxCount ?? undefined,
    };
  }, [
    includeReturnTransfer,
    selectedTransfer,
    showTransfers,
    transferFlightDetails,
    transferPaxCount,
    transferTotalPrice,
    transferVehicleQuantity,
  ]);

  const insuranceSelectionPayload = useMemo<BookingInsuranceSelection | null>(() => {
    if (!showInsurance || !insuranceSelection) return null;
    return insuranceSelection;
  }, [insuranceSelection, showInsurance]);

  const flightRequestPayload = useMemo<BookingAirTicketRequest | null>(() => {
    if (!showFlights) return null;
    const origin = flightRequest.origin?.trim() ?? "";
    const destination = flightRequest.destination?.trim() ?? "";
    const departureDate = flightRequest.departureDate?.trim() ?? "";
    const returnDate = flightRequest.returnDate?.trim() ?? "";
    const cabinClass = flightRequest.cabinClass?.trim() ?? "";
    const notes = flightRequest.notes?.trim() ?? "";
    const price = flightRequest.price ?? null;
    const currency = flightRequest.currency ?? null;

    if (
      !origin &&
      !destination &&
      !departureDate &&
      !returnDate &&
      !cabinClass &&
      !notes &&
      price === null
    ) {
      return null;
    }

    return {
      origin,
      destination,
      departureDate,
      returnDate,
      cabinClass,
      notes,
      price,
      currency,
    };
  }, [flightRequest, showFlights]);

  useEffect(() => {
    if (!bookingOpen || !showTransfers) return;
    if (transferLoaded) return;
    const destinationLabel = hotelInfo?.address?.cityName ?? "";
    if (!destinationCode && !destinationLabel) {
      setTransferError(t.hotel.addons.transfers.missingDestination);
      setTransferOptions([]);
      setTransferLoaded(true);
      return;
    }

    let active = true;
    setTransferLoading(true);
    setTransferError(null);

    postJson<{ transfers?: AoryxTransferRate[] }>("/api/aoryx/transfers", {
      destinationLocationCode: destinationCode,
      destinationName: destinationLabel,
      paxCount: transferPaxCount ?? undefined,
      travelDate: parsed.payload?.checkInDate,
    })
      .then((data) => {
        if (!active) return;
        setTransferOptions(Array.isArray(data.transfers) ? data.transfers : []);
        setTransferLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : t.hotel.addons.transfers.loadFailed;
        setTransferError(message);
        setTransferLoaded(true);
      })
      .finally(() => {
        if (active) setTransferLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    bookingOpen,
    destinationCode,
    hotelInfo?.address?.cityName,
    parsed.payload?.checkInDate,
    showTransfers,
    t.hotel.addons.transfers,
    transferLoaded,
    transferPaxCount,
  ]);

  useEffect(() => {
    if (!bookingOpen || !showExcursions) return;
    if (excursionLoaded) return;

    let active = true;
    setExcursionLoading(true);
    setExcursionError(null);

    postJson<{ excursions?: AoryxExcursionTicket[]; excursionFee?: number }>("/api/aoryx/excursions", {
      limit: 200,
    })
      .then((data) => {
        if (!active) return;
        setExcursionOptions(Array.isArray(data.excursions) ? data.excursions : []);
        if (typeof data.excursionFee === "number") {
          setExcursionFee(data.excursionFee);
        }
        setExcursionLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : t.hotel.addons.excursions.loadFailed;
        setExcursionError(message);
        setExcursionLoaded(true);
      })
      .finally(() => {
        if (active) setExcursionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingOpen, excursionLoaded, showExcursions, t.hotel.addons.excursions]);

  useEffect(() => {
    if (showTransfers) return;
    setSelectedTransferId(null);
    setIncludeReturnTransfer(false);
    setTransferFieldErrors({});
    setTransferFlightDetails({});
    setTransferVehicleQuantity({});
  }, [showTransfers]);

  useEffect(() => {
    if (showExcursions) return;
    setExcursionSelections({});
  }, [showExcursions]);

  useEffect(() => {
    if (showInsurance) return;
    setInsuranceSelection(null);
  }, [showInsurance]);

  useEffect(() => {
    if (showFlights) return;
    setFlightRequest({
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      cabinClass: "",
      notes: "",
    });
  }, [showFlights]);

  const presetDestination = destinationCode
    ? {
        id: destinationCode,
        label: destinationCode,
        rawId: destinationCode,
      }
    : undefined;

  const presetHotel = hotelCode
    ? {
        id: hotelCode,
        label: hotelInfo?.name ?? hotelCode,
      }
    : undefined;

  const initialDateRange = parsed.payload
    ? {
        startDate: new Date(`${parsed.payload.checkInDate}T00:00:00`),
        endDate: new Date(`${parsed.payload.checkOutDate}T00:00:00`),
      }
    : undefined;
  const nightsCount = useMemo(() => {
    if (!parsed.payload?.checkInDate || !parsed.payload?.checkOutDate) return null;
    const checkInDate = new Date(`${parsed.payload.checkInDate}T00:00:00`);
    const checkOutDate = new Date(`${parsed.payload.checkOutDate}T00:00:00`);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return null;
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }, [parsed.payload?.checkInDate, parsed.payload?.checkOutDate]);
  const night = formatPlural(nightsCount ?? 1, t.common.night);
  const favoriteLabel = favoritePending
    ? t.hotel.favorites.saving
    : isSignedIn
      ? isFavorite
        ? t.hotel.favorites.saved
        : t.hotel.favorites.save
      : t.hotel.favorites.signIn;
  const favoriteIcon = isFavorite ? "favorite" : "favorite_border";
  const favoriteDisabled = favoritePending || favoriteChecking || !hotelCode || authStatus === "loading";

  const initialRooms = parsed.payload?.rooms.map((room) => ({
    adults: room.adults,
    children: room.childrenAges.length,
    childAges: room.childrenAges,
  }));
  const resolveDestinationCode = useCallback(async () => {
    if (destinationCodeFromQuery) return destinationCodeFromQuery;
    if (hotelInfo?.destinationId) return hotelInfo.destinationId;
    if (resolvedDestinationCode) return resolvedDestinationCode;
    const cityName = hotelInfo?.address?.cityName?.trim();
    if (!cityName) return null;
    const countryCode = hotelInfo?.address?.countryCode?.trim() || "AE";

    try {
      const data = await postJson<DestinationApiResponse>("/api/aoryx/country-info", {
        countryCode,
        includeAll: true,
      });
      const destinations = Array.isArray(data.rawDestinations) && data.rawDestinations.length > 0
        ? data.rawDestinations
        : Array.isArray(data.destinations)
          ? data.destinations
          : [];
      if (destinations.length === 0) return null;
      const normalize = (value: string) =>
        value
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .replace(/\s+/g, " ");
      const normalizedCity = normalize(cityName);
      const exact = destinations.find((dest) => normalize(dest.name) === normalizedCity);
      const partial =
        exact ??
        destinations.find((dest) => {
          const normalizedName = normalize(dest.name);
          return normalizedCity.includes(normalizedName) || normalizedName.includes(normalizedCity);
        });
      const code = partial?.rawId ?? partial?.id ?? null;
      if (code) {
        setResolvedDestinationCode(code);
      }
      return code;
    } catch (error) {
      console.error("[Aoryx][destination] Failed to resolve destination code", error);
      return null;
    }
  }, [
    destinationCodeFromQuery,
    hotelInfo?.address?.cityName,
    hotelInfo?.address?.countryCode,
    hotelInfo?.destinationId,
    resolvedDestinationCode,
  ]);
  const handleSearchSubmit = useCallback(
    async (payload: { hotelCode?: string }, params: URLSearchParams) => {
      setRoomsLoading(true);
      setRoomsError(null);
      setRoomOptions([]);
      const resolvedHotelCode = payload.hotelCode ?? hotelCode ?? undefined;
      if (resolvedHotelCode) {
        params.set("hotelCode", resolvedHotelCode);
      }
      if (!params.get("destinationCode")) {
        const resolvedDestination = await resolveDestinationCode();
        if (resolvedDestination) {
          params.set("destinationCode", resolvedDestination);
        }
      } else if (destinationCode) {
        params.set("destinationCode", destinationCode);
      }
      const query = params.toString();
      const nextHref = query ? `${pathname}?${query}` : pathname;
      router.replace(nextHref);
    },
    [destinationCode, hotelCode, pathname, resolveDestinationCode, router]
  );

  useEffect(() => {
    let active = true;

    if (!hotelCode || authStatus !== "authenticated") {
      setIsFavorite(false);
      setFavoriteChecking(false);
      return () => {
        active = false;
      };
    }

    setFavoriteChecking(true);
    fetch(`/api/favorites?hotelCode=${encodeURIComponent(hotelCode)}`)
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setIsFavorite(false);
          setFavoriteChecking(false);
          return;
        }
        const data = (await response.json().catch(() => ({}))) as { isFavorite?: boolean };
        setIsFavorite(Boolean(data?.isFavorite));
        setFavoriteChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setIsFavorite(false);
        setFavoriteChecking(false);
      });

    return () => {
      active = false;
    };
  }, [authStatus, hotelCode]);

  const insurancePlans = useMemo<InsurancePlan[]>(
    () => [
      {
        id: "essential",
        title: t.hotel.addons.insurance.plans.essential.title,
        description: t.hotel.addons.insurance.plans.essential.description,
      },
      {
        id: "complete",
        title: t.hotel.addons.insurance.plans.complete.title,
        description: t.hotel.addons.insurance.plans.complete.description,
        highlight: t.hotel.addons.insurance.plans.complete.highlight,
      },
      {
        id: "premium",
        title: t.hotel.addons.insurance.plans.premium.title,
        description: t.hotel.addons.insurance.plans.premium.description,
      },
    ],
    [t.hotel.addons.insurance.plans]
  );

  const cabinClasses = useMemo(
    () => [
      { value: "economy", label: t.hotel.addons.flights.cabin.economy },
      { value: "premium", label: t.hotel.addons.flights.cabin.premium },
      { value: "business", label: t.hotel.addons.flights.cabin.business },
      { value: "first", label: t.hotel.addons.flights.cabin.first },
    ],
    [t.hotel.addons.flights.cabin]
  );

  const handleFavoriteToggle = useCallback(async () => {
    if (!hotelCode) return;
    if (authStatus === "loading") return;
    if (!isSignedIn) {
      const query = searchParams.toString();
      const callbackUrl = query ? `${pathname}?${query}` : pathname;
      void signIn("google", { callbackUrl });
      return;
    }

    setFavoritePending(true);
    try {
      const response = await postJson<{ isFavorite: boolean }>("/api/favorites", {
        hotelCode,
        name: hotelInfo?.name ?? null,
        city: hotelInfo?.address?.cityName ?? null,
        address: hotelInfo?.address?.line1 ?? null,
        imageUrl: hotelInfo?.imageUrl ?? hotelInfo?.imageUrls?.[0] ?? null,
        rating: hotelInfo?.rating ?? null,
        source: "aoryx",
      });
      setIsFavorite(Boolean(response.isFavorite));
    } catch (error) {
      console.error("[Favorites] Failed to toggle favorite", error);
    } finally {
      setFavoritePending(false);
    }
  }, [authStatus, hotelCode, hotelInfo, isSignedIn, pathname, searchParams]);

  const updateGuestField = useCallback(
    (roomIdentifier: number, guestId: string, field: keyof GuestForm, value: string | number) => {
      setBookingGuests((prev) =>
        prev.map((room) => {
          if (room.roomIdentifier !== roomIdentifier) return room;
          return {
            ...room,
            guests: room.guests.map((guest) =>
              guest.id === guestId
                ? {
                    ...guest,
                    [field]: field === "age" ? Number(value) : value,
                  }
                : guest
            ),
          };
        })
      );
    },
    []
  );

  const getFlightDetails = useCallback(
    (id: string): TransferFlightDetails =>
      transferFlightDetails[id] ?? { flightNumber: "", arrivalDateTime: "" },
    [transferFlightDetails]
  );

  const updateFlightDetails = useCallback(
    (id: string, field: keyof TransferFlightDetails, value: string) => {
      setTransferFlightDetails((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? { flightNumber: "", arrivalDateTime: "" }),
          [field]: value,
        },
      }));
      setTransferFieldErrors((prev) => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            [field]: undefined,
          },
        };
      });
    },
    []
  );

  const updateExcursionCount = useCallback(
    (id: string, field: keyof ExcursionSelectionState, delta: number) => {
      setExcursionSelections((prev) => {
        const current = prev[id] ?? { adults: 0, children: 0 };
        const max = field === "adults" ? adultGuests : childGuests;
        const nextValue = Math.max(0, Math.min(max, current[field] + delta));
        return {
          ...prev,
          [id]: {
            ...current,
            [field]: nextValue,
          },
        };
      });
    },
    [adultGuests, childGuests]
  );

  const applyExcursionToAll = useCallback(
    (id: string) => {
      setExcursionSelections((prev) => ({
        ...prev,
        [id]: {
          adults: adultGuests,
          children: childGuests,
        },
      }));
    },
    [adultGuests, childGuests]
  );

  const selectInsurancePlan = useCallback((plan: InsurancePlan) => {
    setInsuranceSelection((prev) => ({
      planId: plan.id,
      planName: plan.title,
      note: prev?.note ?? "",
      price: prev?.price ?? null,
      currency: prev?.currency ?? null,
    }));
  }, []);

  const updateInsuranceNote = useCallback((note: string) => {
    setInsuranceSelection((prev) => (prev ? { ...prev, note } : prev));
  }, []);

  const updateFlightRequest = useCallback(
    (field: keyof BookingAirTicketRequest, value: string) => {
      setFlightRequest((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const applyHotelSelection = useCallback(
    (nextHotel: PackageBuilderHotelSelection) => {
      updatePackageBuilderState((prev) => {
        const now = Date.now();
        const nextHotelKey = [
          nextHotel.hotelCode ?? "",
          nextHotel.destinationCode ?? "",
          nextHotel.checkInDate ?? "",
          nextHotel.checkOutDate ?? "",
          nextHotel.roomCount ?? "",
          nextHotel.guestCount ?? "",
          nextHotel.selectionKey ?? "",
        ].join("|");
        const prevHotelKey = prev.hotel
          ? [
              prev.hotel.hotelCode ?? "",
              prev.hotel.destinationCode ?? "",
              prev.hotel.checkInDate ?? "",
              prev.hotel.checkOutDate ?? "",
              prev.hotel.roomCount ?? "",
              prev.hotel.guestCount ?? "",
              prev.hotel.selectionKey ?? "",
            ].join("|")
          : "";
        const prevSessionActive =
          typeof prev.sessionExpiresAt === "number" && prev.sessionExpiresAt > now;
        const shouldStartSession = !prevSessionActive || prevHotelKey !== nextHotelKey;
        const shouldClearTransferByName =
          nextHotel.destinationName &&
          prev.transfer?.destinationName &&
          prev.transfer.destinationName !== nextHotel.destinationName;
        const shouldClearTransferByCode =
          !nextHotel.destinationName &&
          nextHotel.destinationCode &&
          prev.transfer?.destinationCode &&
          prev.transfer.destinationCode !== nextHotel.destinationCode;
        const shouldClearTransfer = Boolean(
          shouldClearTransferByName || shouldClearTransferByCode
        );
        return {
          ...prev,
          hotel: nextHotel,
          transfer: shouldClearTransfer ? undefined : prev.transfer,
          sessionExpiresAt: shouldStartSession
            ? now + PACKAGE_BUILDER_SESSION_MS
            : prev.sessionExpiresAt,
          updatedAt: now,
        };
      });
    },
    [updatePackageBuilderState]
  );

  const handlePrebook = useCallback(
    async (group: {
      key: string;
      option: AoryxRoomOption;
      items: AoryxRoomOption[];
      totalPrice: number | null;
      currency: string | null;
    }) => {
      if (!hotelCode) return;

      const rateKeys = group.items
        .map((item) => item.rateKey)
        .filter((key): key is string => typeof key === "string" && key.length > 0);
      if (rateKeys.length === 0 || rateKeys.length !== group.items.length) {
        setBookingError(t.hotel.errors.missingRateKeys);
        return;
      }

      const selectionDestinationName = hotelInfo?.address?.cityName ?? null;
      const selectionDestinationCode = destinationCode ?? null;
      const selectionCountryCode = parsed.payload?.countryCode ?? null;
      const selectionNationality = parsed.payload?.nationality ?? null;
      const selectionRooms = parsed.payload?.rooms ?? null;
      const selectionKey = rateKeys.join("|");
      const selectionPrice =
        typeof group.totalPrice === "number" && Number.isFinite(group.totalPrice)
          ? group.totalPrice
          : group.items.every((item) => typeof item.totalPrice === "number" && Number.isFinite(item.totalPrice))
            ? group.items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0)
            : null;
      const selectionCurrency = group.currency ?? fallbackCurrency ?? parsed.payload?.currency ?? null;
      const perRoomFallback =
        typeof selectionPrice === "number" && Number.isFinite(selectionPrice) && group.items.length > 0
          ? selectionPrice / group.items.length
          : null;
      const selectionRoomSelections = group.items.map((item, index) => {
        const gross = isFiniteNumber(item.price?.gross)
          ? item.price?.gross
          : isFiniteNumber(item.totalPrice)
            ? item.totalPrice
            : perRoomFallback;
        const net = isFiniteNumber(item.price?.net)
          ? item.price?.net
          : isFiniteNumber(item.totalPrice)
            ? item.totalPrice
            : perRoomFallback;
        const tax = isFiniteNumber(item.price?.tax) ? item.price?.tax : 0;
        const fallbackRoomIdentifier =
          typeof selectionRooms?.[index]?.roomIdentifier === "number"
            ? selectionRooms[index].roomIdentifier
            : index + 1;
        return {
          roomIdentifier:
            typeof item.roomIdentifier === "number" ? item.roomIdentifier : fallbackRoomIdentifier,
          rateKey: item.rateKey ?? "",
          price: {
            gross: gross ?? null,
            net: net ?? null,
            tax,
          },
        };
      });
      const roomCount = parsed.payload?.rooms?.length ?? null;
      const guestCount = parsed.payload?.rooms
        ? parsed.payload.rooms.reduce(
            (sum, room) => sum + room.adults + (Array.isArray(room.childrenAges) ? room.childrenAges.length : 0),
            0
          )
        : null;
      const checkInDate = parsed.payload?.checkInDate ?? null;
      const checkOutDate = parsed.payload?.checkOutDate ?? null;
      const nextHotel: PackageBuilderHotelSelection = {
        selected: true,
        hotelCode,
        hotelName: hotelInfo?.name ?? null,
        destinationName: selectionDestinationName,
        destinationCode: selectionDestinationCode,
        countryCode: selectionCountryCode,
        nationality: selectionNationality,
        checkInDate,
        checkOutDate,
        roomCount,
        guestCount,
        rooms: selectionRooms,
        roomSelections: selectionRoomSelections,
        price: selectionPrice,
        currency: selectionCurrency,
        selectionKey,
      };

      if (authStatus === "loading") {
        setBookingError(t.hotel.errors.checkingSignIn);
        return;
      }
      if (!isSignedIn) {
        const query = searchParams.toString();
        const callbackUrl = query ? `${pathname}?${query}` : pathname;
        setBookingError(t.hotel.errors.signInToBook);
        void signIn("google", { callbackUrl });
        return;
      }

      const prebookCurrency = fallbackCurrency ?? parsed.payload?.currency ?? "USD";
      setBookingPreparing(true);
      setPrebookingKey(group.key);
      setBookingError(null);
      setBookingResult(null);
      setConfirmPriceChange(false);
      setBookingOpen(false);
      setBookingGuests([]);
      setActivePrebook(null);
      setPendingHotelSelection(null);

      try {
        const result = await postJson<PrebookSummary>("/api/aoryx/prebook", {
          hotelCode,
          rateKeys,
          currency: prebookCurrency,
        });
        const mergedRooms = mergePrebookExtras(group.items, result.rooms);
        const guests = buildBookingGuests(mergedRooms, roomDetailsPayload?.rooms ?? null);
        if (guests.length === 0) {
          setBookingError(t.hotel.errors.unableBuildGuests);
          return;
        }
        setActivePrebook({
          rateKeys,
          isBookable: result.isBookable ?? null,
          isSoldOut: result.isSoldOut ?? null,
          isPriceChanged: result.isPriceChanged ?? null,
          currency: result.currency ?? prebookCurrency ?? null,
        });
        setPendingHotelSelection(nextHotel);
        setBookingGuests(guests);
        setBookingOpen(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : t.hotel.errors.prebookFailed;
        setBookingError(message);
      } finally {
        setBookingPreparing(false);
        setPrebookingKey(null);
      }
    },
    [
      authStatus,
      destinationCode,
      fallbackCurrency,
      hotelCode,
      hotelInfo?.address?.cityName,
      hotelInfo?.name,
      isSignedIn,
      parsed.payload?.checkInDate,
      parsed.payload?.checkOutDate,
      parsed.payload?.countryCode,
      parsed.payload?.nationality,
      parsed.payload?.currency,
      parsed.payload?.rooms,
      pathname,
      roomDetailsPayload?.rooms,
      searchParams,
      t,
    ]
  );

  const handleCloseBooking = useCallback(() => {
    setBookingOpen(false);
    setBookingError(null);
    setBookingResult(null);
    setActivePrebook(null);
    setBookingGuests([]);
    setConfirmPriceChange(false);
    setPendingHotelSelection(null);
    setBookingLoading(false);
    setBookingPreparing(false);
    setShowTransfers(false);
    setShowExcursions(false);
    setShowInsurance(false);
    setShowFlights(false);
    setTransferOptions([]);
    setTransferLoading(false);
    setTransferError(null);
    setSelectedTransferId(null);
    setIncludeReturnTransfer(false);
    setTransferFlightDetails({});
    setTransferVehicleQuantity({});
    setTransferFieldErrors({});
    setExcursionOptions([]);
    setExcursionLoading(false);
    setExcursionError(null);
    setExcursionSelections({});
    setExcursionFee(0);
    setInsuranceSelection(null);
    setFlightRequest({
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      cabinClass: "",
      notes: "",
    });
  }, []);

  const handleSelectRoom = useCallback(() => {
    if (!pendingHotelSelection) return;
    applyHotelSelection(pendingHotelSelection);
    openPackageBuilder();
    setPendingHotelSelection(null);
    handleCloseBooking();
  }, [applyHotelSelection, handleCloseBooking, pendingHotelSelection]);

  const handleBook = useCallback(async () => {
    if (!activePrebook || !hotelCode) return;
    if (authStatus === "loading") {
      setBookingError(t.hotel.errors.checkingSignIn);
      return;
    }
    if (!isSignedIn) {
      const query = searchParams.toString();
      const callbackUrl = query ? `${pathname}?${query}` : pathname;
      setBookingError(t.hotel.errors.signInToComplete);
      void signIn("google", { callbackUrl });
      return;
    }

    const guestError = validateBookingGuests(bookingGuests, t.hotel.errors);
    if (guestError) {
      setBookingError(guestError);
      return;
    }

    if (showTransfers) {
      if (!transferSelectionPayload) {
        setBookingError(t.hotel.addons.transfers.selectRequired);
        return;
      }
      const transferId = transferSelectionPayload.id ?? "transfer";
      const details = transferSelectionPayload.flightDetails ?? { flightNumber: "", arrivalDateTime: "" };
      const currentErrors: TransferFieldErrors[string] = {};
      const flightNumber = details.flightNumber?.trim() ?? "";
      const arrivalDateTime = details.arrivalDateTime?.trim() ?? "";

      if (!flightNumber) {
        currentErrors.flightNumber = t.hotel.addons.transfers.flightNumberRequired;
      }
      if (!arrivalDateTime) {
        currentErrors.arrivalDateTime = t.hotel.addons.transfers.arrivalRequired;
      }

      if (Object.keys(currentErrors).length > 0) {
        setTransferFieldErrors({ [transferId]: currentErrors });
        setBookingError(t.hotel.addons.transfers.detailsRequired);
        return;
      }
      setTransferFieldErrors({});
    }

    if (activePrebook.isPriceChanged && !confirmPriceChange) {
      setBookingError(t.hotel.errors.confirmPriceChange);
      return;
    }

    const destination =
      parsed.payload?.destinationCode ??
      destinationCode ??
      "";
    if (!destination) {
      setBookingError(t.hotel.errors.missingDestination);
      return;
    }

    let leadAssigned = false;
    const roomsPayload: AoryxBookingPayload["rooms"] = [];

    for (const room of bookingGuests) {
      if (!room.rateKey) {
        setBookingError(
          fillTemplate(t.hotel.errors.roomMissingRateKey, { room: room.roomIdentifier })
        );
        return;
      }

      const gross = isFiniteNumber(room.price.gross)
        ? room.price.gross
        : isFiniteNumber(room.price.net)
          ? room.price.net
          : null;
      const net = isFiniteNumber(room.price.net)
        ? room.price.net
        : isFiniteNumber(room.price.gross)
          ? room.price.gross
          : null;
      const tax = isFiniteNumber(room.price.tax) ? room.price.tax : 0;

      if (gross === null || net === null) {
        setBookingError(
          fillTemplate(t.hotel.errors.roomMissingPrice, { room: room.roomIdentifier })
        );
        return;
      }

      const guests = room.guests.map((guest) => {
        const isLeadGuest = !leadAssigned && guest.type === "Adult";
        if (isLeadGuest) {
          leadAssigned = true;
        }
        return {
          title: guest.title,
          titleCode: "",
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          isLeadGuest,
          type: guest.type,
          age: guest.age,
        };
      });

      const adults = guests.filter((guest) => guest.type === "Adult").length;
      const childrenAges = guests
        .filter((guest) => guest.type === "Child")
        .map((guest) => guest.age);

      roomsPayload.push({
        roomIdentifier: room.roomIdentifier,
        adults,
        childrenAges,
        rateKey: room.rateKey,
        guests,
        price: {
          gross,
          net,
          tax,
        },
      });
    }

    if (!leadAssigned && roomsPayload[0]?.guests[0]) {
      roomsPayload[0].guests[0].isLeadGuest = true;
    }

    const payload: BookingPayloadInput = {
      hotelCode,
      hotelName: hotelInfo?.name,
      checkInDate: parsed.payload?.checkInDate,
      checkOutDate: parsed.payload?.checkOutDate,
      destinationCode: destination,
      countryCode: parsed.payload?.countryCode ?? "AE",
      currency: bookingCurrency,
      nationality: parsed.payload?.nationality ?? "AM",
      customerRefNumber: `MEGA-${Date.now()}`,
      rooms: roomsPayload,
      transferSelection: transferSelectionPayload ?? undefined,
      excursions: excursionSelectionsPayload ?? undefined,
      insurance: insuranceSelectionPayload ?? undefined,
      airTickets: flightRequestPayload ?? undefined,
      acknowledgePriceChange: Boolean(confirmPriceChange),
    };

    setBookingLoading(true);
    setBookingError(null);
    setBookingResult(null);

    try {
      const requestPayload = { ...payload, locale };
      const checkout = await postJson<IdramCheckoutResponse>("/api/payments/idram/checkout", requestPayload);
      if (typeof document === "undefined") {
        throw new Error(t.hotel.errors.redirectPayment);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : t.hotel.errors.startPaymentFailed;
      setBookingError(message);
      setBookingLoading(false);
    }
  }, [
    activePrebook,
    authStatus,
    bookingCurrency,
    bookingGuests,
    confirmPriceChange,
    destinationCode,
    excursionSelectionsPayload,
    flightRequestPayload,
    hotelCode,
    hotelInfo?.name,
    insuranceSelectionPayload,
    isSignedIn,
    locale,
    pathname,
    parsed.payload?.checkInDate,
    parsed.payload?.checkOutDate,
    parsed.payload?.countryCode,
    parsed.payload?.destinationCode,
    parsed.payload?.nationality,
    searchParams,
    showTransfers,
    t,
    transferSelectionPayload,
  ]);

  return (
      <main
        className="details"
        style={{
          "--background-image": hotelInfo?.imageUrl ? `url(${hotelInfo.imageUrl})` : "none"
        } as React.CSSProperties}
      >
        <div className="container header">
          <section>
            <h1>{hotelInfo?.name}</h1>
            <span className="rating">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`material-symbols-rounded${i < roundedRating ? " fill" : ""}`}
                >
                  star
                </span>
              ))}
            </span>
            {hotelInfo?.address && (
              <p>{hotelInfo?.address?.line1}, {hotelInfo?.address?.cityName}</p>
            )}
            {(hotelInfo?.contact?.phone || hotelInfo?.contact?.website) && (
              <div>
                {hotelInfo?.contact?.phone &&(
                  <a href={`tel:${hotelInfo.contact.phone}`}>
                    <span className="material-symbols-rounded">phone</span>
                    {hotelInfo.contact.phone}
                  </a>
                )}
                {hotelInfo?.contact?.website && (
                  <a href={hotelInfo.contact.website} target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-rounded">language</span>
                    {hotelInfo.contact.website}
                  </a>
                )}
              </div>
            )}
            <div className="hotel-actions">
              {hotelCoordinates && mapEmbedSrc && (
                <button
                  type="button"
                  className="map-button"
                  popoverTarget={mapPopoverId}
                  aria-label={t.hotel.map.viewAria}
                >
                  <span className="material-symbols-rounded">map</span>
                  {t.hotel.map.showButton}
                </button>
              )}
              <button
                type="button"
                className="favorite-toggle"
                onClick={handleFavoriteToggle}
                aria-pressed={isFavorite}
                data-active={isFavorite ? "true" : "false"}
                disabled={favoriteDisabled}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  {favoriteIcon}
                </span>
                {favoriteLabel}
              </button>
            </div>
          </section>
          {typeof tripAdvisorRating === "number" && tripAdvisorRating > 0 && (
            <div className="tripadvisor">
              <svg xmlns="http://www.w3.org/2000/svg" width="125" height="31.923" viewBox="0 0 150 31.923"><path fillRule="evenodd" fill="#fff" d="M149.96 22.158c0 0.465 -0.376 0.845 -0.841 0.845s-0.845 -0.38 -0.845 -0.845 0.38 -0.841 0.845 -0.841 0.841 0.376 0.841 0.841M148.39 10.748h1.458V13.636h-1.708c-1.319 0 -2.164 0.648 -2.164 1.967v7.27h-3.125V10.748h3.125V12.787c0.277 -1.444 1.27 -2.039 2.414 -2.039m1.44 11.41c0 -0.389 -0.322 -0.706 -0.711 -0.706 -0.393 0 -0.711 0.317 -0.711 0.706s0.317 0.711 0.711 0.711c0.389 0 0.711 -0.322 0.711 -0.711m-0.572 0.076 0.152 0.304h-0.143l-0.139 -0.277h-0.143v0.277h-0.13v-0.769h0.268c0.161 0 0.268 0.094 0.268 0.246 0 0.103 -0.054 0.179 -0.134 0.219m-99.3 -11.486h1.462V13.636h-1.708c-1.319 0 -2.164 0.648 -2.164 1.967v7.27h-3.125V10.748h3.125V12.787c0.273 -1.444 1.265 -2.039 2.41 -2.039m6.282 -2.884c0 1.042 -0.823 1.887 -1.891 1.887s-1.887 -0.845 -1.887 -1.887c0 -1.073 0.818 -1.914 1.887 -1.914s1.891 0.841 1.891 1.914m-3.452 2.884h3.121v12.125h-3.121zm17.978 6.067c0 3.461 -2.808 6.268 -6.273 6.268 -1.395 0 -2.665 -0.456 -3.68 -1.23v4.587h-3.116v-15.693h3.116v1.028c1.015 -0.773 2.285 -1.23 3.68 -1.23 3.465 0 6.273 2.803 6.273 6.268m-3.139 0c0 -1.882 -1.525 -3.407 -3.407 -3.407s-3.407 1.525 -3.407 3.407c0 1.878 1.525 3.407 3.407 3.407s3.407 -1.525 3.407 -3.407m60.3 2.235c0 2.338 -2.007 4.037 -4.77 4.037 -2.87 0 -4.873 -1.739 -4.873 -4.23v-0.067h3.054v0.067c0 1.037 0.742 1.739 1.846 1.739 1.06 0 1.77 -0.519 1.77 -1.288 0 -0.729 -0.492 -1.136 -1.82 -1.502l-1.739 -0.474c-1.833 -0.496 -2.884 -1.69 -2.884 -3.273 0 -2.039 1.923 -3.514 4.569 -3.514 2.674 0 4.466 1.475 4.466 3.68v0.067h-2.875v-0.067c0 -0.751 -0.697 -1.332 -1.592 -1.332 -0.939 0 -1.592 0.429 -1.592 1.046 0 0.63 0.465 1.001 1.663 1.31l1.82 0.501c2.441 0.653 2.955 2.151 2.955 3.3M81.827 10.748h3.121v12.13h-3.121v-1.024c-1.015 0.773 -2.28 1.23 -3.68 1.23 -3.461 0 -6.268 -2.808 -6.268 -6.268 0 -3.465 2.808 -6.268 6.268 -6.268 1.399 0 2.665 0.456 3.68 1.23zm0 6.063c0 -1.878 -1.525 -3.402 -3.407 -3.402 -1.878 0 -3.402 1.525 -3.402 3.402 0 1.882 1.525 3.407 3.402 3.407 1.882 0 3.407 -1.525 3.407 -3.407m14.379 -10.377h3.121v16.444h-3.121v-1.024c-1.015 0.773 -2.28 1.23 -3.68 1.23 -3.461 0 -6.268 -2.808 -6.268 -6.268 0 -3.465 2.808 -6.268 6.268 -6.268 1.399 0 2.665 0.456 3.68 1.23zm0 10.382c0 -1.882 -1.525 -3.407 -3.402 -3.407 -1.882 0 -3.407 1.525 -3.407 3.407 0 1.878 1.525 3.407 3.407 3.407 1.878 0 3.402 -1.525 3.402 -3.407m17.602 -6.067h3.116v12.13h-3.116zm3.447 -2.884c0 1.046 -0.818 1.891 -1.891 1.891 -1.069 0 -1.887 -0.845 -1.887 -1.891 0 -1.069 0.818 -1.914 1.887 -1.914 1.073 0 1.891 0.845 1.891 1.914m24.152 8.951c0 3.461 -2.808 6.268 -6.268 6.268 -3.465 0 -6.268 -2.808 -6.268 -6.268 0 -3.465 2.803 -6.273 6.268 -6.273 3.461 0 6.268 2.808 6.268 6.273m-2.861 0c0 -1.882 -1.529 -3.407 -3.407 -3.407 -1.882 0 -3.407 1.525 -3.407 3.407 0 1.878 1.525 3.402 3.407 3.402 1.878 0 3.407 -1.52 3.407 -3.402m-92.593 -10.382v2.781h-4.426v13.663h-3.107V9.215h-4.431v-2.781zM109.225 10.748h3.277l-4.185 12.13h-3.756l-4.158 -12.13h3.273l2.776 8.808zm40.033 11.267c0 -0.08 -0.054 -0.125 -0.143 -0.125h-0.13v0.255h0.13c0.085 0 0.143 -0.045 0.143 -0.13"></path><path fill="#34e0a1" d="M15.948 31.9C7.131 31.9 0 24.769 0 15.948 0 7.131 7.131 0 15.948 0 24.769 0 31.9 7.131 31.9 15.948c0 8.821 -7.131 15.952 -15.952 15.952"></path><path fillRule="evenodd" d="M27.72 17.186c0 3.25 -2.638 5.884 -5.888 5.884 -1.542 0 -2.946 -0.595 -3.997 -1.565l-1.887 2.048 -1.882 -2.052c-1.051 0.975 -2.459 1.569 -4.001 1.569 -3.246 0 -5.879 -2.633 -5.879 -5.884 0 -1.721 0.738 -3.273 1.918 -4.346l-1.927 -2.097h4.279c2.133 -1.458 4.708 -2.307 7.493 -2.307 2.794 0 5.374 0.849 7.511 2.307h4.265l-1.923 2.097c1.18 1.073 1.918 2.624 1.918 4.346m-13.672 0c0 -2.2 -1.779 -3.979 -3.979 -3.979s-3.984 1.779 -3.984 3.979 1.784 3.984 3.984 3.984 3.979 -1.784 3.979 -3.984m6.322 -5.946c-1.359 -0.568 -2.852 -0.881 -4.422 -0.881 -1.565 0 -3.058 0.313 -4.417 0.881 2.517 0.961 4.422 3.21 4.422 5.83 0 -2.62 1.905 -4.864 4.417 -5.83m5.446 5.946c0 -2.2 -1.779 -3.979 -3.979 -3.979s-3.984 1.779 -3.984 3.979 1.784 3.984 3.984 3.984 3.979 -1.784 3.979 -3.984m-1.896 0c0 1.154 -0.93 2.083 -2.083 2.083s-2.088 -0.93 -2.088 -2.083 0.934 -2.088 2.088 -2.088 2.083 0.934 2.083 2.088m-11.768 0c0 1.154 -0.93 2.088 -2.083 2.088s-2.088 -0.934 -2.088 -2.088 0.934 -2.088 2.088 -2.088 2.083 0.934 2.083 2.088"></path></svg>
              {tripAdvisorRating.toFixed(1)}
            </div>
          )}
          {/* <button type="button" onClick={() => router.back()}>
            <span className="material-symbols-rounded">arrow_back</span>Go back
          </button> */}
        </div>

          {finalError && (
            <div className="results-error">
              <p>{finalError}</p>
              <div className="results-error-actions">
                <Link href="/" className="btn btn-primary">{t.common.backToSearch}</Link>
              </div>
            </div>
          )}

          {!finalError && galleryImages.length > 0 && (
              <ImageGallery
                images={galleryImages}
                altText={hotelInfo?.name ?? t.results.hotel.fallbackName}
              />
          )}

          {!finalError && (
            <div className="container">
              {hotelInfo?.masterHotelAmenities?.length ? (
                <div className="amenities-wrapper">
                  <h2>{t.hotel.amenities.title}</h2>
                  <div
                    ref={amenitiesRef}
                    className={`amenities${amenitiesExpanded ? " is-expanded" : ""}`}
                    id="hotel-amenities"
                  >
                    {hotelInfo.masterHotelAmenities.map((amenity, index) => (
                      <span key={`${amenity}-${index}`}>{amenity}</span>
                    ))}
                  </div>
                  {amenitiesOverflow && (
                    <button
                      type="button"
                      className="amenities-toggle"
                      aria-expanded={amenitiesExpanded}
                      aria-controls="hotel-amenities"
                      onClick={() => setAmenitiesExpanded((prev) => !prev)}
                    >
                      <span className="material-symbols-rounded">
                        {amenitiesExpanded ? "expand_less" : "expand_more"}
                      </span>
                      {amenitiesExpanded ? t.hotel.amenities.showLess : t.hotel.amenities.showAll}
                    </button>
                  )}
                </div>
              ) : null}
              <div className="search">
                <h2>{t.hotel.searchTitle}</h2>
                <SearchForm
                  copy={t.search}
                  hideLocationFields
                  presetDestination={presetDestination}
                  presetHotel={presetHotel}
                  initialDateRange={initialDateRange}
                  initialRooms={initialRooms}
                  showRoomCount
                  isSearchPending={roomsLoading}
                  onSubmitSearch={handleSearchSubmit}
                />
              </div>
            </div>
          )}

          {!finalError && (
            <div className="room-options">
              <div className="container">
                {roomsLoading && (
                  <Loader text={t.hotel.roomOptions.loading} />
                )}
                {roomDetailsPayload && !roomsLoading && roomsError && (
                  <div className="error-container">
                    <Image src="/images/icons/error.gif" alt={t.results.errorAlt} width={100} height={100} />
                    <p>{roomsError}</p>
                  </div>
                )}
                {roomDetailsPayload && !roomsLoading && !roomsError && groupedRoomOptions.length === 0 && (
                  // <p className="room-options-empty">{t.hotel.roomOptions.empty}</p>
                  <div className="results-empty">
                    <Image src="/images/icons/sad.gif" alt={t.results.emptyAlt} width={100} height={100} />
                    <p>{t.hotel.roomOptions.empty}</p>
                  </div>
                )}
                {roomDetailsPayload && !roomsLoading && !roomsError && groupedRoomOptions.length > 0 && (
                  <>
                    <div className="room-options-header">
                      <h2>
                        {formatPlural(visibleRoomOptions.length, t.hotel.roomOptions.count)}
                        {isFiltered && groupedRoomOptions.length !== visibleRoomOptions.length && (
                          <> {fillTemplate(t.hotel.roomOptions.of, { total: groupedRoomOptions.length })}</>
                        )}
                      </h2>
                      <div className="room-options-controls">
                        <label className="room-filter">
                          <span>{t.hotel.roomOptions.filterMeal}</span>
                          <select
                            value={mealFilter}
                            onChange={(event) => setMealFilter(event.target.value)}
                            disabled={mealOptions.length === 0}
                          >
                            <option value="all">{t.hotel.roomOptions.allMeals}</option>
                            {mealOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="room-filter">
                          <span>{t.hotel.roomOptions.filterPrice}</span>
                          <select
                            value={priceSort}
                            onChange={(event) =>
                              setPriceSort(event.target.value as "default" | "asc" | "desc")
                            }
                          >
                            <option value="default">{t.hotel.roomOptions.recommended}</option>
                            <option value="asc">{t.hotel.roomOptions.lowestPrice}</option>
                            <option value="desc">{t.hotel.roomOptions.highestPrice}</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    {!bookingOpen && bookingError && (
                      <p className="room-options-error booking-error">{bookingError}</p>
                    )}
                    {visibleRoomOptions.length === 0 ? (
                      <p className="room-options-empty">{t.hotel.roomOptions.noMatch}</p>
                    ) : (
                      <div className="room-options-list">
                        {visibleRoomOptions.map((group) => {
                          const price = formatDisplayPrice(
                            group.totalPrice,
                            group.currency ?? fallbackCurrency
                          );
                          const rateKeys = group.items
                            .map((item) => item.rateKey)
                            .filter((key): key is string => typeof key === "string" && key.length > 0);
                          const canBook = rateKeys.length > 0;
                          const isPrebooking = prebookingKey === group.key;
                          return (
                            <div key={group.key} className="room-card">
                              <div className="room-card-main">
                                <h3>{group.option.name ?? t.hotel.roomOptions.roomOptionFallback}</h3>
                                <div className="room-meta">
                                  {group.option.boardType && (
                                    <span className="room-chip">{group.option.boardType}</span>
                                  )}
                                  {group.option.refundable !== null && (
                                    <span
                                      className={`room-chip ${
                                        group.option.refundable ? "refundable" : "non-refundable"
                                      }`}
                                    >
                                      {group.option.refundable
                                        ? t.hotel.roomOptions.refundable
                                        : t.hotel.roomOptions.nonRefundable}
                                    </span>
                                  )}
                                  {typeof group.option.availableRooms === "number" && (
                                    <span className="room-chip">
                                      {formatPlural(group.option.availableRooms, t.hotel.roomOptions.roomsLeft)}
                                    </span>
                                  )}
                                </div>
                                {group.option.cancellationPolicy && (
                                  <p className="room-policy">{group.option.cancellationPolicy}</p>
                                )}
                              </div>
                              <div className="room-card-price">
                                {price ? (
                                  <span className="room-price">{price} <span>/ {night}</span></span>
                                ) : (
                                  <span className="room-price-muted">{t.common.contactForRates}</span>
                                )}
                                {roomCount > 1 && (
                                  <div className="room-breakdown">
                                    {group.items.map((item, itemIndex) => {
                                      const itemPrice = formatDisplayPrice(
                                        item.totalPrice,
                                        item.currency ?? group.currency ?? fallbackCurrency
                                      );
                                      return (
                                        <span
                                          key={`${group.key}-${itemIndex}`}
                                          className="room-breakdown-item"
                                        >
                                          {fillTemplate(t.hotel.roomOptions.roomBreakdown, {
                                            index: itemIndex + 1,
                                            price: itemPrice ?? t.common.contact,
                                          })}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="room-card-actions">
                                  <button
                                    type="button"
                                    className="room-book-button"
                                    disabled={(!canBook && isSignedIn) || bookingPreparing}
                                    onClick={() => handlePrebook(group)}
                                  >
                                    {!isSignedIn
                                      ? t.hotel.roomOptions.signInToBook
                                      : isPrebooking
                                      ? t.hotel.roomOptions.checkingAvailability
                                      : t.hotel.roomOptions.bookNow}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {bookingOpen && (
            <div
              id="booking-popover"
              popover="manual"
              className="popover booking-popover"
              ref={bookingPopoverRef}
              aria-busy={bookingLoading || bookingPreparing}
            >
              <h2>{hotelInfo?.name ?? t.hotel.booking.titleFallback}</h2>
              {bookingResult ? (
                <div className="booking-success">
                  <p>{t.hotel.booking.successMessage}</p>
                  {bookingResult.adsConfirmationNumber && (
                    <p>
                      {t.hotel.booking.confirmationNumberLabel}: {bookingResult.adsConfirmationNumber}
                    </p>
                  )}
                  {bookingResult.status && <p>{t.common.status}: {bookingResult.status}</p>}
                  <div className="booking-actions">
                    <button type="button" className="booking-primary" onClick={handleCloseBooking}>
                      {t.common.close}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="booking-body">
                  {bookingError && (
                    <div className="booking-error-overlay" role="alert" aria-live="assertive">
                      <div className="booking-error-card">
                        <span className="material-symbols-rounded" aria-hidden="true">
                          error
                        </span>
                        <p>{bookingError}</p>
                        <button type="button" className="booking-secondary" onClick={() => setBookingError(null)}>
                          {t.common.close}
                        </button>
                      </div>
                    </div>
                  )}
                  {activePrebook?.isPriceChanged && (
                    <p className="booking-warning">
                      {t.hotel.booking.priceChangeWarning}
                    </p>
                  )}
                  {bookingGuests.map((room) => (
                    <fieldset key={room.roomIdentifier} className="booking-room">
                      <legend>
                        Room {room.roomIdentifier}
                        {room.roomName ? ` · ${room.roomName}` : ""}
                      </legend>
                      <div className="booking-room-details">
                        <div className="booking-detail-grid">
                          {room.price && (
                            <span>
                              <span className="material-symbols-rounded" aria-hidden="true">attach_money</span>
                              {t.hotel.booking.roomPriceLabel}:{" "}
                              {formatDisplayPrice(room.price.net ?? room.price.gross, bookingCurrency) ?? t.common.contact}
                            </span>
                          )}
                          {room.meal && <span><span className="material-symbols-rounded" aria-hidden="true">restaurant</span>{t.hotel.booking.mealPlanLabel}: {room.meal}</span>}
                          {room.rateType && <span><span className="material-symbols-rounded" aria-hidden="true">star</span>{t.hotel.booking.rateTypeLabel}: {room.rateType}</span>}
                          {room.refundable !== null && (
                            <span>
                              <span className="material-symbols-rounded" aria-hidden="true">refund</span>
                              {room.refundable
                                ? t.hotel.roomOptions.refundable
                                : t.hotel.roomOptions.nonRefundable}
                            </span>
                          )}
                          {room.bedTypes.length > 0 && (
                            <span>
                              <span className="material-symbols-rounded" aria-hidden="true">bed</span>
                              {room.bedTypes.length > 1
                                ? t.hotel.booking.bedTypePlural
                                : t.hotel.booking.bedTypeSingle}
                              : {room.bedTypes.join(", ")}
                            </span>
                          )}
                          {room.inclusions.length > 0 && (
                            <span><span className="material-symbols-rounded" aria-hidden="true">local_offer</span>{t.hotel.booking.inclusionsLabel}: {room.inclusions.join(", ")}</span>
                          )}
                        </div>
                        {(room.policies.length > 0 || room.cancellationPolicy) && (
                          <div className="booking-policy">
                            {room.policies.length > 0 ? (
                              <div className="remark-grid">
                                {room.policies.map((policy, index) => {
                                  const meta = getPolicyMeta(
                                    policy.type,
                                    t.hotel.policies.types,
                                    t.hotel.policies.defaultLabel
                                  );
                                  const key = `${room.roomIdentifier}-policy-${index}`;
                                  return (
                                    <div key={key} className={`remark-card ${meta.variant}`}>
                                      <b className={`remark-chip ${meta.variant}`}>
                                        <span className="material-symbols-rounded" aria-hidden="true">
                                          {meta.icon}
                                        </span>
                                        {meta.label}
                                      </b>
                                      {policy.textCondition && (
                                        <p className="policy-summary">{policy.textCondition}</p>
                                      )}
                                      {policy.conditions.length > 0 ? (
                                        <ul className="policy-conditions">
                                          {policy.conditions.map((condition, conditionIndex) => (
                                            <li key={`${key}-condition-${conditionIndex}`}>
                                              {describePolicyCondition(
                                                condition,
                                                policy.currency ?? bookingCurrency,
                                                intlLocale,
                                                formatPlural,
                                                t.common.night,
                                                t.hotel.policy.freeCancellation,
                                                t.hotel.policy.from,
                                                t.hotel.policy.until,
                                                formatDisplayPrice
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="policy-summary">{t.hotel.booking.noPenaltyDetails}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="policy-summary">{room.cancellationPolicy}</p>
                            )}
                          </div>
                        )}
                        {room.remarks.length > 0 && (
                          <div className="booking-remarks">
                            <div className="remark-grid">
                              {room.remarks.map((remark, index) => {
                                const meta = getRemarkMeta(
                                  remark.type,
                                  t.hotel.remarks.types,
                                  t.hotel.remarks.defaultLabel
                                );
                                const key = `${room.roomIdentifier}-remark-${index}`;
                                return (
                                  <article key={key} className={`remark-card ${meta.variant}`}>
                                    <b className={`remark-chip ${meta.variant}`}>
                                      <span className="material-symbols-rounded" aria-hidden="true">
                                        {meta.icon}
                                      </span>
                                      {meta.label}
                                    </b>
                                    {remark.text ? (
                                      <div
                                        className="remark-text"
                                        dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(remark.text) }}
                                      />
                                    ) : (
                                      <p className="policy-summary">{t.hotel.booking.additionalInfo}</p>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </fieldset>
                  ))}
                  

                  <div className="booking-summary">
                    <div className="booking-summary-lines">
                      <div>
                        <span>{t.hotel.addons.summary.rooms}</span>
                        <strong>{formatDisplayPrice(roomsTotal, bookingCurrency) ?? t.common.contact}</strong>
                      </div>
                    </div>
                    <div className="booking-summary-total">
                      <span>{t.common.total}:</span>
                      <strong>
                        {formatDisplayPrice(roomsTotal, bookingCurrency) ?? t.common.contact}
                      </strong>
                    </div>
                  </div>
                  {/* <p className="booking-note">
                    {t.hotel.booking.paymentNote}
                  </p> */}
                  <div className="booking-actions">
                    <button
                      type="button"
                      className="booking-secondary"
                      onClick={handleCloseBooking}
                      disabled={bookingLoading}
                    >
                      {t.common.close}
                    </button>
                    <button
                      type="button"
                      className="booking-primary"
                      onClick={handleSelectRoom}
                      disabled={!pendingHotelSelection || bookingPreparing}
                    >
                      {t.hotel.booking.selectRoom}
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="close"
                onClick={handleCloseBooking}
                aria-label={t.hotel.booking.closeBookingAria}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          )}

          {hotelCoordinates && mapEmbedSrc && (
            <div id={mapPopoverId} popover="auto" className="popover">
              <h2>{t.hotel.map.title}</h2>
              <iframe
                title={t.hotel.map.iframeTitle}
                src={mapEmbedSrc}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                aria-label={t.hotel.map.ariaLabel}
              />
              <button
                type="button"
                className="close"
                popoverTarget={mapPopoverId}
                popoverTargetAction="hide"
                aria-label={t.hotel.map.closeLabel}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          )}
      </main>
  );
}
