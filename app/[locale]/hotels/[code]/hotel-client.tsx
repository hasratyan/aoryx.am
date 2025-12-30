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
import { convertToAmd, useAmdRates, type AmdRates } from "@/lib/use-amd-rates";
import Image from "next/image";
import ImageGallery from "./ImageGallery";
import { updatePackageBuilderState } from "@/lib/package-builder-state";
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

function formatPrice(value: number | null, currency: string | null, locale: string): string | null {
  if (value === null || value === undefined) return null;
  const safeCurrency = (currency ?? "USD").trim().toUpperCase();
  try {
    const formattedNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    if (safeCurrency === "AMD") return `${formattedNumber} ֏`;
    if (safeCurrency === "USD") return `$${formattedNumber}`;
    if (safeCurrency === "EUR") return `€${formattedNumber}`;
    return `${formattedNumber} ${safeCurrency}`;
  } catch {
    return `${value} ${safeCurrency} `;
  }
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
  initialAmdRates?: { USD: number; EUR: number } | null;
  initialTransferRates?: { USD: number; EUR: number } | null;
  initialTransferOptions?: AoryxTransferRate[] | null;
  initialTransferError?: string | null;
  initialExcursionOptions?: AoryxExcursionTicket[] | null;
  initialExcursionError?: string | null;
  initialExcursionFee?: number | null;
  initialExcursionRates?: { USD: number; EUR: number } | null;
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
  initialTransferRates,
  initialTransferOptions = null,
  initialTransferError = null,
  initialExcursionOptions = null,
  initialExcursionError = null,
  initialExcursionFee = null,
  initialExcursionRates = null,
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
  const { rates: amdRates } = useAmdRates(initialAmdRates);
  const { rates: transferRates } = useAmdRates(initialTransferRates, {
    endpoint: "/api/utils/exchange-rates?scope=transfers",
  });
  const { rates: excursionRates } = useAmdRates(initialExcursionRates, {
    endpoint: "/api/utils/exchange-rates?scope=excursions",
  });

  const formatDisplayPrice = useCallback(
    (
      amount: number | null | undefined,
      currency: string | null | undefined,
      ratesOverride?: AmdRates | null
    ) => {
      if (amount === null || amount === undefined) return null;
      const baseCurrency = currency ?? "USD";
      const activeRates = ratesOverride === undefined ? amdRates : ratesOverride;
      const converted = activeRates ? convertToAmd(amount, baseCurrency, activeRates) : null;
      const displayAmount = converted ?? amount;
      if (displayAmount === null) return null;
      const displayCurrency = activeRates && converted !== null ? "AMD" : baseCurrency;
      return formatPrice(displayAmount, displayCurrency, intlLocale);
    },
    [amdRates, intlLocale]
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
  const destinationCode = parsed.payload?.destinationCode ?? searchParams.get("destinationCode") ?? undefined;

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
  const amenitiesRef = useRef<HTMLDivElement | null>(null);
  const bookingPopoverRef = useRef<HTMLDivElement | null>(null);
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
  const packageTotal =
    roomsTotal !== null
      ? roomsTotal + transferTotalPrice + excursionsTotal + insuranceTotal + flightsTotal
      : null;
  const transferDisplayTotal =
    transferTotalPrice > 0
      ? formatDisplayPrice(
          transferTotalPrice,
          selectedTransfer?.pricing?.currency ?? bookingCurrency,
          transferRates ?? null
        )
      : null;
  const excursionRatesForDisplay = excursionRates ?? amdRates;
  const excursionsDisplayTotal =
    excursionsTotal > 0
      ? formatDisplayPrice(
          excursionsTotal,
          excursionSelectionsPayload?.selections[0]?.currency ?? bookingCurrency,
          excursionRatesForDisplay
        )
      : null;

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
  const handleSearchSubmit = useCallback(
    (payload: { hotelCode?: string }, params: URLSearchParams) => {
      setRoomsLoading(true);
      setRoomsError(null);
      setRoomOptions([]);
      const resolvedHotelCode = payload.hotelCode ?? hotelCode ?? undefined;
      if (resolvedHotelCode) {
        params.set("hotelCode", resolvedHotelCode);
      }
      const query = params.toString();
      const nextHref = query ? `${pathname}?${query}` : pathname;
      router.replace(nextHref);
    },
    [hotelCode, pathname, router]
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

  const handlePrebook = useCallback(
    async (group: { key: string; option: AoryxRoomOption; items: AoryxRoomOption[] }) => {
      if (!hotelCode) return;

      const rateKeys = group.items
        .map((item) => item.rateKey)
        .filter((key): key is string => typeof key === "string" && key.length > 0);
      if (rateKeys.length === 0) {
        setBookingError(t.hotel.errors.missingRateKeys);
        return;
      }

      const selectionDestinationName = hotelInfo?.address?.cityName ?? null;
      const selectionDestinationCode = destinationCode ?? null;
      updatePackageBuilderState((prev) => {
        const nextHotel = {
          selected: true,
          hotelCode,
          hotelName: hotelInfo?.name ?? null,
          destinationName: selectionDestinationName,
          destinationCode: selectionDestinationCode,
        };
        const shouldClearTransferByName =
          selectionDestinationName &&
          prev.transfer?.destinationName &&
          prev.transfer.destinationName !== selectionDestinationName;
        const shouldClearTransferByCode =
          !selectionDestinationName &&
          selectionDestinationCode &&
          prev.transfer?.destinationCode &&
          prev.transfer.destinationCode !== selectionDestinationCode;
        const shouldClearTransfer = Boolean(
          shouldClearTransferByName || shouldClearTransferByCode
        );
        return {
          ...prev,
          hotel: nextHotel,
          transfer: shouldClearTransfer ? undefined : prev.transfer,
          updatedAt: Date.now(),
        };
      });

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
      parsed.payload?.currency,
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
      const checkout = await postJson<IdramCheckoutResponse>("/api/payments/idram/checkout", payload);
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
                  onSubmitSearch={handleSearchSubmit}
                />
              </div>
            </div>
          )}

          {!finalError && (
            <div className="room-options">
              <div className="container">
                {roomDetailsPayload && roomsLoading && (
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
                  {activePrebook?.isPriceChanged && (
                    <label className="booking-confirm">
                      <input
                        type="checkbox"
                        checked={confirmPriceChange}
                        onChange={(event) => setConfirmPriceChange(event.target.checked)}
                      />
                      {t.hotel.booking.priceChangeConfirm}
                    </label>
                  )}
                  {bookingGuests.map((room) => (
                    <fieldset key={room.roomIdentifier} className="booking-room">
                      <legend>
                        Room {room.roomIdentifier}
                        {room.roomName ? ` · ${room.roomName}` : ""}
                      </legend>
                      {room.guests.map((guest) => (
                        <div key={guest.id} className="booking-guest">
                          <select
                            value={guest.title}
                            onChange={(event) =>
                              updateGuestField(room.roomIdentifier, guest.id, "title", event.target.value)
                            }
                          >
                            <option value="Mr.">{t.hotel.booking.titles.mr}</option>
                            <option value="Ms.">{t.hotel.booking.titles.ms}</option>
                            <option value="Mrs.">{t.hotel.booking.titles.mrs}</option>
                            {guest.type === "Child" && (
                              <option value="Master">{t.hotel.booking.titles.master}</option>
                            )}
                          </select>
                          <input
                            type="text"
                            placeholder={t.hotel.booking.firstNamePlaceholder}
                            value={guest.firstName}
                            onChange={(event) =>
                              updateGuestField(room.roomIdentifier, guest.id, "firstName", event.target.value)
                            }
                          />
                          <input
                            type="text"
                            placeholder={t.hotel.booking.lastNamePlaceholder}
                            value={guest.lastName}
                            onChange={(event) =>
                              updateGuestField(room.roomIdentifier, guest.id, "lastName", event.target.value)
                            }
                          />
                          <input
                            type="number"
                            min={guest.type === "Adult" ? 18 : 0}
                            max={guest.type === "Adult" ? 99 : 17}
                            value={guest.age}
                            readOnly={guest.type === "Child"}
                            onChange={(event) =>
                              updateGuestField(room.roomIdentifier, guest.id, "age", event.target.value)
                            }
                          />
                        </div>
                      ))}
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
                            <h4>{t.hotel.booking.cancellationPolicyTitle}</h4>
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
                            <h4>{t.hotel.booking.remarksTitle}</h4>
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
                  <section className="booking-addons">
                    <div className="booking-addons-header">
                      <div>
                        <h3>{t.hotel.addons.title}</h3>
                        <p>{t.hotel.addons.subtitle}</p>
                      </div>
                      <span className="booking-addons-chip">{t.hotel.addons.badge}</span>
                    </div>
                    <div className="booking-addons-grid">
                      <button
                        type="button"
                        className={`transfers addon-card${showTransfers ? " active" : ""}`}
                        onClick={() => setShowTransfers((prev) => !prev)}
                        aria-pressed={showTransfers}
                      >
                        <div className="addon-card-main">
                          <span className="material-symbols-rounded" aria-hidden="true">
                            airport_shuttle
                          </span>
                          <div>
                            <h4>{t.hotel.addons.transfers.title}</h4>
                            <p>{t.hotel.addons.transfers.description}</p>
                          </div>
                        </div>
                        <div className="addon-card-meta">
                          {transferDisplayTotal && <strong>{transferDisplayTotal}</strong>}
                          <span className="addon-card-action">
                            {showTransfers ? t.hotel.addons.actions.remove : t.hotel.addons.actions.add}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`excursions addon-card${showExcursions ? " active" : ""}`}
                        onClick={() => setShowExcursions((prev) => !prev)}
                        aria-pressed={showExcursions}
                      >
                        <div className="addon-card-main">
                          <span className="material-symbols-rounded" aria-hidden="true">
                            attractions
                          </span>
                          <div>
                            <h4>{t.hotel.addons.excursions.title}</h4>
                            <p>{t.hotel.addons.excursions.description}</p>
                          </div>
                        </div>
                        <div className="addon-card-meta">
                          {excursionsDisplayTotal && <strong>{excursionsDisplayTotal}</strong>}
                          <span className="addon-card-action">
                            {showExcursions ? t.hotel.addons.actions.remove : t.hotel.addons.actions.add}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`insurance addon-card${showInsurance ? " active" : ""}`}
                        onClick={() => setShowInsurance((prev) => !prev)}
                        aria-pressed={showInsurance}
                      >
                        <div className="addon-card-main">
                          <span className="material-symbols-rounded" aria-hidden="true">
                            shield_with_heart
                          </span>
                          <div>
                            <h4>{t.hotel.addons.insurance.title}</h4>
                            <p>{t.hotel.addons.insurance.description}</p>
                          </div>
                        </div>
                        <div className="addon-card-meta">
                          {insuranceSelection?.planName && <strong>{insuranceSelection.planName}</strong>}
                          <span className="addon-card-action">
                            {showInsurance ? t.hotel.addons.actions.remove : t.hotel.addons.actions.add}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`flights addon-card${showFlights ? " active" : ""}`}
                        onClick={() => setShowFlights((prev) => !prev)}
                        aria-pressed={showFlights}
                      >
                        <div className="addon-card-main">
                          <span className="material-symbols-rounded" aria-hidden="true">
                            flight
                          </span>
                          <div>
                            <h4>{t.hotel.addons.flights.title}</h4>
                            <p>{t.hotel.addons.flights.description}</p>
                          </div>
                        </div>
                        <div className="addon-card-meta">
                          {flightRequestPayload && <strong>{t.hotel.addons.status.requested}</strong>}
                          <span className="addon-card-action">
                            {showFlights ? t.hotel.addons.actions.remove : t.hotel.addons.actions.add}
                          </span>
                        </div>
                      </button>
                    </div>

                    {showTransfers && (
                      <div className="addon-panel transfer-panel">
                        <div className="addon-panel-head">
                          <h4>
                            <span className="material-symbols-rounded" aria-hidden="true">
                              airport_shuttle
                            </span>
                            {t.hotel.addons.transfers.panelTitle}
                          </h4>
                          <div className="addon-panel-meta">
                            <span className="addon-pill">
                              <span className="material-symbols-rounded" aria-hidden="true">
                                group
                              </span>
                              {transferPaxCount ?? "—"} {t.hotel.addons.transfers.paxLabel}
                            </span>
                            <label className="addon-toggle">
                              <input
                                type="checkbox"
                                checked={includeReturnTransfer}
                                onChange={(event) => setIncludeReturnTransfer(event.target.checked)}
                              />
                              <span>{t.hotel.addons.transfers.includeReturn}</span>
                            </label>
                          </div>
                        </div>
                        {transferLoading && (
                          <p className="addon-state">{t.hotel.addons.transfers.loading}</p>
                        )}
                        {!transferLoading && transferError && (
                          <p className="addon-state error">{transferError}</p>
                        )}
                        {!transferLoading && !transferError && transferOptionsWithId.length === 0 && (
                          <p className="addon-state">{t.hotel.addons.transfers.noOptions}</p>
                        )}
                        {!transferLoading && !transferError && transferOptionsWithId.length > 0 && (
                          <div className="transfer-options">
                            {transferOptionsWithId.map((transfer) => {
                              const id = transfer.id;
                              const isSelected = selectedTransferId === id;
                              const chargeType = transfer.pricing?.chargeType ?? "PER_PAX";
                              const minPax = transfer.paxRange?.minPax ?? 1;
                              const paxForCalc =
                                chargeType === "PER_PAX"
                                  ? Math.max(transferPaxCount ?? minPax, minPax)
                                  : 1;
                              const vehicleQty = transferVehicleQuantity[id] ?? 1;
                              const multiplier = chargeType === "PER_PAX" ? paxForCalc : vehicleQty;
                              const oneWay = toNumberValue(transfer.pricing?.oneWay) ?? 0;
                              const perDirection = oneWay * multiplier;
                              const totalPrice = includeReturnTransfer ? perDirection * 2 : perDirection;
                              const priceCurrency = transfer.pricing?.currency ?? bookingCurrency;
                              const flightDetails = getFlightDetails(id);
                              return (
                                <div key={id} className={`transfer-option${isSelected ? " selected" : ""}`}>
                                  <label className="transfer-option-card">
                                    <input
                                      type="radio"
                                      name="transfer-option"
                                      checked={isSelected}
                                      onChange={() => setSelectedTransferId(id)}
                                    />
                                    <div>
                                      <div className="transfer-badges">
                                        <span className="primary">{transfer.transferType ?? "Transfer"}</span>
                                        <span className="subtle">
                                          {chargeType === "PER_PAX"
                                            ? t.hotel.addons.transfers.perPax
                                            : t.hotel.addons.transfers.perVehicle}
                                        </span>
                                        {transfer.bothDirections && (
                                          <span className="subtle">{t.hotel.addons.transfers.bothWays}</span>
                                        )}
                                      </div>
                                      <div className="transfer-route">
                                        <b>{transfer.origin?.name ?? transfer.origin?.locationCode}</b>
                                        <span className="material-symbols-rounded" aria-hidden="true">
                                          arrow_forward
                                        </span>
                                        <b>{transfer.destination?.name ?? transfer.destination?.locationCode}</b>
                                      </div>
                                      <div className="transfer-price">
                                        <strong>
                                          {formatDisplayPrice(totalPrice, priceCurrency, transferRates ?? null) ??
                                            t.common.contact}
                                        </strong>
                                        <span>
                                          {includeReturnTransfer
                                            ? t.hotel.addons.transfers.returnTotal
                                            : t.hotel.addons.transfers.oneWayTotal}
                                        </span>
                                      </div>
                                      <div className="transfer-meta">
                                        {transfer.vehicle?.name && (
                                          <span>
                                            <span className="material-symbols-rounded" aria-hidden="true">
                                              directions_car
                                            </span>
                                            {transfer.vehicle.name}
                                          </span>
                                        )}
                                        {transfer.paxRange?.minPax && transfer.paxRange?.maxPax && (
                                          <span>
                                            <span className="material-symbols-rounded" aria-hidden="true">
                                              groups
                                            </span>
                                            {transfer.paxRange.minPax} - {transfer.paxRange.maxPax} {t.hotel.addons.transfers.paxLabel}
                                          </span>
                                        )}
                                        {transfer.vehicle?.maxBags ? (
                                          <span>
                                            <span className="material-symbols-rounded" aria-hidden="true">
                                              work
                                            </span>
                                            {transfer.vehicle.maxBags} {t.hotel.addons.transfers.bagsLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </label>
                                  {isSelected && (
                                    <div className="transfer-details">
                                      <div className="addon-field">
                                        <span>{t.hotel.addons.transfers.flightNumber}</span>
                                        <input
                                          type="text"
                                          value={flightDetails.flightNumber}
                                          onChange={(event) =>
                                            updateFlightDetails(id, "flightNumber", event.target.value)
                                          }
                                          className={transferFieldErrors[id]?.flightNumber ? "error" : undefined}
                                        />
                                        {transferFieldErrors[id]?.flightNumber && (
                                          <span className="field-error">
                                            {transferFieldErrors[id]?.flightNumber}
                                          </span>
                                        )}
                                      </div>
                                      <div className="addon-field">
                                        <span>{t.hotel.addons.transfers.arrivalDate}</span>
                                        <input
                                          type="datetime-local"
                                          value={flightDetails.arrivalDateTime}
                                          onChange={(event) =>
                                            updateFlightDetails(id, "arrivalDateTime", event.target.value)
                                          }
                                          className={transferFieldErrors[id]?.arrivalDateTime ? "error" : undefined}
                                        />
                                        {transferFieldErrors[id]?.arrivalDateTime && (
                                          <span className="field-error">
                                            {transferFieldErrors[id]?.arrivalDateTime}
                                          </span>
                                        )}
                                      </div>
                                      {chargeType !== "PER_PAX" && (
                                        <div className="addon-field">
                                          <span>{t.hotel.addons.transfers.vehicleQty}</span>
                                          <input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={transferVehicleQuantity[id] ?? 1}
                                            onChange={(event) => {
                                              const next = parseInt(event.target.value, 10);
                                              setTransferVehicleQuantity((prev) => ({
                                                ...prev,
                                                [id]: Number.isFinite(next) && next > 0 ? next : 1,
                                              }));
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {showExcursions && (
                      <div className="addon-panel excursions-panel">
                        <div className="addon-panel-head">
                          <h4>
                            <span className="material-symbols-rounded" aria-hidden="true">
                              attractions
                            </span>
                            {t.hotel.addons.excursions.panelTitle}
                          </h4>
                          <div className="addon-panel-meta">
                            <span className="addon-pill">
                              {t.hotel.addons.excursions.adultsLabel}: {adultGuests}
                            </span>
                            <span className="addon-pill">
                              {t.hotel.addons.excursions.childrenLabel}: {childGuests}
                            </span>
                            {excursionFee > 0 && (
                              <span className="addon-pill subtle">
                                {t.hotel.addons.excursions.feeNote}
                              </span>
                            )}
                          </div>
                        </div>
                        {excursionLoading && (
                          <p className="addon-state">{t.hotel.addons.excursions.loading}</p>
                        )}
                        {!excursionLoading && excursionError && (
                          <p className="addon-state error">{excursionError}</p>
                        )}
                        {!excursionLoading && !excursionError && excursionOptionsWithId.length === 0 && (
                          <p className="addon-state">{t.hotel.addons.excursions.noOptions}</p>
                        )}
                        {!excursionLoading && !excursionError && excursionOptionsWithId.length > 0 && (
                          <div className="excursion-options">
                            {excursionOptionsWithId.map((excursion) => {
                              const selection = excursionSelections[excursion.id] ?? { adults: 0, children: 0 };
                              const adultPrice = toNumberValue(excursion.pricing?.adult);
                              const childPrice = toNumberValue(excursion.pricing?.child) ?? adultPrice;
                              const priceCurrency = excursion.pricing?.currency ?? bookingCurrency;
                              const totalPrice =
                                (adultPrice ?? 0) * selection.adults + (childPrice ?? 0) * selection.children;
                              return (
                                <div key={excursion.id} className="excursion-option">
                                  <div className="excursion-info">
                                    <div>
                                      <h5>{excursion.name ?? t.hotel.addons.excursions.unnamed}</h5>
                                      {excursion.description && (
                                        <p>{excursion.description}</p>
                                      )}
                                    </div>
                                    {excursion.childPolicy && (
                                      <span className="excursion-policy">
                                        {excursion.childPolicy}
                                      </span>
                                    )}
                                  </div>
                                  <div className="excursion-controls">
                                    <div className="excursion-pricing">
                                      <span>
                                        {t.hotel.addons.excursions.adultPrice}:{" "}
                                        {formatDisplayPrice(
                                          adultPrice,
                                          priceCurrency,
                                          excursionRatesForDisplay
                                        ) ?? t.common.contact}
                                      </span>
                                      <span>
                                        {t.hotel.addons.excursions.childPrice}:{" "}
                                        {formatDisplayPrice(
                                          childPrice,
                                          priceCurrency,
                                          excursionRatesForDisplay
                                        ) ?? t.common.contact}
                                      </span>
                                      {totalPrice > 0 && (
                                        <strong>
                                          {t.hotel.addons.excursions.totalLabel}:{" "}
                                          {formatDisplayPrice(
                                            totalPrice,
                                            priceCurrency,
                                            excursionRatesForDisplay
                                          ) ?? t.common.contact}
                                        </strong>
                                      )}
                                    </div>
                                    <div className="excursion-counter">
                                      <span>{t.hotel.addons.excursions.adultsLabel}</span>
                                      <div className="counter">
                                        <button
                                          type="button"
                                          onClick={() => updateExcursionCount(excursion.id, "adults", -1)}
                                          disabled={selection.adults === 0}
                                        >
                                          -
                                        </button>
                                        <span>{selection.adults}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateExcursionCount(excursion.id, "adults", 1)}
                                          disabled={selection.adults >= adultGuests}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div className="excursion-counter">
                                      <span>{t.hotel.addons.excursions.childrenLabel}</span>
                                      <div className="counter">
                                        <button
                                          type="button"
                                          onClick={() => updateExcursionCount(excursion.id, "children", -1)}
                                          disabled={selection.children === 0}
                                        >
                                          -
                                        </button>
                                        <span>{selection.children}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateExcursionCount(excursion.id, "children", 1)}
                                          disabled={selection.children >= childGuests}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    {(adultGuests > 0 || childGuests > 0) && (
                                      <button
                                        type="button"
                                        className="apply-all"
                                        onClick={() => applyExcursionToAll(excursion.id)}
                                      >
                                        {t.hotel.addons.excursions.applyAll}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {showInsurance && (
                      <div className="addon-panel insurance-panel">
                        <div className="addon-panel-head">
                          <h4>
                            <span className="material-symbols-rounded" aria-hidden="true">
                              shield_with_heart
                            </span>
                            {t.hotel.addons.insurance.panelTitle}
                          </h4>
                        </div>
                        <div className="insurance-options">
                          {insurancePlans.map((plan) => {
                            const isSelected = insuranceSelection?.planId === plan.id;
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                className={`insurance-card${isSelected ? " selected" : ""}`}
                                onClick={() => selectInsurancePlan(plan)}
                              >
                                {plan.highlight && <span className="pill">{plan.highlight}</span>}
                                <h5>{plan.title}</h5>
                                <p>{plan.description}</p>
                              </button>
                            );
                          })}
                        </div>
                        <div className="addon-field">
                          <span>{t.hotel.addons.insurance.noteLabel}</span>
                          <textarea
                            value={insuranceSelection?.note ?? ""}
                            placeholder={t.hotel.addons.insurance.notePlaceholder}
                            onChange={(event) => updateInsuranceNote(event.target.value)}
                            disabled={!insuranceSelection}
                          />
                        </div>
                      </div>
                    )}

                    {showFlights && (
                      <div className="addon-panel flights-panel">
                        <div className="addon-panel-head">
                          <h4>
                            <span className="material-symbols-rounded" aria-hidden="true">
                              flight
                            </span>
                            {t.hotel.addons.flights.panelTitle}
                          </h4>
                        </div>
                        <div className="addon-form-grid">
                          <label className="addon-field">
                            <span>{t.hotel.addons.flights.originLabel}</span>
                            <input
                              type="text"
                              value={flightRequest.origin ?? ""}
                              onChange={(event) => updateFlightRequest("origin", event.target.value)}
                            />
                          </label>
                          <label className="addon-field">
                            <span>{t.hotel.addons.flights.destinationLabel}</span>
                            <input
                              type="text"
                              value={flightRequest.destination ?? ""}
                              onChange={(event) => updateFlightRequest("destination", event.target.value)}
                            />
                          </label>
                          <label className="addon-field">
                            <span>{t.hotel.addons.flights.departureLabel}</span>
                            <input
                              type="date"
                              value={flightRequest.departureDate ?? ""}
                              onChange={(event) => updateFlightRequest("departureDate", event.target.value)}
                            />
                          </label>
                          <label className="addon-field">
                            <span>{t.hotel.addons.flights.returnLabel}</span>
                            <input
                              type="date"
                              value={flightRequest.returnDate ?? ""}
                              onChange={(event) => updateFlightRequest("returnDate", event.target.value)}
                            />
                          </label>
                          <label className="addon-field">
                            <span>{t.hotel.addons.flights.cabinLabel}</span>
                            <select
                              value={flightRequest.cabinClass ?? ""}
                              onChange={(event) => updateFlightRequest("cabinClass", event.target.value)}
                            >
                              <option value="">{t.hotel.addons.flights.cabinPlaceholder}</option>
                              {cabinClasses.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="addon-field full">
                            <span>{t.hotel.addons.flights.notesLabel}</span>
                            <textarea
                              value={flightRequest.notes ?? ""}
                              placeholder={t.hotel.addons.flights.notesPlaceholder}
                              onChange={(event) => updateFlightRequest("notes", event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </section>

                  <div className="booking-summary">
                    <div className="booking-summary-lines">
                      <div>
                        <span>{t.hotel.addons.summary.rooms}</span>
                        <strong>{formatDisplayPrice(roomsTotal, bookingCurrency) ?? t.common.contact}</strong>
                      </div>
                      {transferSelectionPayload && (
                        <div>
                          <span>{t.hotel.addons.summary.transfers}</span>
                          <strong>{transferDisplayTotal ?? t.common.contact}</strong>
                        </div>
                      )}
                      {excursionSelectionsPayload && (
                        <div>
                          <span>{t.hotel.addons.summary.excursions}</span>
                          <strong>{excursionsDisplayTotal ?? t.common.contact}</strong>
                        </div>
                      )}
                      {insuranceSelectionPayload && (
                        <div>
                          <span>{t.hotel.addons.summary.insurance}</span>
                          <strong>{insuranceSelectionPayload.planName ?? t.hotel.addons.summary.requested}</strong>
                        </div>
                      )}
                      {flightRequestPayload && (
                        <div>
                          <span>{t.hotel.addons.summary.flights}</span>
                          <strong>{t.hotel.addons.summary.requested}</strong>
                        </div>
                      )}
                    </div>
                    <div className="booking-summary-total">
                      <span>{t.common.total}:</span>
                      <strong>
                        {formatDisplayPrice(packageTotal, bookingCurrency) ?? t.common.contact}
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
                      onClick={handleBook}
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? t.hotel.booking.redirectingToIdram : t.hotel.booking.payWithIdram}
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
