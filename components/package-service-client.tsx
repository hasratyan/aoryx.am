"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { DateRange, type Range, type RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import type { Locale as DateFnsLocale } from "date-fns";
import { enGB, hy, ru } from "date-fns/locale";
import Loader from "@/components/loader";
import SearchForm from "@/components/search-form";
import { useLanguage } from "@/components/language-provider";
import type { Locale as AppLocale, PluralForms } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import { mapEfesErrorMessage } from "@/lib/efes-errors";
import { postJson } from "@/lib/api-helpers";
import StarBorder from "@/components/StarBorder";
import type {
  AoryxExcursionSelection,
  AoryxExcursionTicket,
  AoryxTransferRate,
} from "@/types/aoryx";
import type { FlydubaiFlightOffer, FlydubaiSearchResponse } from "@/types/flydubai";
import type { EfesQuoteResult } from "@/types/efes";
import {
  PackageBuilderService,
  PackageBuilderState,
  openPackageBuilder,
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
} from "@/lib/package-builder-state";
import { useAmdRates } from "@/lib/use-amd-rates";

type Props = {
  serviceKey: PackageBuilderService;
};

const intlLocales: Record<AppLocale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const dateFnsLocales: Record<AppLocale, DateFnsLocale> = {
  hy,
  en: enGB,
  ru,
};

const buildTransferId = (transfer: AoryxTransferRate, index: number) => {
  if (transfer._id && transfer._id.length > 0) return transfer._id;
  const parts = [
    transfer.transferType ?? "transfer",
    transfer.origin?.locationCode ?? transfer.origin?.name ?? "origin",
    transfer.destination?.locationCode ?? transfer.destination?.name ?? "destination",
    transfer.vehicle?.name ?? transfer.vehicle?.category ?? "vehicle",
    transfer.paxRange?.maxPax ?? "pax",
    transfer.pricing?.oneWay ?? "price",
    `idx-${index}`,
  ];
  return parts.join("|");
};

const buildExcursionId = (excursion: AoryxExcursionTicket, index: number) =>
  excursion._id ?? excursion.activityCode ?? excursion.name ?? `excursion-${index}`;

const parseChildPolicyRange = (policy?: string | null): { min?: number; max?: number } | null => {
  if (!policy) return null;
  const matches = policy.match(/([0-9]+(?:\.[0-9]+)?)/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  if (nums.length === 1) return { min: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

const isFocPolicy = (policy?: string | null) => !!policy && /foc/i.test(policy);

const isChildOnlyPolicy = (policy?: string | null) => {
  if (!policy) return false;
  const normalized = policy.toLowerCase();
  return normalized.includes("child only") || normalized.includes("children only");
};

const isRestrictiveChildPolicy = (policy?: string | null) => {
  if (!policy) return false;
  if (isFocPolicy(policy) && !/only/i.test(policy)) return false;
  return /only/i.test(policy);
};

const hasMinAgeRestriction = (policy?: string | null) => {
  if (!policy) return false;
  if (isFocPolicy(policy) && !/only/i.test(policy)) return false;
  return /not allowed|below/i.test(policy);
};

const normalizeOptional = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildExcursionNameIndex = (excursion: AoryxExcursionTicket) => {
  const name = normalizeOptional(excursion.name);
  const activityCode = normalizeOptional(excursion.activityCode);
  if (!name && !activityCode) return "";
  return [name, activityCode].filter(Boolean).join(" ").toLowerCase();
};

const excursionNameIncludes = (excursion: AoryxExcursionTicket, terms: string[]) => {
  const index = buildExcursionNameIndex(excursion);
  if (!index) return false;
  return terms.some((term) => index.includes(term));
};

const parseDateInput = (value?: string | null) => {
  if (!value) return null;
  const [datePart] = value.split("T");
  if (!datePart) return null;
  const [year, month, day] = datePart.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
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

const DEFAULT_INSURANCE_ADULT_AGE = 30;
const DEFAULT_INSURANCE_CHILD_AGE = 8;
const DEFAULT_INSURANCE_SUBRISKS: string[] = [];

const serializeGuestExcursions = (value: Record<string, string[]>) => {
  const keys = Object.keys(value).sort();
  return JSON.stringify(keys.map((key) => [key, [...value[key]].sort()]));
};

type ExcursionGuest = {
  key: string;
  label: string;
  type: "Adult" | "Child";
  age: number | null;
};

type InsuranceGuest = {
  id: string;
  label: string;
  type: "Adult" | "Child";
  age: number | null;
};

type TransferType = "INDIVIDUAL" | "GROUP";
type ExcursionFilter = "ALL" | "YAS" | "SAFARI" | "CRUISE" | "BURJ" | "HELICOPTER";

type InsurancePlan = {
  id: string;
  title: string;
  description: string;
  coverages: string[];
  riskAmount: number;
  riskCurrency: string;
  riskLabel: string;
};

type InsuranceTerritory = {
  code: string;
  label: string;
  policyLabel: string;
};

type InsuranceSubriskOption = {
  id: string;
  label: string;
  rate: string;
  description: string;
};

const normalizeTransferType = (value: string | null | undefined): TransferType | null => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "INDIVIDUAL" || normalized === "GROUP") return normalized;
  return null;
};

type TransferAirportOption = {
  key: string;
  label: string;
  code: string | null;
  name: string | null;
};

const normalizeAirportKey = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
};

const buildTransferAirportOption = (transfer: AoryxTransferRate): TransferAirportOption | null => {
  const origin = transfer.origin ?? null;
  if (!origin) return null;
  const code = normalizeAirportKey(origin.airportCode ?? origin.locationCode);
  const name = origin.name?.trim() ?? null;
  const key = code ?? normalizeAirportKey(name);
  if (!key) return null;
  const label =
    name && code && name.toUpperCase() !== code
      ? `${name} (${code})`
      : name ?? code ?? key;
  return { key, label, code, name };
};

const getTransferAirportKey = (transfer: AoryxTransferRate) => {
  const origin = transfer.origin ?? null;
  if (!origin) return null;
  return (
    normalizeAirportKey(origin.airportCode ?? origin.locationCode) ??
    normalizeAirportKey(origin.name)
  );
};

type FlightSearchForm = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  cabinClass: string;
  notes: string;
};

export default function PackageServiceClient({ serviceKey }: Props) {
  const { locale, t } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const dateFnsLocale = dateFnsLocales[locale] ?? enGB;
  const pluralRules = useMemo(() => new Intl.PluralRules(intlLocale), [intlLocale]);
  const formatPlural = useCallback((count: number, forms: PluralForms) => {
    const category = pluralRules.select(count);
    const template = forms[category] ?? forms.other;
    return template.replace("{count}", count.toString());
  }, [pluralRules]);
  const formatCoverageAmount = useCallback(
    (amount: number, currency: string) => {
      try {
        return new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${new Intl.NumberFormat(intlLocale).format(amount)} ${currency}`;
      }
    },
    [intlLocale]
  );
  const { rates: amdRates } = useAmdRates();
  const [builderState, setBuilderState] = useState<PackageBuilderState>({});
  const [transferOptions, setTransferOptions] = useState<AoryxTransferRate[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [selectedTransferType, setSelectedTransferType] = useState<TransferType | null>(null);
  const [selectedAirportKey, setSelectedAirportKey] = useState<string | null>(null);
  const [includeReturnTransfer, setIncludeReturnTransfer] = useState<boolean>(true);
  const [excursionOptions, setExcursionOptions] = useState<AoryxExcursionTicket[]>([]);
  const [excursionLoading, setExcursionLoading] = useState(false);
  const [excursionError, setExcursionError] = useState<string | null>(null);
  const [excursionFee, setExcursionFee] = useState<number | null>(null);
  const [excursionFilter, setExcursionFilter] = useState<ExcursionFilter>("ALL");
  const [guestExcursions, setGuestExcursions] = useState<Record<string, string[]>>({});
  const [activeExcursionGuestId, setActiveExcursionGuestId] = useState<string | null>(null);
  const [activeInsuranceGuestId, setActiveInsuranceGuestId] = useState<string | null>(null);
  const [flightForm, setFlightForm] = useState<FlightSearchForm>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    cabinClass: "economy",
    notes: "",
  });
  const [flightOffers, setFlightOffers] = useState<FlydubaiFlightOffer[]>([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [flightSearched, setFlightSearched] = useState(false);
  const [flightMocked, setFlightMocked] = useState(false);
  const [insuranceQuoteLoading, setInsuranceQuoteLoading] = useState(false);
  const [insuranceQuoteError, setInsuranceQuoteError] = useState<string | null>(null);
  const [showInsuranceDatePicker, setShowInsuranceDatePicker] = useState(false);
  const transferSyncRef = useRef<{
    selectionId: string;
    includeReturn: boolean;
    price: number | null;
    currency: string | null;
    vehicleQuantity: number | null;
  } | null>(null);
  const insuranceDatePickerRef = useRef<HTMLDivElement | null>(null);
  const insuranceQuoteKeyRef = useRef<string | null>(null);
  const insuranceQuoteRequestIdRef = useRef(0);
  const insuranceQuoteTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const syncState = () => {
      const next = readPackageBuilderState();
      setBuilderState(next);
      if (typeof next.transfer?.includeReturn === "boolean") {
        setIncludeReturnTransfer(next.transfer.includeReturn);
      }
      if (next.excursion?.selections && typeof next.excursion.selections === "object") {
        setGuestExcursions(next.excursion.selections);
      } else {
        setGuestExcursions((prev) => {
          const hasSelections = Object.values(prev).some((list) => list.length > 0);
          if (!hasSelections) return prev;
          const cleared: Record<string, string[]> = {};
          Object.keys(prev).forEach((key) => {
            cleared[key] = [];
          });
          return cleared;
        });
      }
    };
    syncState();
    const unsubscribe = subscribePackageBuilderState(syncState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        insuranceDatePickerRef.current &&
        !insuranceDatePickerRef.current.contains(event.target as Node)
      ) {
        setShowInsuranceDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hotelSelection = builderState.hotel;
  const hasHotel = hotelSelection?.selected === true;
  const destinationName = hotelSelection?.destinationName ?? null;
  const destinationCode = hotelSelection?.destinationCode ?? null;
  const selectedHotelName = hotelSelection?.hotelName?.trim() ?? null;
  const selectedTransferId = builderState.transfer?.selectionId ?? null;
  const selectedFlightId = builderState.flight?.selectionId ?? null;
  const insuranceSelection = builderState.insurance ?? null;
  const nonHotelSelection =
    serviceKey === "hotel"
      ? undefined
      : builderState[serviceKey as Exclude<PackageBuilderService, "hotel">];
  useEffect(() => {
    if (insuranceSelection?.selected) return;
    setShowInsuranceDatePicker(false);
  }, [insuranceSelection?.selected]);
  const transferMissingDestination =
    serviceKey === "transfer" && hasHotel && !destinationName && !destinationCode;
  const shouldFetchTransfers =
    serviceKey === "transfer" && hasHotel && !transferMissingDestination;
  const insuranceStartDateRaw =
    insuranceSelection?.startDate ?? hotelSelection?.checkInDate ?? null;
  const insuranceEndDateRaw =
    insuranceSelection?.endDate ?? hotelSelection?.checkOutDate ?? null;
  const insuranceDateRange = useMemo<Range>(() => {
    const startDate = parseDateInput(insuranceStartDateRaw) ?? new Date();
    const endDate = parseDateInput(insuranceEndDateRaw) ?? startDate;
    return { startDate, endDate, key: "selection" };
  }, [insuranceStartDateRaw, insuranceEndDateRaw]);

  const airportOptions = useMemo(() => {
    const map = new Map<string, TransferAirportOption>();
    transferOptions.forEach((transfer) => {
      const option = buildTransferAirportOption(transfer);
      if (!option) return;
      if (!map.has(option.key)) map.set(option.key, option);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [transferOptions]);

  const preferredAirportKey = useMemo(() => {
    if (airportOptions.length === 0) return null;
    return (
      airportOptions.find((option) => option.code === "DXB")?.key ??
      airportOptions.find((option) => option.label.toLowerCase().includes("dubai"))?.key ??
      airportOptions[0]?.key ??
      null
    );
  }, [airportOptions]);

  useEffect(() => {
    if (!preferredAirportKey) {
      if (selectedAirportKey !== null) setSelectedAirportKey(null);
      return;
    }
    if (selectedAirportKey && airportOptions.some((option) => option.key === selectedAirportKey)) {
      return;
    }
    setSelectedAirportKey(preferredAirportKey);
  }, [airportOptions, preferredAirportKey, selectedAirportKey]);

  const activeAirportKey = selectedAirportKey ?? preferredAirportKey;

  const filteredTransferOptions = useMemo(() => {
    if (!activeAirportKey || airportOptions.length === 0) return transferOptions;
    return transferOptions.filter(
      (transfer) => getTransferAirportKey(transfer) === activeAirportKey
    );
  }, [activeAirportKey, airportOptions.length, transferOptions]);

  const passengerCounts = useMemo(() => {
    const rooms = hotelSelection?.rooms ?? [];
    if (rooms.length === 0) {
      const total =
        typeof hotelSelection?.guestCount === "number" ? hotelSelection.guestCount : 0;
      return { adults: total, children: 0, total };
    }
    let adults = 0;
    let children = 0;
    rooms.forEach((room) => {
      adults += Number.isFinite(room.adults) ? room.adults : 0;
      children += Array.isArray(room.childrenAges) ? room.childrenAges.length : 0;
    });
    return { adults, children, total: adults + children };
  }, [hotelSelection?.guestCount, hotelSelection?.rooms]);

  const cabinOptions = useMemo(
    () => [
      { value: "economy", label: t.hotel.addons.flights.cabin.economy },
      { value: "premium", label: t.hotel.addons.flights.cabin.premium },
      { value: "business", label: t.hotel.addons.flights.cabin.business },
      { value: "first", label: t.hotel.addons.flights.cabin.first },
    ],
    [t.hotel.addons.flights.cabin]
  );

  const cabinLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    cabinOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [cabinOptions]);

  const passengerSummary = useMemo(() => {
    const parts: string[] = [];
    if (passengerCounts.adults > 0) {
      parts.push(`${passengerCounts.adults} ${t.search.adultsLabel}`);
    }
    if (passengerCounts.children > 0) {
      parts.push(`${passengerCounts.children} ${t.search.childrenLabel}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [
    passengerCounts.adults,
    passengerCounts.children,
    t.search.adultsLabel,
    t.search.childrenLabel,
  ]);

  const insurancePlans = useMemo<InsurancePlan[]>(
    () => [
      {
        id: "elite",
        title: t.packageBuilder.insurance.plans.elite.title,
        description: t.packageBuilder.insurance.plans.elite.description,
        coverages: t.packageBuilder.insurance.plans.elite.coverages,
        riskAmount: 15000,
        riskCurrency: "EUR",
        riskLabel: "STANDARD",
      },
    ],
    [t.packageBuilder.insurance.plans.elite]
  );

  const insuranceTerritories = useMemo<InsuranceTerritory[]>(
    () => [
      {
        code: "whole_world_exc_uk_sch_us_ca_au_jp",
        label: t.packageBuilder.insurance.territories.worldwideExcluding,
        policyLabel: t.packageBuilder.insurance.territories.worldwideExcludingPolicy,
      },
    ],
    [t.packageBuilder.insurance.territories]
  );

  const insuranceGuests = useMemo<InsuranceGuest[]>(() => {
    const rooms = hotelSelection?.rooms ?? null;
    const guests: InsuranceGuest[] = [];
    let counter = 1;

    if (!rooms || rooms.length === 0) {
      const total =
        typeof hotelSelection?.guestCount === "number" ? hotelSelection.guestCount : 0;
      for (let i = 0; i < total; i += 1) {
        guests.push({
          id: `guest-${i + 1}`,
          label: `${t.auth.guestNameFallback} ${counter} - ${t.hotel.addons.excursions.adultPrice}`,
          type: "Adult",
          age: null,
        });
        counter += 1;
      }
      return guests;
    }

    rooms.forEach((room, roomIndex) => {
      const roomIdentifier =
        typeof room.roomIdentifier === "number" ? room.roomIdentifier : roomIndex + 1;
      const adults =
        typeof room.adults === "number" && room.adults > 0 ? room.adults : 1;
      const children = Array.isArray(room.childrenAges) ? room.childrenAges : [];
      for (let i = 0; i < adults; i += 1) {
        guests.push({
          id: `room-${roomIdentifier}-adult-${i + 1}`,
          label: `${t.auth.guestNameFallback} ${counter} - ${t.hotel.addons.excursions.adultPrice}`,
          type: "Adult",
          age: null,
        });
        counter += 1;
      }
      children.forEach((age, index) => {
        const safeAge = Number.isFinite(age) ? age : null;
        const ageLabel = safeAge !== null ? ` (${safeAge})` : "";
        guests.push({
          id: `room-${roomIdentifier}-child-${index + 1}`,
          label: `${t.auth.guestNameFallback} ${counter} - ${t.hotel.addons.excursions.childPrice}${ageLabel}`,
          type: "Child",
          age: safeAge,
        });
        counter += 1;
      });
    });

    return guests;
  }, [
    hotelSelection?.guestCount,
    hotelSelection?.rooms,
    t.auth.guestNameFallback,
    t.hotel.addons.excursions.adultPrice,
    t.hotel.addons.excursions.childPrice,
  ]);

  useEffect(() => {
    if (insuranceGuests.length === 0) {
      if (activeInsuranceGuestId) {
        setActiveInsuranceGuestId(null);
      }
      return;
    }
    if (!activeInsuranceGuestId) {
      setActiveInsuranceGuestId(insuranceGuests[0]?.id ?? null);
      return;
    }
    if (!insuranceGuests.some((guest) => guest.id === activeInsuranceGuestId)) {
      setActiveInsuranceGuestId(insuranceGuests[0]?.id ?? null);
    }
  }, [activeInsuranceGuestId, insuranceGuests]);

  const insuranceGuestIds = useMemo(
    () => insuranceGuests.map((guest) => guest.id),
    [insuranceGuests]
  );

  const selectedInsuranceGuestIds = useMemo(() => {
    if (!Array.isArray(insuranceSelection?.insuredGuestIds)) {
      return insuranceGuestIds;
    }
    const available = new Set(insuranceGuestIds);
    const filtered = insuranceSelection.insuredGuestIds.filter((id) => available.has(id));
    return filtered.length > 0 ? filtered : insuranceGuestIds;
  }, [insuranceGuestIds, insuranceSelection?.insuredGuestIds]);

  const selectedInsuranceGuestIdSet = useMemo(
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
      return DEFAULT_INSURANCE_SUBRISKS;
    },
    [insuranceSelection?.subrisks, insuranceSelection?.subrisksByGuest]
  );

  const insuranceSubrisks = useMemo<InsuranceSubriskOption[]>(
    () => [
      {
        id: "AMATEUR_SPORT_EXPENCES",
        ...t.packageBuilder.insurance.subrisks.amateurSport,
      },
      {
        id: "BAGGAGE_EXPENCES",
        ...t.packageBuilder.insurance.subrisks.baggage,
      },
      {
        id: "travel_inconveniences",
        ...t.packageBuilder.insurance.subrisks.travelInconveniences,
      },
      {
        id: "house_insurance",
        ...t.packageBuilder.insurance.subrisks.houseInsurance,
      },
      {
        id: "trip_cancellation",
        ...t.packageBuilder.insurance.subrisks.tripCancellation,
      },
    ],
    [t.packageBuilder.insurance.subrisks]
  );

  const insuranceSubriskIds = useMemo(
    () => insuranceSubrisks.map((subrisk) => subrisk.id),
    [insuranceSubrisks]
  );

  const selectedInsuranceSubrisks = useMemo(() => {
    const guestSubrisks = resolveGuestSubrisks(activeInsuranceGuestId);
    const normalized = Array.isArray(guestSubrisks)
      ? guestSubrisks.map((value) => value.trim()).filter((value) => value.length > 0)
      : null;
    const selected = new Set(normalized ?? DEFAULT_INSURANCE_SUBRISKS);
    return insuranceSubriskIds.filter((id) => selected.has(id));
  }, [activeInsuranceGuestId, insuranceSubriskIds, resolveGuestSubrisks]);

  const selectedInsuranceSubriskSet = useMemo(
    () => new Set(selectedInsuranceSubrisks),
    [selectedInsuranceSubrisks]
  );

  const buildInsuranceQuoteTravelers = useCallback(() => {
    const rooms = hotelSelection?.rooms ?? [];
    const travelers: Array<{ id: string; age: number; subrisks?: string[] | null }> = [];
    if (rooms.length === 0) {
      const total =
        typeof hotelSelection?.guestCount === "number" ? hotelSelection.guestCount : 0;
      for (let i = 0; i < total; i += 1) {
        const id = `guest-${i + 1}`;
        travelers.push({
          id,
          age: DEFAULT_INSURANCE_ADULT_AGE,
          subrisks: resolveGuestSubrisks(id),
        });
      }
    } else {
      rooms.forEach((room, roomIndex) => {
        const roomIdentifier =
          typeof room.roomIdentifier === "number" ? room.roomIdentifier : roomIndex + 1;
        const adultCount = typeof room.adults === "number" && room.adults > 0 ? room.adults : 1;
        for (let i = 0; i < adultCount; i += 1) {
          const id = `room-${roomIdentifier}-adult-${i + 1}`;
          travelers.push({
            id,
            age: DEFAULT_INSURANCE_ADULT_AGE,
            subrisks: resolveGuestSubrisks(id),
          });
        }
        const childAges = Array.isArray(room.childrenAges) ? room.childrenAges : [];
        childAges.forEach((age, index) => {
          const id = `room-${roomIdentifier}-child-${index + 1}`;
          travelers.push({
            id,
            age: Number.isFinite(age) ? age : DEFAULT_INSURANCE_CHILD_AGE,
            subrisks: resolveGuestSubrisks(id),
          });
        });
      });
    }

    return travelers.filter((traveler) => selectedInsuranceGuestIdSet.has(traveler.id));
  }, [
    hotelSelection?.guestCount,
    hotelSelection?.rooms,
    resolveGuestSubrisks,
    selectedInsuranceGuestIdSet,
  ]);

  const insuranceQuoteRequest = useMemo(() => {
    if (!insuranceSelection?.selected) return null;
    const startDate = insuranceSelection.startDate ?? hotelSelection?.checkInDate ?? null;
    const endDate = insuranceSelection.endDate ?? hotelSelection?.checkOutDate ?? null;
    if (!startDate || !endDate) return null;
    const territoryCode = normalizeOptional(insuranceSelection.territoryCode) ?? "";
    const riskAmount = insuranceSelection.riskAmount ?? null;
    const riskCurrency = normalizeOptional(insuranceSelection.riskCurrency) ?? "";
    if (!territoryCode || !riskAmount || !riskCurrency) return null;
    const travelers = buildInsuranceQuoteTravelers();
    if (travelers.length === 0) return null;
    const days =
      calculateTripDays(startDate, endDate) ?? insuranceSelection.days ?? undefined;
    const payload = {
      startDate,
      endDate,
      territoryCode,
      riskAmount,
      riskCurrency,
      riskLabel: insuranceSelection.riskLabel ?? undefined,
      days,
      subrisks: insuranceSelection.subrisks ?? undefined,
      travelers,
    };
    return {
      key: JSON.stringify(payload),
      payload,
      startDate,
      endDate,
      days: typeof days === "number" ? days : null,
    };
  }, [
    buildInsuranceQuoteTravelers,
    hotelSelection?.checkInDate,
    hotelSelection?.checkOutDate,
    insuranceSelection?.days,
    insuranceSelection?.riskAmount,
    insuranceSelection?.riskCurrency,
    insuranceSelection?.riskLabel,
    insuranceSelection?.selected,
    insuranceSelection?.startDate,
    insuranceSelection?.endDate,
    insuranceSelection?.subrisks,
    insuranceSelection?.territoryCode,
  ]);

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
      const requestId = (insuranceQuoteRequestIdRef.current += 1);
      insuranceQuoteKeyRef.current = insuranceQuoteRequest.key;
      setInsuranceQuoteLoading(true);
      setInsuranceQuoteError(null);
      try {
        const quote = await postJson<EfesQuoteResult>(
          "/api/insurance/efes/quote",
          insuranceQuoteRequest.payload
        );
        if (requestId !== insuranceQuoteRequestIdRef.current) return;
        const premiumMap = quote.premiums.reduce<Record<string, number>>(
          (acc, entry, index) => {
            const fallbackId = insuranceQuoteRequest.payload.travelers[index]?.id ?? null;
            const id = entry.travelerId ?? fallbackId;
            if (id && Number.isFinite(entry.premium)) {
              acc[id] = entry.premium;
            }
            return acc;
          },
          {}
        );
        const quotePremiumsByGuest =
          Object.keys(premiumMap).length > 0 ? premiumMap : null;
        updatePackageBuilderState((prev) => {
          if (!prev.insurance?.selected) return prev;
          return {
            ...prev,
            insurance: {
              ...prev.insurance,
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
              quotePremiumsByGuest,
              quoteError: null,
              startDate: insuranceQuoteRequest.startDate,
              endDate: insuranceQuoteRequest.endDate,
              days: insuranceQuoteRequest.days ?? null,
            },
            updatedAt: Date.now(),
          };
        });
      } catch (error) {
        if (requestId !== insuranceQuoteRequestIdRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : t.packageBuilder.checkout.errors.insuranceQuoteFailed;
        const mappedMessage = mapEfesErrorMessage(
          message,
          t.packageBuilder.insurance.errors
        );
        setInsuranceQuoteError(mappedMessage);
        updatePackageBuilderState((prev) => {
          if (!prev.insurance?.selected) return prev;
          return {
            ...prev,
            insurance: {
              ...prev.insurance,
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
      } finally {
        if (requestId === insuranceQuoteRequestIdRef.current) {
          setInsuranceQuoteLoading(false);
        }
      }
    }, 400);
    return () => {
      if (insuranceQuoteTimerRef.current !== null) {
        window.clearTimeout(insuranceQuoteTimerRef.current);
        insuranceQuoteTimerRef.current = null;
      }
    };
  }, [
    insuranceQuoteRequest,
    insuranceSelection?.selected,
    t.packageBuilder.checkout.errors.insuranceQuoteFailed,
    t.packageBuilder.insurance.errors,
  ]);
  const transferGuestCounts = useMemo(() => {
    const rooms = hotelSelection?.rooms ?? [];
    if (rooms.length === 0) {
      const total =
        typeof hotelSelection?.guestCount === "number" ? hotelSelection.guestCount : 0;
      return {
        total,
        chargeable: total,
        adults: total,
        childFree: 0,
        childHalf: 0,
        childAdult: 0,
      };
    }

    let total = 0;
    let chargeable = 0;
    let adults = 0;
    let childFree = 0;
    let childHalf = 0;
    let childAdult = 0;

    rooms.forEach((room) => {
      const roomAdults = Number.isFinite(room.adults) ? room.adults : 0;
      adults += roomAdults;
      total += roomAdults;
      chargeable += roomAdults;

      const childrenAges = Array.isArray(room.childrenAges) ? room.childrenAges : [];
      childrenAges.forEach((ageValue) => {
        const age = typeof ageValue === "number" ? ageValue : Number(ageValue);
        total += 1;
        if (!Number.isFinite(age)) {
          childAdult += 1;
          chargeable += 1;
          return;
        }
        if (age < 2) {
          childFree += 1;
          return;
        }
        if (age < 12) {
          childHalf += 1;
          chargeable += 0.5;
          return;
        }
        childAdult += 1;
        chargeable += 1;
      });
    });

    return {
      total,
      chargeable,
      adults,
      childFree,
      childHalf,
      childAdult,
    };
  }, [hotelSelection?.guestCount, hotelSelection?.rooms]);

  const getTransferPricing = useCallback(
    (transfer: AoryxTransferRate, includeReturn: boolean) => {
      const oneWay =
        typeof transfer.pricing?.oneWay === "number" ? transfer.pricing.oneWay : null;
      const returnPrice =
        typeof transfer.pricing?.return === "number" ? transfer.pricing.return : null;
      const price = includeReturn
        ? returnPrice ?? (oneWay !== null ? oneWay * 2 : null)
        : oneWay ?? returnPrice;
      const currency = transfer.pricing?.currency ?? null;
      return { price, currency };
    },
    []
  );

  const resolveTransferChargeType = useCallback((transfer: AoryxTransferRate) => {
    const chargeType = transfer.pricing?.chargeType ?? null;
    if (chargeType === "PER_PAX" || chargeType === "PER_VEHICLE") return chargeType;
    const transferType = normalizeTransferType(transfer.transferType);
    return transferType === "GROUP" ? "PER_PAX" : "PER_VEHICLE";
  }, []);

  const getTransferTotals = useCallback(
    (
      transfer: AoryxTransferRate,
      includeReturn: boolean,
      guestCounts: { total: number; chargeable: number }
    ) => {
      const { price, currency } = getTransferPricing(transfer, includeReturn);
      const chargeType = resolveTransferChargeType(transfer);
      if (price === null || !Number.isFinite(price)) {
        return {
          unitPrice: null,
          totalPrice: null,
          currency,
          chargeType,
          paxCount: null,
          vehicleCount: null,
        };
      }
      if (chargeType === "PER_PAX") {
        const minPax = transfer.paxRange?.minPax ?? 1;
        const paxCount = guestCounts.chargeable > 0 ? Math.max(guestCounts.chargeable, minPax) : null;
        const totalPrice = paxCount ? price * paxCount : null;
        return {
          unitPrice: price,
          totalPrice,
          currency,
          chargeType,
          paxCount,
          vehicleCount: null,
        };
      }
      const maxPaxRaw = transfer.vehicle?.maxPax ?? transfer.paxRange?.maxPax ?? null;
      const maxPax =
        typeof maxPaxRaw === "number" && Number.isFinite(maxPaxRaw) && maxPaxRaw > 0
          ? maxPaxRaw
          : null;
      const vehicleCount =
        guestCounts.total > 0
          ? maxPax
            ? Math.max(1, Math.ceil(guestCounts.total / maxPax))
            : 1
          : null;
      const totalPrice = vehicleCount ? price * vehicleCount : price;
      return {
        unitPrice: price,
        totalPrice,
        currency,
        chargeType,
        paxCount: null,
        vehicleCount,
      };
    },
    [getTransferPricing, resolveTransferChargeType]
  );

  const excursionGuests = useMemo<ExcursionGuest[]>(() => {
    const rooms = hotelSelection?.rooms ?? null;
    if (!rooms || rooms.length === 0) return [];
    const guests: ExcursionGuest[] = [];
    let counter = 1;
    rooms.forEach((room, roomIndex) => {
      const roomId = Number.isFinite(room.roomIdentifier) ? room.roomIdentifier : roomIndex + 1;
      const adults = Number.isFinite(room.adults) ? room.adults : 0;
      const children = Array.isArray(room.childrenAges) ? room.childrenAges : [];
      for (let i = 0; i < adults; i += 1) {
        const label = `${t.auth.guestNameFallback} ${counter} - ${t.hotel.addons.excursions.adultPrice}`;
        guests.push({
          key: `${roomId}:adult-${i + 1}`,
          label,
          type: "Adult",
          age: null,
        });
        counter += 1;
      }
      children.forEach((age, index) => {
        const safeAge = Number.isFinite(age) ? age : null;
        const ageLabel = safeAge !== null ? ` (${safeAge})` : "";
        const label = `${t.auth.guestNameFallback} ${counter} - ${t.hotel.addons.excursions.childPrice}${ageLabel}`;
        guests.push({
          key: `${roomId}:child-${index + 1}`,
          label,
          type: "Child",
          age: safeAge,
        });
        counter += 1;
      });
    });
    return guests;
  }, [
    hotelSelection?.rooms,
    t.auth.guestNameFallback,
    t.hotel.addons.excursions.adultPrice,
    t.hotel.addons.excursions.childPrice,
  ]);

  const excursionGuestMap = useMemo(() => {
    const map = new Map<string, ExcursionGuest>();
    excursionGuests.forEach((guest) => {
      map.set(guest.key, guest);
    });
    return map;
  }, [excursionGuests]);

  const canSelectExcursions = hasHotel && excursionGuests.length > 0;

  useEffect(() => {
    if (serviceKey !== "flight") return;
    const defaultDestination = destinationName ?? destinationCode ?? "";
    const defaultDeparture = hotelSelection?.checkInDate ?? "";
    const defaultReturn = hotelSelection?.checkOutDate ?? "";
    setFlightForm((prev) => {
      const selection = builderState.flight;
      const next: FlightSearchForm = selection?.selected
        ? {
            origin: selection.origin ?? "",
            destination: selection.destination ?? defaultDestination,
            departureDate: selection.departureDate ?? defaultDeparture,
            returnDate: selection.returnDate ?? defaultReturn,
            cabinClass: selection.cabinClass ?? "economy",
            notes: selection.notes ?? "",
          }
        : {
            origin: prev.origin,
            destination: prev.destination || defaultDestination,
            departureDate: prev.departureDate || defaultDeparture,
            returnDate: prev.returnDate || defaultReturn,
            cabinClass: prev.cabinClass || "economy",
            notes: prev.notes,
          };
      const changed = Object.keys(next).some(
        (key) => next[key as keyof FlightSearchForm] !== prev[key as keyof FlightSearchForm]
      );
      return changed ? next : prev;
    });
  }, [
    builderState.flight,
    destinationCode,
    destinationName,
    hotelSelection?.checkInDate,
    hotelSelection?.checkOutDate,
    serviceKey,
  ]);

  useEffect(() => {
    if (serviceKey !== "flight") return;
    if (hasHotel) return;
    setFlightOffers((prev) => (prev.length > 0 ? [] : prev));
    setFlightError((prev) => (prev ? null : prev));
    setFlightMocked(false);
    setFlightSearched(false);
  }, [hasHotel, serviceKey]);

  useEffect(() => {
    if (hasHotel) return;
    if (Object.keys(guestExcursions).length > 0) {
      setGuestExcursions({});
    }
    if (activeExcursionGuestId) {
      setActiveExcursionGuestId(null);
    }
  }, [activeExcursionGuestId, guestExcursions, hasHotel]);

  useEffect(() => {
    if (excursionGuests.length === 0) {
      if (Object.keys(guestExcursions).length > 0) {
        setGuestExcursions({});
      }
      return;
    }
    setGuestExcursions((prev) => {
      const next: Record<string, string[]> = {};
      let changed = false;
      const keys = new Set<string>();
      excursionGuests.forEach((guest) => {
        keys.add(guest.key);
        if (Array.isArray(prev[guest.key])) {
          next[guest.key] = prev[guest.key];
        } else {
          next[guest.key] = [];
          if (prev[guest.key] !== undefined) {
            changed = true;
          }
        }
      });
      Object.keys(prev).forEach((key) => {
        if (!keys.has(key)) changed = true;
      });
      return changed ? next : prev;
    });
  }, [excursionGuests, guestExcursions]);

  useEffect(() => {
    if (excursionGuests.length === 0) {
      if (activeExcursionGuestId) setActiveExcursionGuestId(null);
      return;
    }
    if (!activeExcursionGuestId || !excursionGuestMap.has(activeExcursionGuestId)) {
      setActiveExcursionGuestId(excursionGuests[0]?.key ?? null);
    }
  }, [activeExcursionGuestId, excursionGuestMap, excursionGuests]);

  useEffect(() => {
    if (!shouldFetchTransfers) return;
    let active = true;
    const fetchTransfers = async () => {
      await Promise.resolve();
      if (!active) return;
      setTransferLoading(true);
      setTransferError(null);
      try {
        const data = await postJson<{ transfers?: AoryxTransferRate[] }>("/api/aoryx/transfers", {
          destinationLocationCode: destinationCode ?? "",
          destinationName: destinationName ?? "",
        });
        if (!active) return;
        const transfers = Array.isArray(data.transfers) ? data.transfers : [];
        setTransferOptions(transfers);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : t.hotel.addons.transfers.loadFailed;
        setTransferError(message);
      } finally {
        if (active) setTransferLoading(false);
      }
    };
    fetchTransfers();
    return () => {
      active = false;
    };
  }, [
    destinationCode,
    destinationName,
    shouldFetchTransfers,
    t.hotel.addons.transfers.loadFailed,
  ]);

  useEffect(() => {
    if (serviceKey !== "excursion") return;
    if (!hasHotel) {
      setExcursionOptions((prev) => (prev.length > 0 ? [] : prev));
      setExcursionFee((prev) => (prev !== null ? null : prev));
      setExcursionError(null);
      setExcursionLoading(false);
      return;
    }
    let active = true;
    const fetchExcursions = async () => {
      await Promise.resolve();
      if (!active) return;
      setExcursionLoading(true);
      setExcursionError(null);
      try {
        const data = await postJson<{ excursions?: AoryxExcursionTicket[]; excursionFee?: number }>(
          "/api/aoryx/excursions",
          { limit: 200 }
        );
        if (!active) return;
        setExcursionOptions(Array.isArray(data.excursions) ? data.excursions : []);
        if (typeof data.excursionFee === "number") {
          setExcursionFee(data.excursionFee);
        }
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : t.hotel.addons.excursions.loadFailed;
        setExcursionError(message);
      } finally {
        if (active) setExcursionLoading(false);
      }
    };
    fetchExcursions();
    return () => {
      active = false;
    };
  }, [hasHotel, serviceKey, t.hotel.addons.excursions.loadFailed]);

  const transferIdMap = useMemo(() => {
    const map = new Map<AoryxTransferRate, string>();
    transferOptions.forEach((transfer, index) => {
      map.set(transfer, buildTransferId(transfer, index));
    });
    return map;
  }, [transferOptions]);

  const transferById = useMemo(() => {
    const map = new Map<string, AoryxTransferRate>();
    transferOptions.forEach((transfer, index) => {
      const id = transferIdMap.get(transfer) ?? buildTransferId(transfer, index);
      map.set(id, transfer);
    });
    return map;
  }, [transferIdMap, transferOptions]);

  const { individualTransfers, groupTransfers } = useMemo(() => {
    const individual: AoryxTransferRate[] = [];
    const group: AoryxTransferRate[] = [];
    filteredTransferOptions.forEach((transfer) => {
      const type = normalizeTransferType(transfer.transferType);
      if (type === "GROUP") {
        group.push(transfer);
      } else {
        individual.push(transfer);
      }
    });
    return { individualTransfers: individual, groupTransfers: group };
  }, [filteredTransferOptions]);

  useEffect(() => {
    if (selectedTransferType) return;
    const existingType = normalizeTransferType(builderState.transfer?.transferType ?? null);
    if (existingType) {
      setSelectedTransferType(existingType);
      return;
    }
    if (individualTransfers.length > 0 && groupTransfers.length === 0) {
      setSelectedTransferType("INDIVIDUAL");
    } else if (groupTransfers.length > 0 && individualTransfers.length === 0) {
      setSelectedTransferType("GROUP");
    }
  }, [
    builderState.transfer?.transferType,
    groupTransfers.length,
    individualTransfers.length,
    selectedTransferType,
  ]);

  useEffect(() => {
    if (serviceKey !== "transfer") return;
    if (!selectedTransferId) return;
    const transfer = transferById.get(selectedTransferId);
    if (!transfer) return;
    const { unitPrice, totalPrice, currency, vehicleCount } = getTransferTotals(
      transfer,
      includeReturnTransfer,
      transferGuestCounts
    );
    const selectionPrice = totalPrice ?? unitPrice;
    const nextSync = {
      selectionId: selectedTransferId,
      includeReturn: includeReturnTransfer,
      price: selectionPrice ?? null,
      currency: currency ?? null,
      vehicleQuantity: vehicleCount ?? null,
    };
    const prevSync = transferSyncRef.current;
    if (
      prevSync &&
      prevSync.selectionId === nextSync.selectionId &&
      prevSync.includeReturn === nextSync.includeReturn &&
      prevSync.price === nextSync.price &&
      prevSync.currency === nextSync.currency &&
      prevSync.vehicleQuantity === nextSync.vehicleQuantity
    ) {
      return;
    }
    transferSyncRef.current = nextSync;
    updatePackageBuilderState((prev) => {
      if (!prev.transfer?.selected || prev.transfer.selectionId !== selectedTransferId) {
        return prev;
      }
      return {
        ...prev,
        transfer: {
          ...prev.transfer,
          includeReturn: includeReturnTransfer,
          price: selectionPrice,
          currency,
          vehicleQuantity: vehicleCount ?? null,
        },
        updatedAt: Date.now(),
      };
    });
  }, [
    includeReturnTransfer,
    getTransferTotals,
    transferGuestCounts,
    selectedTransferId,
    serviceKey,
    transferById,
  ]);

  const excursionOptionsWithId = useMemo(
    () =>
      excursionOptions.map((excursion, index) => ({
        ...excursion,
        id: buildExcursionId(excursion, index),
      })),
    [excursionOptions]
  );
  const isYasExcursion = useCallback((excursion: AoryxExcursionTicket) => {
    const location = normalizeOptional(excursion.location);
    if (location && location.toUpperCase().includes("YAS")) {
      return true;
    }
    const yasPattern = /\byas\b|yas\s*island|yas[-\s]/i;
    return [
      excursion.name,
      excursion.description,
      excursion.productType,
      excursion.activityCode,
      excursion.cityCode,
    ].some((value) => typeof value === "string" && yasPattern.test(value));
  }, []);
  const isSafariExcursion = useCallback(
    (excursion: AoryxExcursionTicket) => excursionNameIncludes(excursion, ["safari"]),
    []
  );
  const isCruiseExcursion = useCallback(
    (excursion: AoryxExcursionTicket) => excursionNameIncludes(excursion, ["cruise"]),
    []
  );
  const isBurjExcursion = useCallback(
    (excursion: AoryxExcursionTicket) => excursionNameIncludes(excursion, ["burj", "khalifa"]),
    []
  );
  const isHelicopterExcursion = useCallback(
    (excursion: AoryxExcursionTicket) =>
      excursionNameIncludes(excursion, ["helicopter", "heli"]),
    []
  );
  const yasExcursions = useMemo(
    () => excursionOptionsWithId.filter(isYasExcursion),
    [excursionOptionsWithId, isYasExcursion]
  );
  const safariExcursions = useMemo(
    () => excursionOptionsWithId.filter(isSafariExcursion),
    [excursionOptionsWithId, isSafariExcursion]
  );
  const cruiseExcursions = useMemo(
    () => excursionOptionsWithId.filter(isCruiseExcursion),
    [excursionOptionsWithId, isCruiseExcursion]
  );
  const burjExcursions = useMemo(
    () => excursionOptionsWithId.filter(isBurjExcursion),
    [excursionOptionsWithId, isBurjExcursion]
  );
  const helicopterExcursions = useMemo(
    () => excursionOptionsWithId.filter(isHelicopterExcursion),
    [excursionOptionsWithId, isHelicopterExcursion]
  );
  const getExcursionLogo = useCallback(
    (excursion: AoryxExcursionTicket) => {
      if (!isYasExcursion(excursion)) return null;
      const name = normalizeOptional(excursion.name)?.toLowerCase();
      if (!name) return null;
      if (name.startsWith("ferrari")) return "/images/logos/ferrari-world.svg";
      if (name.startsWith("warner")) return "/images/logos/warner-bros.svg";
      if (name.startsWith("sea world") || name.startsWith("seaworld")) {
        return "/images/logos/seaworld.svg";
      }
      if (name.startsWith("yas waterworld") || name.startsWith("waterworld")) {
        return "/images/logos/yas-waterworld.svg";
      }
      if (name.startsWith("yas")) return "/images/logos/yas.webp";
      return null;
    },
    [isYasExcursion]
  );
  const visibleExcursions = useMemo(
    () => {
      switch (excursionFilter) {
        case "YAS":
          return yasExcursions;
        case "SAFARI":
          return safariExcursions;
        case "CRUISE":
          return cruiseExcursions;
        case "BURJ":
          return burjExcursions;
        case "HELICOPTER":
          return helicopterExcursions;
        case "ALL":
        default:
          return excursionOptionsWithId;
      }
    },
    [
      burjExcursions,
      cruiseExcursions,
      excursionFilter,
      excursionOptionsWithId,
      helicopterExcursions,
      safariExcursions,
      yasExcursions,
    ]
  );

  useEffect(() => {
    if (excursionOptionsWithId.length === 0) {
      setGuestExcursions((prev) => {
        const hasSelections = Object.values(prev).some((list) => list.length > 0);
        if (!hasSelections) return prev;
        const cleared: Record<string, string[]> = {};
        Object.keys(prev).forEach((key) => {
          cleared[key] = [];
        });
        return cleared;
      });
      return;
    }
    const validIds = new Set(excursionOptionsWithId.map((excursion) => excursion.id));
    setGuestExcursions((prev) => {
      let changed = false;
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([guestKey, selections]) => {
        const filtered = selections.filter((id) => validIds.has(id));
        if (filtered.length !== selections.length) changed = true;
        next[guestKey] = filtered;
      });
      return changed ? next : prev;
    });
  }, [excursionOptionsWithId]);

  const activeExcursionSelection = activeExcursionGuestId
    ? guestExcursions[activeExcursionGuestId] ?? []
    : [];

  const isExcursionEligibleForGuest = useCallback(
    (excursion: AoryxExcursionTicket, guest: ExcursionGuest) => {
      const policyRange = parseChildPolicyRange(excursion.childPolicy);
      const age = guest.age;
      if (guest.type === "Adult") {
        if (hasMinAgeRestriction(excursion.childPolicy) && policyRange?.min !== undefined && age !== null) {
          if (age < policyRange.min) return false;
        }
        if (isChildOnlyPolicy(excursion.childPolicy)) {
          return false;
        }
        return true;
      }

      const enforceRange =
        isChildOnlyPolicy(excursion.childPolicy) ||
        isRestrictiveChildPolicy(excursion.childPolicy) ||
        hasMinAgeRestriction(excursion.childPolicy);

      if (enforceRange && policyRange && age !== null) {
        if (policyRange.min !== undefined && age < policyRange.min) return false;
        if (policyRange.max !== undefined && age > policyRange.max) return false;
      }
      return true;
    },
    []
  );

  const computeExcursionPrice = useCallback(
    (excursion: AoryxExcursionTicket, guest: ExcursionGuest) => {
      const feeAlreadyApplied =
        (excursion.pricing as { feeApplied?: unknown })?.feeApplied === true;
      const feeToApply = feeAlreadyApplied ? 0 : excursionFee ?? 0;
      const currency = excursion.pricing?.currency;

      if (guest.type === "Adult") {
        return { amount: (excursion.pricing?.adult ?? 0) + feeToApply, currency };
      }

      const age = guest.age;
      const childRange = parseChildPolicyRange(excursion.childPolicy);
      const childIsFree =
        isFocPolicy(excursion.childPolicy) || (excursion.pricing?.child ?? 0) === 0;

      const focNonRestrictive = childIsFree && !/only/i.test(excursion.childPolicy ?? "");

      if (childIsFree && age !== null) {
        const focMax = childRange?.max ?? 3;
        if (age <= focMax) {
          return { amount: feeToApply, currency };
        }
      }

      const childEligible =
        age !== null &&
        !!childRange &&
        (childRange.min === undefined || age >= childRange.min) &&
        (childRange.max === undefined || age <= childRange.max);

      if (childEligible && age !== null) {
        return {
          amount: (excursion.pricing?.child ?? excursion.pricing?.adult ?? 0) + feeToApply,
          currency,
        };
      }

      if (childIsFree && age === null) {
        return { amount: feeToApply, currency };
      }

      if (focNonRestrictive) {
        return {
          amount: (excursion.pricing?.adult ?? 0) + feeToApply,
          currency,
        };
      }

      return {
        amount: (excursion.pricing?.adult ?? 0) + feeToApply,
        currency,
      };
    },
    [excursionFee]
  );

  const excursionSelectionCount = useMemo(
    () => Object.values(guestExcursions).reduce((sum, ids) => sum + ids.length, 0),
    [guestExcursions]
  );

  const excursionTotals = useMemo(() => {
    if (excursionOptionsWithId.length === 0 || excursionSelectionCount === 0) {
      return { amount: null, currency: null };
    }
    const lookup = new Map(excursionOptionsWithId.map((excursion) => [excursion.id, excursion]));
    let total = 0;
    let currency: string | null = null;
    let mismatch = false;

    Object.entries(guestExcursions).forEach(([guestKey, selections]) => {
      const guest = excursionGuestMap.get(guestKey);
      if (!guest) return;
      selections.forEach((excursionId) => {
        const excursion = lookup.get(excursionId);
        if (!excursion) return;
        if (!isExcursionEligibleForGuest(excursion, guest)) return;
        const price = computeExcursionPrice(excursion, guest);
        if (!Number.isFinite(price.amount) || price.amount <= 0) return;
        if (price.currency) {
          if (!currency) {
            currency = price.currency;
          } else if (price.currency !== currency) {
            mismatch = true;
          }
        } else if (currency) {
          mismatch = true;
        }
        total += price.amount;
      });
    });

    if (total <= 0 || mismatch || !currency) {
      return { amount: null, currency: null };
    }
    return { amount: total, currency };
  }, [
    computeExcursionPrice,
    excursionGuestMap,
    excursionOptionsWithId,
    excursionSelectionCount,
    guestExcursions,
    isExcursionEligibleForGuest,
  ]);

  const excursionSelectionKey = useMemo(
    () => serializeGuestExcursions(guestExcursions),
    [guestExcursions]
  );

  const selectedExcursionItems = useMemo(() => {
    const ids = new Set<string>();
    Object.values(guestExcursions).forEach((selections) => {
      if (!Array.isArray(selections)) return;
      selections.forEach((id) => {
        if (id) ids.add(id);
      });
    });
    if (ids.size === 0) return [];
    const lookup = new Map(
      excursionOptionsWithId.map((excursion) => [excursion.id, excursion])
    );
    const existingItems = new Map(
      (builderState.excursion?.items ?? []).map((item) => [item.id, item.name ?? null])
    );
    return Array.from(ids)
      .sort()
      .map((id) => ({
        id,
        name: lookup.get(id)?.name ?? existingItems.get(id) ?? null,
      }));
  }, [builderState.excursion?.items, excursionOptionsWithId, guestExcursions]);

  const selectedExcursionSelections = useMemo<AoryxExcursionSelection[]>(() => {
    if (excursionSelectionCount === 0 || excursionOptionsWithId.length === 0) {
      return [];
    }
    const lookup = new Map(
      excursionOptionsWithId.map((excursion) => [excursion.id, excursion])
    );
    const selections = new Map<string, AoryxExcursionSelection>();
    Object.entries(guestExcursions).forEach(([guestKey, selectionIds]) => {
      const guest = excursionGuestMap.get(guestKey);
      if (!guest) return;
      selectionIds.forEach((excursionId) => {
        const excursion = lookup.get(excursionId);
        if (!excursion) return;
        if (!isExcursionEligibleForGuest(excursion, guest)) return;
        const price = computeExcursionPrice(excursion, guest);
        if (!Number.isFinite(price.amount)) return;
        const existing = selections.get(excursionId) ?? {
          id: excursion.id,
          name: excursion.name ?? null,
          quantityAdult: 0,
          quantityChild: 0,
          priceAdult: excursion.pricing?.adult ?? null,
          priceChild: excursion.pricing?.child ?? excursion.pricing?.adult ?? null,
          currency: price.currency ?? excursion.pricing?.currency ?? null,
          childPolicy: excursion.childPolicy ?? null,
          totalPrice: 0,
        };
        if (guest.type === "Adult") {
          existing.quantityAdult = (existing.quantityAdult ?? 0) + 1;
        } else {
          existing.quantityChild = (existing.quantityChild ?? 0) + 1;
        }
        existing.totalPrice = (existing.totalPrice ?? 0) + price.amount;
        if (!existing.currency && price.currency) {
          existing.currency = price.currency;
        }
        selections.set(excursionId, existing);
      });
    });
    return Array.from(selections.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [
    computeExcursionPrice,
    excursionGuestMap,
    excursionOptionsWithId,
    excursionSelectionCount,
    guestExcursions,
    isExcursionEligibleForGuest,
  ]);

  const selectedExcursionItemsKey = useMemo(
    () => JSON.stringify(selectedExcursionItems),
    [selectedExcursionItems]
  );

  const selectedExcursionSelectionsKey = useMemo(
    () => JSON.stringify(selectedExcursionSelections),
    [selectedExcursionSelections]
  );

  const storedExcursionSelectionKey = useMemo(
    () => serializeGuestExcursions(builderState.excursion?.selections ?? {}),
    [builderState.excursion?.selections]
  );
  const storedExcursionItemsKey = useMemo(
    () => JSON.stringify(builderState.excursion?.items ?? []),
    [builderState.excursion?.items]
  );
  const storedExcursionSelectionsKey = useMemo(
    () => JSON.stringify(builderState.excursion?.selectionsDetailed ?? []),
    [builderState.excursion?.selectionsDetailed]
  );

  useEffect(() => {
    if (serviceKey !== "excursion") return;

    if (excursionSelectionCount === 0) {
      if (builderState.excursion?.selected) {
        updatePackageBuilderState((prev) => ({
          ...prev,
          excursion: undefined,
          updatedAt: Date.now(),
        }));
      }
      return;
    }

    const nextPrice = excursionTotals.amount;
    const nextCurrency = excursionTotals.currency;
    if (
      builderState.excursion?.selected &&
      storedExcursionSelectionKey === excursionSelectionKey &&
      builderState.excursion?.price === nextPrice &&
      builderState.excursion?.currency === nextCurrency &&
      storedExcursionItemsKey === selectedExcursionItemsKey &&
      storedExcursionSelectionsKey === selectedExcursionSelectionsKey
    ) {
      return;
    }

    updatePackageBuilderState((prev) => ({
      ...prev,
      excursion: {
        ...(prev.excursion ?? {}),
        selected: true,
        selectionId: prev.excursion?.selectionId ?? `excursion-${Date.now()}`,
        label: t.packageBuilder.services.excursion,
        price: nextPrice ?? null,
        currency: nextCurrency ?? null,
        selections: guestExcursions,
        items: selectedExcursionItems,
        selectionsDetailed: selectedExcursionSelections,
      },
      updatedAt: Date.now(),
    }));
  }, [
    builderState.excursion?.currency,
    builderState.excursion?.items,
    builderState.excursion?.price,
    builderState.excursion?.selected,
    builderState.excursion?.selectionsDetailed,
    excursionSelectionCount,
    excursionSelectionKey,
    selectedExcursionItems,
    selectedExcursionItemsKey,
    selectedExcursionSelections,
    selectedExcursionSelectionsKey,
    storedExcursionItemsKey,
    storedExcursionSelectionsKey,
    excursionTotals.amount,
    excursionTotals.currency,
    guestExcursions,
    serviceKey,
    storedExcursionSelectionKey,
    t.packageBuilder.services.excursion,
  ]);

  const pageCopy = t.packageBuilder.pages[serviceKey];

  const handleMarkService = () => {
    if (serviceKey === "hotel") return;
    const targetService = serviceKey as Exclude<PackageBuilderService, "hotel">;
    updatePackageBuilderState((prev) => ({
      ...prev,
      [targetService]: {
        selected: true,
        selectionId: `${serviceKey}-${Date.now()}`,
      },
      updatedAt: Date.now(),
    }));
  };

  const handleSelectTransfer = (transfer: AoryxTransferRate, selectionId: string) => {
    const originName = transfer.origin?.name ?? transfer.origin?.locationCode ?? null;
    const destinationLabel = transfer.destination?.name ?? transfer.destination?.locationCode ?? null;
    const vehicleName = transfer.vehicle?.name ?? transfer.vehicle?.category ?? null;
    const maxPaxRaw = transfer.vehicle?.maxPax ?? transfer.paxRange?.maxPax ?? null;
    const vehicleMaxPax =
      typeof maxPaxRaw === "number" && Number.isFinite(maxPaxRaw) && maxPaxRaw > 0
        ? maxPaxRaw
        : null;
    const {
      unitPrice,
      totalPrice,
      currency,
      vehicleCount,
      chargeType,
      paxCount,
    } = getTransferTotals(transfer, includeReturnTransfer, transferGuestCounts);
    const selectionPrice = totalPrice ?? unitPrice;
    const transferType = transfer.transferType ?? null;
    const origin = transfer.origin ?? (originName ? { name: originName } : undefined);
    const destination =
      transfer.destination ?? (destinationLabel ? { name: destinationLabel } : undefined);
    const vehicle =
      transfer.vehicle ??
      (vehicleName
        ? {
            name: vehicleName,
            maxPax: vehicleMaxPax ?? undefined,
          }
        : undefined);
    const pricing = transfer.pricing
      ? {
          ...transfer.pricing,
          currency: transfer.pricing.currency ?? currency ?? null,
          chargeType: transfer.pricing.chargeType ?? chargeType ?? null,
        }
      : {
          currency: currency ?? null,
          chargeType: chargeType ?? null,
          oneWay: includeReturnTransfer ? null : unitPrice,
          return: includeReturnTransfer ? unitPrice : null,
        };
    updatePackageBuilderState((prev) => ({
      ...prev,
      transfer: {
        selected: true,
        selectionId,
        destinationName,
        destinationCode,
        transferOrigin: originName,
        transferDestination: destinationLabel,
        vehicleName,
        vehicleMaxPax,
        origin: origin ?? null,
        destination: destination ?? null,
        vehicle: vehicle ?? null,
        paxRange: transfer.paxRange ?? null,
        pricing,
        validity: transfer.validity ?? null,
        chargeType: pricing?.chargeType ?? null,
        paxCount: paxCount ?? null,
        price: selectionPrice,
        currency,
        transferType,
        includeReturn: includeReturnTransfer,
        vehicleQuantity: vehicleCount ?? null,
      },
      updatedAt: Date.now(),
    }));
    openPackageBuilder();
  };

  const updateInsuranceSelection = useCallback(
    (updates: Partial<NonNullable<PackageBuilderState["insurance"]>>) => {
      updatePackageBuilderState((prev) => {
        const current = prev.insurance ?? { selected: false };
        const selectionId = current.selectionId ?? `insurance-${Date.now()}`;
        return {
          ...prev,
          insurance: {
            ...current,
            selected: true,
            selectionId,
            provider: "efes",
            ...updates,
          },
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  const handleSelectInsurancePlan = useCallback(
    (plan: InsurancePlan) => {
      if (
        insuranceSelection?.selected &&
        insuranceSelection.planId === plan.id &&
        insuranceSelection.riskAmount === plan.riskAmount &&
        insuranceSelection.riskCurrency === plan.riskCurrency &&
        insuranceSelection.riskLabel === plan.riskLabel
      ) {
        return;
      }
      const territory = insuranceTerritories[0];
      updateInsuranceSelection({
        label: plan.title,
        planId: plan.id,
        planLabel: plan.title,
        riskAmount: plan.riskAmount,
        riskCurrency: plan.riskCurrency,
        riskLabel: plan.riskLabel,
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
        quoteError: null,
        startDate: hotelSelection?.checkInDate ?? null,
        endDate: hotelSelection?.checkOutDate ?? null,
        territoryCode: insuranceSelection?.territoryCode ?? territory?.code ?? "",
        territoryLabel: insuranceSelection?.territoryLabel ?? territory?.label ?? "",
        territoryPolicyLabel:
          insuranceSelection?.territoryPolicyLabel ?? territory?.policyLabel ?? "",
        subrisks: Array.isArray(insuranceSelection?.subrisks)
          ? insuranceSelection.subrisks
          : DEFAULT_INSURANCE_SUBRISKS,
        travelCountries:
          insuranceSelection?.travelCountries ??
          t.packageBuilder.insurance.defaultTravelCountry ??
          "",
        insuredGuestIds:
          insuranceSelection?.insuredGuestIds ??
          (insuranceGuestIds.length > 0 ? insuranceGuestIds : null),
      });
      openPackageBuilder();
    },
    [
      insuranceGuestIds,
      insuranceSelection?.territoryCode,
      insuranceSelection?.territoryLabel,
      insuranceSelection?.territoryPolicyLabel,
      insuranceSelection?.insuredGuestIds,
      insuranceSelection?.planId,
      insuranceSelection?.riskAmount,
      insuranceSelection?.riskCurrency,
      insuranceSelection?.riskLabel,
      insuranceSelection?.selected,
      insuranceSelection?.subrisks,
      insuranceSelection?.travelCountries,
      insuranceTerritories,
      hotelSelection?.checkInDate,
      hotelSelection?.checkOutDate,
      t.packageBuilder.insurance.defaultTravelCountry,
      updateInsuranceSelection,
    ]
  );

  const handleUpdateInsuranceTerritory = useCallback(
    (code: string) => {
      const match = insuranceTerritories.find((item) => item.code === code);
      updateInsuranceSelection({
        territoryCode: code,
        territoryLabel: match?.label ?? "",
        territoryPolicyLabel: match?.policyLabel ?? "",
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
        quoteError: null,
      });
    },
    [insuranceTerritories, updateInsuranceSelection]
  );

  const handleToggleInsuranceGuestCoverage = useCallback((guestId: string | null) => {
    if (!insuranceSelection?.selected) return;
    if (!guestId) return;
    if (insuranceGuestIds.length === 0) return;
    const current =
      selectedInsuranceGuestIds.length > 0 ? selectedInsuranceGuestIds : insuranceGuestIds;
    const currentSet = new Set(current);
    if (currentSet.has(guestId)) {
      if (currentSet.size === 1) return;
      currentSet.delete(guestId);
    } else {
      currentSet.add(guestId);
    }
    const next = insuranceGuestIds.filter((id) => currentSet.has(id));
    if (next.length === 0) return;
    updateInsuranceSelection({
      insuredGuestIds: next,
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
      quoteError: null,
    });
  }, [
    insuranceGuestIds,
    insuranceSelection?.selected,
    selectedInsuranceGuestIds,
    updateInsuranceSelection,
  ]);

  const handleToggleInsuranceSubrisk = useCallback(
    (subriskId: string) => {
      if (!insuranceSelection?.selected) return;
      if (!activeInsuranceGuestId) return;
      const current = resolveGuestSubrisks(activeInsuranceGuestId);
      const currentSet = new Set(
        current.map((value) => value.trim()).filter((value) => value.length > 0)
      );
      if (currentSet.has(subriskId)) {
        currentSet.delete(subriskId);
      } else {
        currentSet.add(subriskId);
      }
      const next = insuranceSubriskIds.filter((id) => currentSet.has(id));
      const extras = Array.from(currentSet).filter((id) => !insuranceSubriskIds.includes(id));
      const subrisksByGuest = {
        ...(insuranceSelection.subrisksByGuest ?? {}),
        [activeInsuranceGuestId]: [...next, ...extras],
      };
      updateInsuranceSelection({ subrisksByGuest });
    },
    [
      activeInsuranceGuestId,
      insuranceSelection?.selected,
      insuranceSelection?.subrisksByGuest,
      insuranceSubriskIds,
      resolveGuestSubrisks,
      updateInsuranceSelection,
    ]
  );

  const handleInsuranceDateChange = useCallback(
    (ranges: RangeKeyDict) => {
      if (!insuranceSelection?.selected) return;
      const selection = ranges.selection;
      if (!selection?.startDate || !selection.endDate) return;
      const startDate = formatDateLocal(selection.startDate);
      const endDate = formatDateLocal(selection.endDate);
      const currentStart = insuranceSelection.startDate ?? null;
      const currentEnd = insuranceSelection.endDate ?? null;
      if (currentStart === startDate && currentEnd === endDate) {
        if (selection.startDate.getTime() !== selection.endDate.getTime()) {
          setShowInsuranceDatePicker(false);
        }
        return;
      }
      updateInsuranceSelection({
        startDate,
        endDate,
        days: calculateTripDays(startDate, endDate),
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
        quoteError: null,
      });
      if (selection.startDate.getTime() !== selection.endDate.getTime()) {
        setShowInsuranceDatePicker(false);
      }
    },
    [
      insuranceSelection?.selected,
      insuranceSelection?.startDate,
      insuranceSelection?.endDate,
      updateInsuranceSelection,
    ]
  );

  useEffect(() => {
    if (!insuranceSelection?.selected) return;
    const forcedCountry = t.packageBuilder.insurance.defaultTravelCountry;
    if (!forcedCountry) return;
    if (insuranceSelection.travelCountries === forcedCountry) return;
    updateInsuranceSelection({ travelCountries: forcedCountry });
  }, [
    insuranceSelection?.selected,
    insuranceSelection?.travelCountries,
    t.packageBuilder.insurance.defaultTravelCountry,
    updateInsuranceSelection,
  ]);

  const handleRemoveInsurance = useCallback(() => {
    updatePackageBuilderState((prev) => ({
      ...prev,
      insurance: undefined,
      updatedAt: Date.now(),
    }));
  }, []);

  const updateFlightField = useCallback((field: keyof FlightSearchForm, value: string) => {
    setFlightForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFlightSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (flightLoading) return;
      const origin = flightForm.origin.trim();
      const destination = flightForm.destination.trim();
      const departureDate = flightForm.departureDate.trim();
      if (!origin || !destination || !departureDate) {
        return;
      }

      setFlightLoading(true);
      setFlightError(null);
      setFlightMocked(false);
      setFlightSearched(true);
      try {
        const payload = {
          origin,
          destination,
          departureDate,
          returnDate: flightForm.returnDate.trim() || null,
          cabinClass: flightForm.cabinClass.trim() || null,
          adults: passengerCounts.adults || undefined,
          children: passengerCounts.children || undefined,
          currency: hotelSelection?.currency ?? "USD",
        };
        const data = await postJson<FlydubaiSearchResponse>("/api/flydubai/search", payload);
        setFlightOffers(Array.isArray(data.offers) ? data.offers : []);
        setFlightMocked(Boolean(data.mock));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t.packageBuilder.flights.loadFailed;
        setFlightError(message);
      } finally {
        setFlightLoading(false);
      }
    },
    [
      flightForm.cabinClass,
      flightForm.departureDate,
      flightForm.destination,
      flightForm.origin,
      flightForm.returnDate,
      flightLoading,
      hotelSelection?.currency,
      passengerCounts.adults,
      passengerCounts.children,
      t.packageBuilder.flights.loadFailed,
    ]
  );

  const handleSelectFlight = useCallback(
    (offer: FlydubaiFlightOffer) => {
      const outboundSegments = offer.segments ?? [];
      const origin = outboundSegments[0]?.origin ?? flightForm.origin.trim();
      const destination =
        outboundSegments[outboundSegments.length - 1]?.destination ??
        flightForm.destination.trim();
      const departureDate =
        outboundSegments[0]?.departureDateTime?.split("T")[0] ?? flightForm.departureDate.trim();
      const returnSegments = offer.returnSegments ?? [];
      const returnDate =
        returnSegments[0]?.departureDateTime?.split("T")[0] ?? flightForm.returnDate.trim();
      const cabinClass = offer.cabinClass ?? (flightForm.cabinClass.trim() || "economy");
      const label = [origin, destination].filter(Boolean).join(" → ");

      updatePackageBuilderState((prev) => ({
        ...prev,
        flight: {
          selected: true,
          selectionId: offer.id,
          label: label || t.packageBuilder.services.flight,
          price: offer.totalPrice,
          currency: offer.currency,
          origin: origin || null,
          destination: destination || null,
          departureDate: departureDate || null,
          returnDate: returnDate || null,
          cabinClass: cabinClass || null,
          notes: flightForm.notes.trim() || null,
        },
        updatedAt: Date.now(),
      }));
    },
    [
      flightForm.cabinClass,
      flightForm.departureDate,
      flightForm.destination,
      flightForm.notes,
      flightForm.origin,
      flightForm.returnDate,
      t.packageBuilder.services.flight,
    ]
  );

  const toggleExcursionForActiveGuest = (excursionId: string) => {
    if (!activeExcursionGuestId) return;
    const guest = excursionGuestMap.get(activeExcursionGuestId);
    if (!guest) return;
    const excursion = excursionOptionsWithId.find((option) => option.id === excursionId);
    if (!excursion) return;
    if (!isExcursionEligibleForGuest(excursion, guest)) return;
    setGuestExcursions((prev) => {
      const current = prev[activeExcursionGuestId] ?? [];
      const nextSelection = current.includes(excursionId)
        ? current.filter((id) => id !== excursionId)
        : [...current, excursionId];
      return { ...prev, [activeExcursionGuestId]: nextSelection };
    });
  };

  const applyActiveSelectionToAllGuests = () => {
    if (!activeExcursionGuestId || excursionGuests.length === 0) return;
    const current = guestExcursions[activeExcursionGuestId] ?? [];
    setGuestExcursions((prev) => {
      const next: Record<string, string[]> = { ...prev };
      excursionGuests.forEach((guest) => {
        const eligible = current.filter((excursionId) => {
          const excursion = excursionOptionsWithId.find((option) => option.id === excursionId);
          return excursion ? isExcursionEligibleForGuest(excursion, guest) : false;
        });
        next[guest.key] = eligible;
      });
      return next;
    });
  };

  const destinationBadge = useMemo(() => {
    if (!destinationName) return null;
    return (
      <span className="badge">
        <span className="material-symbols-rounded" aria-hidden="true">
          location_on
        </span>
        {destinationName}
      </span>
    );
  }, [destinationName]);

  const formatServicePrice = useCallback(
    (amount: number | null | undefined, currency: string | null | undefined) => {
      const normalized = normalizeAmount(amount, currency, amdRates);
      if (!normalized) return null;
      return formatCurrencyAmount(normalized.amount, normalized.currency, intlLocale);
    },
    [amdRates, intlLocale]
  );

  const formatFlightDate = useCallback((value: string | null | undefined) => {
    if (!value) return null;
    const [datePart] = value.split("T");
    if (!datePart) return null;
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return datePart;
    return `${day}.${month}.${year}`;
  }, []);

  const formatFlightDateTime = useCallback(
    (value: string | null | undefined) => {
      if (!value) return null;
      const [datePart, timePart] = value.split("T");
      const date = formatFlightDate(datePart);
      const time = timePart ? timePart.slice(0, 5) : "";
      return [date, time].filter(Boolean).join(" ");
    },
    [formatFlightDate]
  );

  const getCabinLabel = useCallback(
    (value: string | null | undefined) => {
      const normalized = value?.trim().toLowerCase();
      if (!normalized) return null;
      return cabinLabelMap.get(normalized) ?? value ?? null;
    },
    [cabinLabelMap]
  );

  const buildSegmentLine = useCallback(
    (label: string, segments: FlydubaiFlightOffer["segments"]) => {
      if (!segments || segments.length === 0) return null;
      const start = formatFlightDateTime(segments[0]?.departureDateTime);
      const end = formatFlightDateTime(segments[segments.length - 1]?.arrivalDateTime);
      if (!start && !end) return null;
      const line = [start, end].filter(Boolean).join(" \u2192 ");
      return `${label}: ${line}`;
    },
    [formatFlightDateTime]
  );

  const getStartingPrice = useCallback(
    (options: AoryxTransferRate[]) => {
      const normalized = options
        .map((transfer) => {
          const { price, currency } = getTransferPricing(transfer, includeReturnTransfer);
          return normalizeAmount(price, currency, amdRates);
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (normalized.length === 0) return null;
      const currency = normalized[0].currency;
      const amounts = normalized
        .filter((entry) => entry.currency === currency)
        .map((entry) => entry.amount);
      if (amounts.length === 0) return null;
      const minAmount = Math.min(...amounts);
      return formatCurrencyAmount(minAmount, currency, intlLocale);
    },
    [amdRates, getTransferPricing, includeReturnTransfer, intlLocale]
  );

  const individualStarting = useMemo(
    () => getStartingPrice(individualTransfers),
    [getStartingPrice, individualTransfers]
  );
  const groupStarting = useMemo(
    () => getStartingPrice(groupTransfers),
    [getStartingPrice, groupTransfers]
  );

  const renderTransferTypeGroup = () => {
    if (!hasHotel) return null;
    if (transferMissingDestination) return null;
    if (transferLoading) return null;
    if (transferError) return null;
    if (filteredTransferOptions.length === 0) return null;

    const hasIndividualOptions = individualTransfers.length > 0;
    const hasGroupOptions = groupTransfers.length > 0;
    const individualLabel = individualStarting
      ? `${t.packageBuilder.transfers.startingFrom} ${individualStarting}`
      : t.common.contactForRates;
    const groupLabel = groupStarting
      ? `${t.packageBuilder.transfers.startingFrom} ${groupStarting}`
      : t.common.contactForRates;

    return (
      <div className="service-types transfer">
        <button
          type="button"
          className={`${selectedTransferType === "INDIVIDUAL" ? "is-selected" : ""}`}
          onClick={() => setSelectedTransferType("INDIVIDUAL")}
          aria-pressed={selectedTransferType === "INDIVIDUAL"}
        >
          <span>
            <h2>{t.packageBuilder.transfers.individual}</h2>
            {hasIndividualOptions ? (
              <>
                <span>{individualLabel}</span>
                <span className="note">
                  {t.packageBuilder.transfers.perCar}
                </span>
              </>
            ) : null}
          </span>
          <Image
            src="/images/car.webp"
            alt={t.packageBuilder.transfers.individual}
            width={140}
            height={90}
            unoptimized
          />
        </button>
        <button
          type="button"
          className={`${selectedTransferType === "GROUP" ? "is-selected" : ""}`}
          onClick={() => setSelectedTransferType("GROUP")}
          aria-pressed={selectedTransferType === "GROUP"}
        >
          <span>
            <h2>{t.packageBuilder.transfers.group}</h2>
            {hasGroupOptions ? (
              <>
                <span>{groupLabel}</span>
                <span className="note">
                  {t.packageBuilder.transfers.perPax}
                </span>
              </>
            ) : null}
          </span>
          <Image
            src="/images/bus.webp"
            alt={t.packageBuilder.transfers.group}
            width={140}
            height={90}
            unoptimized
          />
        </button>
      </div>
    );
  };

  const renderExcursionControls = () => {
    if (serviceKey !== "excursion") return null;
    if (!hasHotel) return null;
    if (excursionLoading) return null;
    if (excursionError) return null;
    if (excursionOptionsWithId.length === 0) return null;

    const allCountLabel = formatPlural(
      excursionOptionsWithId.length,
      t.packageBuilder.excursions.countLabel
    );
    const yasCountLabel = formatPlural(
      yasExcursions.length,
      t.packageBuilder.excursions.countLabel
    );
    const safariCountLabel = formatPlural(
      safariExcursions.length,
      t.packageBuilder.excursions.countLabel
    );
    const cruiseCountLabel = formatPlural(
      cruiseExcursions.length,
      t.packageBuilder.excursions.countLabel
    );
    const burjCountLabel = formatPlural(
      burjExcursions.length,
      t.packageBuilder.excursions.countLabel
    );
    const helicopterCountLabel = formatPlural(
      helicopterExcursions.length,
      t.packageBuilder.excursions.countLabel
    );
    const safariLabel = "Safari";
    const cruiseLabel = "Cruise";
    const burjLabel = "Burj Khalifa";
    const helicopterLabel = "Helicopter";

    return (
      <>
      <div className="videoWrap">
        <video src="/videos/dubai.mp4" autoPlay muted loop playsInline />
      </div>
        <div className="service-types excursion">
          <button
            type="button"
            className={`${excursionFilter === "YAS" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("YAS")}
            aria-pressed={excursionFilter === "YAS"}
          >
            <span>
              <h2>{t.packageBuilder.excursions.yasLabel}</h2>
              <span className="note">
                {yasCountLabel}
              </span>
            </span>
            <Image
              src="/images/yas-island.webp"
              alt={t.packageBuilder.excursions.yasLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
          <button
            type="button"
            className={`${excursionFilter === "SAFARI" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("SAFARI")}
            aria-pressed={excursionFilter === "SAFARI"}
          >
            <span>
              <h2>{safariLabel}</h2>
              <span className="note">
                {safariCountLabel}
              </span>
            </span>
            <Image
              src="/images/safari.webp"
              alt={safariLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
          <button
            type="button"
            className={`${excursionFilter === "CRUISE" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("CRUISE")}
            aria-pressed={excursionFilter === "CRUISE"}
          >
            <span>
              <h2>{cruiseLabel}</h2>
              <span className="note">
                {cruiseCountLabel}
              </span>
            </span>
            <Image
              src="/images/cruise.webp"
              alt={cruiseLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
          <button
            type="button"
            className={`${excursionFilter === "BURJ" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("BURJ")}
            aria-pressed={excursionFilter === "BURJ"}
          >
            <span>
              <h2>{burjLabel}</h2>
              <span className="note">
                {burjCountLabel}
              </span>
            </span>
            <Image
              src="/images/burj-khalifa.webp"
              alt={burjLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
          <button
            type="button"
            className={`${excursionFilter === "HELICOPTER" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("HELICOPTER")}
            aria-pressed={excursionFilter === "HELICOPTER"}
          >
            <span>
              <h2>{helicopterLabel}</h2>
              <span className="note">
                {helicopterCountLabel}
              </span>
            </span>
            <Image
              src="/images/helicopter.webp"
              alt={helicopterLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
          <button
            type="button"
            className={`${excursionFilter === "ALL" ? " is-selected" : ""}`}
            onClick={() => setExcursionFilter("ALL")}
            aria-pressed={excursionFilter === "ALL"}
          >
            <span>
              <h2>{t.packageBuilder.excursions.allLabel}</h2>
              <span className="note">
                {allCountLabel}
              </span>
            </span>
            <Image
              src="/images/all-attractions.webp"
              alt={t.packageBuilder.excursions.allLabel}
              width={140}
              height={90}
              unoptimized
            />
          </button>
        </div>
        {excursionGuests.length > 1 ? (
          <div className="controls">
            <div className="guest-tabs">
              {excursionGuests.map((guest) => {
                const count = guestExcursions[guest.key]?.length ?? 0;
                return (
                  <button
                    key={guest.key}
                    type="button"
                    className={`guest-tab${guest.key === activeExcursionGuestId ? " is-active" : ""}`}
                    onClick={() => setActiveExcursionGuestId(guest.key)}
                    disabled={!canSelectExcursions}
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">person</span>
                    <span>{guest.label}</span>
                    {count > 0 ? <span className="excursion-guest-count">{count}</span> : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="apply-all"
              onClick={applyActiveSelectionToAllGuests}
              disabled={!canSelectExcursions || !activeExcursionGuestId}
            >
              <span className="material-symbols-rounded" aria-hidden="true">group_add</span>
              {t.hotel.addons.excursions.applyAll}
              {excursionGuests.length > 0 ? ` (${excursionGuests.length})` : ""}
            </button>
          </div>
        ) : null}
      </>
    );
  };

  const renderInsurancePlans = () => {
    if (serviceKey !== "insurance") return null;
    if (!hasHotel) return null;
    const selectedPlanId = insuranceSelection?.planId ?? null;
    return (
      <>
      <div className="videoWrap">
        <video src="/videos/efes.mp4" autoPlay muted loop playsInline />
      </div>
      <div className="service-types insurance">
        {insurancePlans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const coverage = formatCoverageAmount(plan.riskAmount, plan.riskCurrency);
          return (
            <button
              key={plan.id}
              type="button"
              className={`${isSelected ? "is-selected" : ""}`}
              onClick={() => handleSelectInsurancePlan(plan)}
              aria-pressed={isSelected}
            >
              <h2>{plan.title}</h2>
              {/* <p>{plan.description}</p> */}
              <span>{t.packageBuilder.insurance.coverageLabel.replace("{amount}", coverage)}</span>
            </button>
          );
        })}
      </div>
      </>
    );
  };

  const renderInsuranceControls = () => {
    if (serviceKey !== "insurance") return null;
    if (!hasHotel) return null;
    const selectedTerritory =
      insuranceSelection?.territoryCode ?? insuranceTerritories[0]?.code ?? "";
    const travelCountries = t.packageBuilder.insurance.defaultTravelCountry ?? "";
    const showGuestSelection = insuranceGuests.length > 1;

    return (
      <div className="controls">
        <label className="checkout-field" style={{display:"none"}}>
          <span>{t.packageBuilder.insurance.territoryLabel}</span>
          <select
            className="checkout-input"
            value={selectedTerritory}
            onChange={(event) => handleUpdateInsuranceTerritory(event.target.value)}
            disabled={!insuranceSelection?.selected}
          >
            {insuranceTerritories.map((territory) => (
              <option key={territory.code} value={territory.code}>
                {territory.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkout-field">
          <span>{t.packageBuilder.insurance.travelCountriesLabel}</span>
          <input
            className="checkout-input"
            value={travelCountries}
            readOnly
            aria-readonly="true"
            type="hidden"
            disabled={!insuranceSelection?.selected}
          />
        </label>
        {showGuestSelection ? (
          <>
            <div className="guest-tabs">
              {insuranceGuests.map((guest) => {
                const isSelected = guest.id === activeInsuranceGuestId;
                const isExcluded = !selectedInsuranceGuestIdSet.has(guest.id);
                const toggleDisabled =
                  !insuranceSelection?.selected ||
                  (!isExcluded && selectedInsuranceGuestIds.length <= 1);
                const toggleLabel = isExcluded
                  ? t.packageBuilder.insurance.guestToggleAdd
                  : t.packageBuilder.insurance.guestToggleRemove;
                const toggleIcon = isExcluded ? "add" : "close";
                return (
                  <div
                    key={guest.id}
                    className={`guest-tab-shell${isExcluded ? " is-excluded" : ""}`}
                  >
                    <button
                      type="button"
                      className={`guest-tab${isSelected ? " is-active" : ""}${isExcluded ? " is-excluded" : ""}`}
                      onClick={() => setActiveInsuranceGuestId(guest.id)}
                      disabled={!insuranceSelection?.selected}
                      aria-pressed={isSelected}
                    >
                      <span className="material-symbols-rounded" aria-hidden="true">person</span>
                      <span>{guest.label}</span>
                    </button>
                    <button
                      type="button"
                      className={`guest-tab-remove${isExcluded ? " is-add" : " is-remove"}`}
                      onClick={() => {
                        if (isExcluded) {
                          setActiveInsuranceGuestId(guest.id);
                        }
                        handleToggleInsuranceGuestCoverage(guest.id);
                      }}
                      disabled={toggleDisabled}
                      aria-label={toggleLabel}
                    >
                      <span className="material-symbols-rounded" aria-hidden="true">
                        {toggleIcon}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
        <div
          className="insurance-date-picker"
          ref={insuranceDatePickerRef}
        >
          <span>
            {t.packageBuilder.insurance.startDateLabel} / {t.packageBuilder.insurance.endDateLabel}
          </span>
          <button
            type="button"
            className="date-picker"
            onClick={() => setShowInsuranceDatePicker((prev) => !prev)}
            disabled={!insuranceSelection?.selected}
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              date_range
            </span>
            <span>
              {insuranceDateRange.startDate && insuranceDateRange.endDate
                ? (
                  <>
                    {formatDateDisplay(insuranceDateRange.startDate)}{" "}
                    <span className="material-symbols-rounded" aria-hidden="true">
                      arrow_forward
                    </span>{" "}
                    {formatDateDisplay(insuranceDateRange.endDate)}
                  </>
                )
                : t.search.datePlaceholder}
            </span>
          </button>
          {showInsuranceDatePicker && insuranceSelection?.selected ? (
            <div>
              <DateRange
                ranges={[insuranceDateRange]}
                minDate={new Date()}
                onChange={handleInsuranceDateChange}
                rangeColors={["#10b981"]}
                moveRangeOnFirstSelection={false}
                showMonthAndYearPickers
                direction="vertical"
                locale={dateFnsLocale}
              />
            </div>
          ) : null}
        </div>
        
      </div>
    );
  };

  const renderTransferReturnToggle = () => {
    if (!hasHotel) return null;
    if (transferMissingDestination) return null;
    if (transferLoading) return null;
    if (transferError) return null;
    if (filteredTransferOptions.length === 0) return null;

    return (
      <label className="transfer-return-toggle">
        <input
          type="checkbox"
          checked={includeReturnTransfer}
          onChange={(event) => setIncludeReturnTransfer(event.target.checked)}
        />
        <span>{t.hotel.addons.transfers.includeReturn}</span>
      </label>
    );
  };

  const renderTransferAirportSelect = () => {
    if (!hasHotel) return null;
    if (transferMissingDestination) return null;
    if (transferLoading) return null;
    if (transferError) return null;
    if (filteredTransferOptions.length === 0) return null;
    if (airportOptions.length === 0) return null;

    return (
      <label className="transfer-airport-select">
        <span className="material-symbols-rounded">connecting_airports</span>
        <span>{t.hotel.addons.transfers.airportLabel}</span>
        <select
          value={activeAirportKey ?? ""}
          onChange={(event) => setSelectedAirportKey(event.target.value)}
        >
          {airportOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const renderTransferList = () => {
    if (!hasHotel) {
      return (
        <div className="empty">
          <p>{t.packageBuilder.warningSelectHotel}</p>
          <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
            {t.packageBuilder.services.hotel}
          </Link>
        </div>
      );
    }
    if (transferMissingDestination) {
      return <p className="state error">{t.hotel.addons.transfers.missingDestination}</p>;
    }
    if (transferLoading) {
      return <p className="state">{t.hotel.addons.transfers.loading}</p>;
    }
    if (transferError) {
      return <p className="state error">{transferError}</p>;
    }
    if (filteredTransferOptions.length === 0) {
      return <p className="tate">{t.hotel.addons.transfers.noOptions}</p>;
    }

    const activeTransfers =
      selectedTransferType === "GROUP"
        ? groupTransfers
        : selectedTransferType === "INDIVIDUAL"
          ? individualTransfers
          : [];

    if (!selectedTransferType) {
      return <p className="state">{t.packageBuilder.transfers.selectType}</p>;
    }

    if (activeTransfers.length === 0) {
      return <p className="state">{t.hotel.addons.transfers.noOptions}</p>;
    }

    return (
      <div className="transfers options" role="list">
        {activeTransfers.map((transfer, index) => {
          const id = transferIdMap.get(transfer) ?? buildTransferId(transfer, index);
          const isSelected = selectedTransferId === id;
          const origin = transfer.origin?.name ?? transfer.origin?.locationCode ?? "—";
          const destination = transfer.destination?.name ?? transfer.destination?.locationCode ?? "—";
          const destinationLabel = selectedHotelName
            ? selectedHotelName
            : destination;
          const transferType = normalizeTransferType(transfer.transferType);
          const vehicleName = transfer.vehicle?.name ?? transfer.vehicle?.category ?? null;
          const { unitPrice, totalPrice, currency, chargeType, vehicleCount } = getTransferTotals(
            transfer,
            includeReturnTransfer,
            transferGuestCounts
          );
          const resolvedCurrency = currency ?? "USD";
          const normalizedUnitPrice = normalizeAmount(unitPrice, resolvedCurrency, amdRates);
          const formattedUnitPrice = normalizedUnitPrice
            ? formatCurrencyAmount(normalizedUnitPrice.amount, normalizedUnitPrice.currency, intlLocale)
            : null;
          const normalizedTotalPrice = normalizeAmount(totalPrice, resolvedCurrency, amdRates);
          const formattedTotalPrice = normalizedTotalPrice
            ? formatCurrencyAmount(normalizedTotalPrice.amount, normalizedTotalPrice.currency, intlLocale)
            : null;
          const unitSuffix =
            chargeType === "PER_PAX"
              ? t.packageBuilder.transfers.perPax
              : t.packageBuilder.transfers.perCar;
          const totalGuestCount = transferGuestCounts.total;
          const childPolicyParts: string[] = [];
          if (transferGuestCounts.childFree > 0) {
            childPolicyParts.push(
              formatPlural(
                transferGuestCounts.childFree,
                t.packageBuilder.transfers.childPolicyFree
              )
            );
          }
          if (transferGuestCounts.childHalf > 0) {
            childPolicyParts.push(
              formatPlural(
                transferGuestCounts.childHalf,
                t.packageBuilder.transfers.childPolicyHalf
              )
            );
          }
          const childPolicyLine =
            transferType === "GROUP" && childPolicyParts.length > 0
              ? `${t.packageBuilder.transfers.childPolicyLabel}: ${childPolicyParts.join(" · ")}`
              : null;
          const maxPaxRaw = transfer.vehicle?.maxPax ?? transfer.paxRange?.maxPax ?? null;
          const maxPax =
            typeof maxPaxRaw === "number" && Number.isFinite(maxPaxRaw) && maxPaxRaw > 0
              ? maxPaxRaw
              : null;
          const individualLabel =
            maxPax && /\d+/.test(t.packageBuilder.transfers.individual)
              ? t.packageBuilder.transfers.individual.replace(/\d+/, maxPax.toString())
              : t.packageBuilder.transfers.individual;
          const typeLabel =
            transferType === "GROUP"
              ? t.packageBuilder.transfers.group
              : transferType === "INDIVIDUAL"
                ? individualLabel
                : t.packageBuilder.services.transfer;
          return (
            <div
              key={id}
              className={`option${isSelected ? " is-selected" : ""}`}
              role="listitem"
            >
              <div>
                <h3 className="route">
                  {origin}{" "}
                  <span className="material-symbols-rounded">{includeReturnTransfer ? "sync_alt" : "arrow_right_alt"}</span>
                  {destinationLabel}
                </h3>
                <p className="meta type">
                  <span className="material-symbols-rounded">{transferType === "GROUP" ? "groups" : "person"}</span>
                  {typeLabel}
                </p>
                {transferType === "INDIVIDUAL" && vehicleName ? (
                  <p className="meta">
                    <span className="material-symbols-rounded">directions_car</span>
                    {t.packageBuilder.checkout.labels.vehicle}: {vehicleName}
                  </p>
                ) : null}
                {transferType === "INDIVIDUAL" && vehicleCount ? (
                  <p className="meta">
                    <span className="material-symbols-rounded">numbers</span>
                    {t.hotel.addons.transfers.vehicleQty}: {vehicleCount}
                  </p>
                ) : null}
                {formattedUnitPrice ? (
                  <p className="meta">
                    <span className="material-symbols-rounded">sell</span>
                    {t.packageBuilder.checkout.labels.price}: {formattedUnitPrice} · {unitSuffix}
                  </p>
                ) : null}
                {childPolicyLine ? (
                  <p className="meta"><span className="material-symbols-rounded">child_care</span>{childPolicyLine}</p>
                ) : null}
                {formattedTotalPrice && totalGuestCount > 0 ? (
                  <p className="meta rate">
                    {t.common.total} ({t.packageBuilder.checkout.labels.guests}: {totalGuestCount}):{" "}
                    {formattedTotalPrice}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="service-builder__cta"
                onClick={() => handleSelectTransfer(transfer, id)}
              >
                {isSelected ? <><span className="material-symbols-rounded">check</span> {t.packageBuilder.selectedTag}</> : <><span className="material-symbols-rounded">add_2</span>{t.packageBuilder.addTag}</>}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFlightPanel = () => {
    if (!hasHotel) {
      return (
        <div className="panel">
          <div className="empty">
            <p>{t.packageBuilder.warningSelectHotel}</p>
            <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
              {t.packageBuilder.services.hotel}
            </Link>
          </div>
        </div>
      );
    }

    const searchLabel = flightLoading
      ? t.packageBuilder.flights.searching
      : t.packageBuilder.flights.searchButton;

    const offersContent = (() => {
      if (flightLoading) {
        return <Loader text={t.packageBuilder.flights.searching} />;
      }
      if (flightError) {
        return <p className="state error">{flightError}</p>;
      }
      if (!flightSearched) {
        return <p className="state">{t.packageBuilder.flights.searchPrompt}</p>;
      }
      if (flightOffers.length === 0) {
        return <p className="state">{t.packageBuilder.flights.noOptions}</p>;
      }

      return (
        <div className="package-service__list" role="list">
          {flightOffers.map((offer) => {
            const outboundSegments = offer.segments ?? [];
            const outboundOrigin = outboundSegments[0]?.origin ?? flightForm.origin;
            const outboundDestination =
              outboundSegments[outboundSegments.length - 1]?.destination ??
              flightForm.destination;
            const outboundLine = buildSegmentLine(
              t.hotel.addons.flights.departureLabel,
              outboundSegments
            );
            const returnSegments = offer.returnSegments ?? [];
            const returnLine =
              returnSegments.length > 0
                ? buildSegmentLine(t.hotel.addons.flights.returnLabel, returnSegments)
                : null;
            const cabinLabel = getCabinLabel(offer.cabinClass ?? flightForm.cabinClass);
            const priceLabel = formatServicePrice(offer.totalPrice, offer.currency);
            const metaParts: string[] = [];
            if (cabinLabel) {
              metaParts.push(`${t.hotel.addons.flights.cabinLabel}: ${cabinLabel}`);
            }
            if (priceLabel) {
              metaParts.push(`${t.packageBuilder.checkout.labels.price}: ${priceLabel}`);
            }
            const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : null;
            const isSelected = selectedFlightId === offer.id;

            return (
              <div
                key={offer.id}
                className={`option${isSelected ? " is-selected" : ""}`}
                role="listitem"
              >
                <div>
                  <h3 className="oute">
                    {outboundOrigin} → {outboundDestination}
                  </h3>
                  {outboundLine && <p className="meta">{outboundLine}</p>}
                  {returnLine && <p className="meta">{returnLine}</p>}
                  {metaLine && <p className="meta">{metaLine}</p>}
                </div>
                <button
                  type="button"
                  className="service-builder__cta"
                  onClick={() => handleSelectFlight(offer)}
                >
                  {isSelected ? t.packageBuilder.selectedTag : t.packageBuilder.addTag}
                </button>
              </div>
            );
          })}
        </div>
      );
    })();

    return (
      <>
      <div className="search">
        <form className="flight-search" onSubmit={handleFlightSearch}>
            <label>
              <input
                type="text"
                value={flightForm.origin}
                onChange={(event) => updateFlightField("origin", event.target.value)}
                required
                placeholder={t.hotel.addons.flights.originLabel}
              />
            </label>
            <label>
              <input
                type="text"
                value={flightForm.destination}
                onChange={(event) => updateFlightField("destination", event.target.value)}
                required
                placeholder={t.hotel.addons.flights.destinationLabel}
              />
            </label>
            <label>
              <input
                type="date"
                value={flightForm.departureDate}
                onChange={(event) => updateFlightField("departureDate", event.target.value)}
                required
                placeholder={t.hotel.addons.flights.departureLabel}
              />
            </label>
            <label>
              <input
                type="date"
                value={flightForm.returnDate}
                onChange={(event) => updateFlightField("returnDate", event.target.value)}
                placeholder={t.hotel.addons.flights.returnLabel}
              />
            </label>
            <label className="addon-field">
              <span>{t.hotel.addons.flights.cabinLabel}</span>
              <select
                value={flightForm.cabinClass}
                onChange={(event) => updateFlightField("cabinClass", event.target.value)}
              >
                {cabinOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          <div className="flight-search__actions">
            <button type="submit" className="service-builder__cta" disabled={flightLoading}>
              <span className="material-symbols-rounded" aria-hidden="true">search</span>
              {searchLabel}
            </button>
            <div className="flight-search__badges">
              {passengerSummary && (
                <span className="badge">
                  <span className="material-symbols-rounded" aria-hidden="true">
                    group
                  </span>
                  {passengerSummary}
                </span>
              )}
              {flightMocked && flightSearched && (
                <span className="badge">
                  <span className="material-symbols-rounded" aria-hidden="true">
                    info
                  </span>
                  {t.packageBuilder.flights.demoNote}
                </span>
              )}
            </div>
          </div>
          <StarBorder
            as="div"
            color="#34d399"
            speed="5s"
            thickness={2}
          > </StarBorder>
        </form>
      </div>
      <div className="panel">
        <p className="service-builder__note">{pageCopy.note}</p>
        <div className="flight-results">{offersContent}</div>
      </div>
      </>
    );
  };

  const renderExcursionList = () => {
    if (!hasHotel) {
      return (
        <div className="empty">
          <p>{t.packageBuilder.warningSelectHotel}</p>
          <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
            {t.packageBuilder.services.hotel}
          </Link>
        </div>
      );
    }
    if (excursionLoading) {
      return <p className="state">{t.hotel.addons.excursions.loading}</p>;
    }
    if (excursionError) {
      return <p className="state error">{excursionError}</p>;
    }
    if (excursionOptionsWithId.length === 0) {
      return <p className="state">{t.hotel.addons.excursions.noOptions}</p>;
    }

    const activeGuest = activeExcursionGuestId
      ? excursionGuestMap.get(activeExcursionGuestId) ?? null
      : null;

    return (
      <>
        {visibleExcursions.length === 0 ? (
          <p className="state">{t.packageBuilder.excursions.noMatch}</p>
        ) : (
          <>
        {hasHotel && excursionGuests.length === 0 && (
          <p className="state">{t.hotel.errors.unableBuildGuests}</p>
        )}
        <div className="excursions options">
          {visibleExcursions.map((excursion) => {
            const id = excursion.id;
            const isSelected = activeExcursionSelection.includes(id);
            const isEligible = activeGuest ? isExcursionEligibleForGuest(excursion, activeGuest) : true;
            const isDisabled = !canSelectExcursions || !activeExcursionGuestId || !isEligible;
            const logo = getExcursionLogo(excursion);
            const logoStyle = logo
              ? ({ "--excursion-logo": `url(${logo})` } as CSSProperties)
              : undefined;
            const currency = excursion.pricing?.currency ?? null;
            const adultPrice = excursion.pricing?.adult ?? null;
            const childPrice = excursion.pricing?.child ?? adultPrice;
            const feeAlreadyApplied =
              (excursion.pricing as { feeApplied?: unknown })?.feeApplied === true;
            const feeToApply = feeAlreadyApplied ? 0 : excursionFee ?? 0;
            const adultDisplay =
              typeof adultPrice === "number" ? adultPrice + feeToApply : null;
            const childDisplay =
              typeof childPrice === "number" ? childPrice + feeToApply : null;
            const formattedAdult = formatServicePrice(adultDisplay, currency);
            const formattedChild = formatServicePrice(childDisplay, currency);
            return (
              <label
                key={id}
                className={`option selectable${isSelected ? " is-selected" : ""}${isDisabled ? " is-disabled" : ""}`}
                style={logoStyle}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleExcursionForActiveGuest(id)}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                />
                <div className="content">
                  <div className="info">
                    <div>
                      <h5>{excursion.name ?? t.hotel.addons.excursions.unnamed}</h5>
                      {excursion.description && <p>{excursion.description}</p>}
                    </div>
                    {excursion.childPolicy && (
                      <span className="policy">{excursion.childPolicy}</span>
                    )}
                  </div>
                  <div className="pricing">
                    <span>
                      {t.hotel.addons.excursions.adultPrice}:{" "}
                      {formattedAdult ?? t.common.contact}
                    </span>
                    <span>
                      {t.hotel.addons.excursions.childPrice}:{" "}
                      {formattedChild ?? t.common.contact}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
          </>
        )}
      </>
    );
  };

  const renderInsurancePanel = () => {
    if (!hasHotel) {
      return (
        <div className="empty">
          <p>{t.packageBuilder.warningSelectHotel}</p>
          <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
            {t.packageBuilder.services.hotel}
          </Link>
        </div>
      );
    }

    const selectedPlanId = insuranceSelection?.planId ?? null;
    const selectedTerritory =
      insuranceSelection?.territoryCode ?? insuranceTerritories[0]?.code ?? "";
    const selectedPlan =
      insurancePlans.find((plan) => plan.id === selectedPlanId) ?? null;
    const selectedTerritoryLabel =
      insuranceTerritories.find((territory) => territory.code === selectedTerritory)?.label ?? "";
    const travelCountries = t.packageBuilder.insurance.defaultTravelCountry ?? "";
    const showInsuranceDetails = insuranceSelection?.selected === true;
    const quoteCurrency =
      insuranceSelection?.currency ?? insuranceSelection?.riskCurrency ?? null;
    const quotePremiumsByGuest = insuranceSelection?.quotePremiumsByGuest ?? null;
    const quoteSumByGuest = insuranceSelection?.quoteSumByGuest ?? null;
    const quoteDiscountedSumByGuest = insuranceSelection?.quoteDiscountedSumByGuest ?? null;
    const priceCoverages = insuranceSelection?.quotePriceCoverages ?? null;
    const discountedPriceCoverages =
      insuranceSelection?.quoteDiscountedPriceCoverages ?? null;
    const priceCoveragesByGuest = insuranceSelection?.quotePriceCoveragesByGuest ?? null;
    const discountedPriceCoveragesByGuest =
      insuranceSelection?.quoteDiscountedPriceCoveragesByGuest ?? null;
    const coverageCurrency = insuranceSelection?.currency ?? "AMD";
    const formatQuoteValue = (value: number | null | undefined) => {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      return (
        formatCurrencyAmount(value, quoteCurrency, intlLocale) ?? value.toString()
      );
    };
    const selectedCoverage = selectedPlan
      ? formatCoverageAmount(selectedPlan.riskAmount, selectedPlan.riskCurrency)
      : null;
    const selectedPlanCoverages = Array.isArray(selectedPlan?.coverages)
      ? selectedPlan.coverages.map((item) => item.trim()).filter((item) => item.length > 0)
      : [];
    const insuranceDayCount = calculateTripDays(
      insuranceStartDateRaw,
      insuranceEndDateRaw
    );
    const insuranceDaysLabel =
      typeof insuranceDayCount === "number"
        ? t.packageBuilder.insurance.daysLabel.replace(
            "{count}",
            insuranceDayCount.toString()
          )
        : null;
    const roamingLabel = t.packageBuilder.insurance.roamingLabel.trim();
    const summaryTitle = selectedPlan?.title ?? t.packageBuilder.services.insurance;
    const insuranceQuoteErrorLabel =
      insuranceQuoteError ?? insuranceSelection?.quoteError ?? null;
    const activeGuestCovered =
      activeInsuranceGuestId ? selectedInsuranceGuestIdSet.has(activeInsuranceGuestId) : true;
    const activeGuestPriceCoverages =
      activeInsuranceGuestId && activeGuestCovered
        ? priceCoveragesByGuest?.[activeInsuranceGuestId] ?? null
        : null;
    const activeGuestDiscountedPriceCoverages =
      activeInsuranceGuestId && activeGuestCovered
        ? discountedPriceCoveragesByGuest?.[activeInsuranceGuestId] ?? null
        : null;
    const useAggregateCoverages =
      !activeGuestPriceCoverages &&
      !activeGuestDiscountedPriceCoverages &&
      selectedInsuranceGuestIds.length <= 1;
    const resolvedPriceCoverages =
      activeGuestPriceCoverages ?? (useAggregateCoverages ? priceCoverages : null);
    const resolvedDiscountedPriceCoverages =
      activeGuestDiscountedPriceCoverages ??
      (useAggregateCoverages ? discountedPriceCoverages : null);
    const activeGuestSumValue =
      activeInsuranceGuestId && activeGuestCovered && quoteSumByGuest
        ? quoteSumByGuest[activeInsuranceGuestId]
        : null;
    const activeGuestDiscountedSumValue =
      activeInsuranceGuestId && activeGuestCovered && quoteDiscountedSumByGuest
        ? quoteDiscountedSumByGuest[activeInsuranceGuestId]
        : null;
    const activeGuestPremiumValue =
      activeInsuranceGuestId && activeGuestCovered && quotePremiumsByGuest
        ? quotePremiumsByGuest[activeInsuranceGuestId]
        : null;
    const formattedActiveGuestPremium = formatQuoteValue(activeGuestPremiumValue);
    const formattedActiveGuestSum = formatQuoteValue(activeGuestSumValue);
    const formattedActiveGuestDiscountedSum = formatQuoteValue(activeGuestDiscountedSumValue);
    const summaryQuote = showInsuranceDetails
      ? insuranceQuoteLoading
        ? t.packageBuilder.insurance.quoteLoading
        : insuranceQuoteErrorLabel
          ? insuranceQuoteErrorLabel
          : `${t.packageBuilder.insurance.quoteLabel}:${
              formattedActiveGuestPremium ? "" : " —"
            }`
      : `${t.packageBuilder.insurance.quoteLabel}: —`;
    const showQuoteBreakdown =
      showInsuranceDetails && !insuranceQuoteLoading && !insuranceQuoteErrorLabel;
    const showSumLabel = showQuoteBreakdown && formattedActiveGuestSum;
    const showDiscountedSumLabel =
      showQuoteBreakdown &&
      formattedActiveGuestDiscountedSum &&
      (!formattedActiveGuestSum ||
        (typeof activeGuestSumValue === "number" &&
          typeof activeGuestDiscountedSumValue === "number" &&
          Math.abs(activeGuestSumValue - activeGuestDiscountedSumValue) > 0.001));
    const resolveSubriskRate = (subriskId: string, isSelected: boolean) => {
      if (!activeGuestCovered) return null;
      if (!resolvedPriceCoverages && !resolvedDiscountedPriceCoverages) return null;
      const candidates = [subriskId, subriskId.toUpperCase(), subriskId.toLowerCase()];
      let baseValue: number | null = null;
      let discountedValue: number | null = null;
      for (const key of candidates) {
        const value = resolvedPriceCoverages?.[key];
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          baseValue = value;
          break;
        }
      }
      for (const key of candidates) {
        const value = resolvedDiscountedPriceCoverages?.[key];
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          discountedValue = value;
          break;
        }
      }
      const format = (value: number | null) => {
        if (value === null) return null;
        return formatCurrencyAmount(value, coverageCurrency, intlLocale) ?? value.toString();
      };
      const baseLabel = format(baseValue);
      const discountedLabel = format(discountedValue);
      if (!baseLabel && !discountedLabel) return null;
      const hasDiscount =
        isSelected &&
        discountedValue !== null &&
        (baseValue === null || Math.abs(baseValue - discountedValue) > 0.001);
      if (!hasDiscount) return baseLabel ?? discountedLabel;
      if (baseLabel && discountedLabel) return `${baseLabel} / ${discountedLabel}`;
      return baseLabel ?? discountedLabel;
    };
    const subriskIconMap: Record<string, string> = {
      amateur_sport_expences: "/images/icons/dangerous-sport.webp",
      baggage_expences: "/images/icons/baggage.webp",
      travel_inconveniences: "/images/icons/travel-inconveniences.webp",
      house_insurance: "/images/icons/home-insurance.webp",
      trip_cancellation: "/images/icons/trip-cancellation.webp",
    };
    const resolveSubriskIcon = (subriskId: string) =>
      subriskIconMap[subriskId.toLowerCase()] ?? null;

    return (
      <>
        {insuranceSelection?.selected &&
          <div className="options">
            <div
              className={`option insurance${showInsuranceDetails ? " is-selected" : ""}`}
            >
              <div className="details">
                <h2 className="route">{t.packageBuilder.insurance.programTitle} {summaryTitle}</h2>
                  {showInsuranceDetails && selectedCoverage ? (
                    <div className="meta">
                      <span className="material-symbols-rounded" aria-hidden="true">
                        verified
                      </span>
                      {t.packageBuilder.insurance.coverageLabel.replace("{amount}", selectedCoverage)}
                    </div>
                  ) : null}
                  {showInsuranceDetails && selectedTerritoryLabel ? (
                    <div className="meta">
                      <span className="material-symbols-rounded" aria-hidden="true">
                        public
                      </span>
                      {t.packageBuilder.insurance.territoryLabel} {selectedTerritoryLabel}
                    </div>
                  ) : null}
                  {showInsuranceDetails && travelCountries ? (
                    <div className="meta">
                      <span className="material-symbols-rounded" aria-hidden="true">
                        flag
                      </span>
                      {t.packageBuilder.insurance.travelCountriesLabel} {travelCountries}
                    </div>
                  ) : null}
                  {showInsuranceDetails && insuranceDaysLabel ? (
                    <div className="meta">
                      <span className="material-symbols-rounded" aria-hidden="true">
                        calendar_month
                      </span>
                      {insuranceDaysLabel}
                    </div>
                  ) : null}
                  {showInsuranceDetails && roamingLabel ? (
                    <div className="meta">
                      <span className="material-symbols-rounded" aria-hidden="true">
                        wifi
                      </span>
                      <span>{roamingLabel}</span>
                    </div>
                  ) : null}
                  <div className="meta rate">
                    {summaryQuote}
                    {/* {quotePremiumLabel ? <span>{quotePremiumLabel}</span> : null} */}
                    {showSumLabel ? <span>{formattedActiveGuestSum}</span> : null}
                    {showDiscountedSumLabel ? (
                      <span className="discount">{formattedActiveGuestDiscountedSum}</span>
                    ) : null}
                  </div>
                </div>
                {showInsuranceDetails && selectedPlanCoverages.length > 0 ? (
                  <ul className="coverage-list">
                    {selectedPlanCoverages.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
            </div>
          </div>
        }
        {insuranceSubrisks.length > 0 && insuranceSelection?.selected ? (
          <div className="insurance-subrisks">
            <h2>{t.packageBuilder.insurance.subrisksTitle}</h2>
            {insuranceSubrisks.map((subrisk) => {
              const isChecked = selectedInsuranceSubriskSet.has(subrisk.id);
              const isDisabled =
                !insuranceSelection?.selected ||
                Boolean(insuranceQuoteErrorLabel) ||
                !activeGuestCovered;
              const subriskRateLabel = resolveSubriskRate(subrisk.id, isChecked);
              const subriskIcon = resolveSubriskIcon(subrisk.id);
              return (
                <label
                  key={subrisk.id}
                  className={isDisabled ? " is-disabled" : ""}
                >
                  {subriskIcon ? (
                    <Image
                      className="icon"
                      src={subriskIcon}
                      alt={subrisk.label}
                      width={60}
                      height={60}
                    />
                  ) : null}
                  <div>
                    <h3>
                      <span className="subrisk-title">{subrisk.label}</span>
                      {subriskRateLabel ? (
                        <span className="subrisk-rate">({subriskRateLabel})</span>
                      ) : null}
                    </h3>
                    {subrisk.description ? (
                      <p>
                        {subrisk.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="toggle">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleInsuranceSubrisk(subrisk.id)}
                      disabled={isDisabled}
                    />
                    <span className="toggle__slider" aria-hidden="true" />
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
        {insuranceSelection?.selected ? (
          <button type="button" className="service-builder__cta" onClick={handleRemoveInsurance} style={{display:"none"}}>
            {t.packageBuilder.removeTag}
          </button>
        ) : (
          <p className="state">{t.packageBuilder.insurance.selectPlanNote}</p>
        )}
      </>
    );
  };

  return (
    <main className="service-builder">
      <div className="container">
        <div className="header">
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.body}</p>
          {serviceKey === "transfer" && destinationBadge}
          {serviceKey === "insurance" && 
          <>
            {passengerSummary ? (
              <span className="badge">
                <span className="material-symbols-rounded" aria-hidden="true">
                  group
                </span>
                {passengerSummary}
              </span>
            ) : null}
          </>
          }
        </div>
        {renderInsurancePlans()}
        {renderInsuranceControls()}
        {renderExcursionControls()}

        {serviceKey === "hotel" ? (
          <div className="search">
            <SearchForm copy={t.search} />
          </div>
        ) : serviceKey === "flight" ? (
          renderFlightPanel()
        ) : serviceKey === "transfer" ? (
          <>
            {renderTransferTypeGroup()}
            <div className="controls">
              {renderTransferReturnToggle()}
              {renderTransferAirportSelect()}
            </div>
            <div className="panel">
              {renderTransferList()}
            </div>
          </>
        ) : serviceKey === "excursion" ? (
          <div className="panel">{renderExcursionList()}</div>
        ) : serviceKey === "insurance" ? (
          <div className="panel">{renderInsurancePanel()}</div>
        ) : (
          <div className="panel">
            {!hasHotel ? (
              <div className="empty">
                <p>{t.packageBuilder.warningSelectHotel}</p>
                <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
                  {t.packageBuilder.services.hotel}
                </Link>
              </div>
            ) : (
              <>
                <p className="service-builder__note">{pageCopy.note}</p>
                <button
                  type="button"
                  className="service-builder__cta"
                  onClick={handleMarkService}
                  disabled={nonHotelSelection?.selected === true}
                >
                  {nonHotelSelection?.selected === true
                    ? t.packageBuilder.selectedTag
                    : t.packageBuilder.addTag}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
