"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SearchForm from "@/components/search-form";
import { useLanguage } from "@/components/language-provider";
import type { Locale as AppLocale } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import { postJson } from "@/lib/api-helpers";
import type { AoryxExcursionTicket, AoryxTransferRate } from "@/types/aoryx";
import {
  PackageBuilderService,
  PackageBuilderState,
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

type TransferType = "INDIVIDUAL" | "GROUP";

const normalizeTransferType = (value: string | null | undefined): TransferType | null => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "INDIVIDUAL" || normalized === "GROUP") return normalized;
  return null;
};

export default function PackageServiceClient({ serviceKey }: Props) {
  const { locale, t } = useLanguage();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const ratesEndpoint =
    serviceKey === "hotel"
      ? "/api/utils/exchange-rates"
      : "/api/utils/exchange-rates?scope=transfers";
  const { rates: amdRates } = useAmdRates(undefined, { endpoint: ratesEndpoint });
  const [builderState, setBuilderState] = useState<PackageBuilderState>(() =>
    readPackageBuilderState()
  );
  const [transferOptions, setTransferOptions] = useState<AoryxTransferRate[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [selectedTransferType, setSelectedTransferType] = useState<TransferType | null>(null);
  const [excursionOptions, setExcursionOptions] = useState<AoryxExcursionTicket[]>([]);
  const [excursionLoading, setExcursionLoading] = useState(false);
  const [excursionError, setExcursionError] = useState<string | null>(null);
  const [excursionFee, setExcursionFee] = useState<number | null>(null);
  const [guestExcursions, setGuestExcursions] = useState<Record<string, string[]>>(() => {
    const stored = readPackageBuilderState().excursion?.selections;
    return stored && typeof stored === "object" ? stored : {};
  });
  const [activeExcursionGuestId, setActiveExcursionGuestId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePackageBuilderState(() => {
      setBuilderState(readPackageBuilderState());
    });
    return unsubscribe;
  }, []);

  const hotelSelection = builderState.hotel;
  const hasHotel = hotelSelection?.selected === true;
  const destinationName = hotelSelection?.destinationName ?? null;
  const destinationCode = hotelSelection?.destinationCode ?? null;
  const selectedTransferId = builderState.transfer?.selectionId ?? null;
  const nonHotelSelection =
    serviceKey === "hotel"
      ? undefined
      : builderState[serviceKey as Exclude<PackageBuilderService, "hotel">];
  const transferMissingDestination =
    serviceKey === "transfer" && hasHotel && !destinationName && !destinationCode;
  const shouldFetchTransfers =
    serviceKey === "transfer" && hasHotel && !transferMissingDestination;

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
  }, [serviceKey, t.hotel.addons.excursions.loadFailed]);

  const transferIdMap = useMemo(() => {
    const map = new Map<AoryxTransferRate, string>();
    transferOptions.forEach((transfer, index) => {
      map.set(transfer, buildTransferId(transfer, index));
    });
    return map;
  }, [transferOptions]);

  const { individualTransfers, groupTransfers } = useMemo(() => {
    const individual: AoryxTransferRate[] = [];
    const group: AoryxTransferRate[] = [];
    transferOptions.forEach((transfer) => {
      const type = normalizeTransferType(transfer.transferType);
      if (type === "GROUP") {
        group.push(transfer);
      } else {
        individual.push(transfer);
      }
    });
    return { individualTransfers: individual, groupTransfers: group };
  }, [transferOptions]);

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

  const excursionOptionsWithId = useMemo(
    () =>
      excursionOptions.map((excursion, index) => ({
        ...excursion,
        id: buildExcursionId(excursion, index),
      })),
    [excursionOptions]
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
    (excursion: AoryxExcursionTicket, age: number | null) => {
      const childRange = parseChildPolicyRange(excursion.childPolicy);
      const childIsFree =
        isFocPolicy(excursion.childPolicy) || (excursion.pricing?.child ?? 0) === 0;
      const feeAlreadyApplied =
        (excursion.pricing as { feeApplied?: unknown })?.feeApplied === true;
      const feeToApply = feeAlreadyApplied ? 0 : excursionFee ?? 0;

      const focNonRestrictive = childIsFree && !/only/i.test(excursion.childPolicy ?? "");

      if (childIsFree && age !== null) {
        const focMax = childRange?.max ?? 3;
        if (age <= focMax) {
          return { amount: feeToApply, currency: excursion.pricing?.currency };
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
          currency: excursion.pricing?.currency,
        };
      }

      if (childIsFree && age === null) {
        return { amount: feeToApply, currency: excursion.pricing?.currency };
      }

      if (focNonRestrictive) {
        return {
          amount: (excursion.pricing?.adult ?? 0) + feeToApply,
          currency: excursion.pricing?.currency,
        };
      }

      return {
        amount: (excursion.pricing?.adult ?? 0) + feeToApply,
        currency: excursion.pricing?.currency,
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
        const price = computeExcursionPrice(excursion, guest.age);
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

  const storedExcursionSelectionKey = useMemo(
    () => serializeGuestExcursions(builderState.excursion?.selections ?? {}),
    [builderState.excursion?.selections]
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
      builderState.excursion?.currency === nextCurrency
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
      },
      updatedAt: Date.now(),
    }));
  }, [
    builderState.excursion?.currency,
    builderState.excursion?.price,
    builderState.excursion?.selected,
    excursionSelectionCount,
    excursionSelectionKey,
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
    const price =
      typeof transfer.pricing?.oneWay === "number"
        ? transfer.pricing.oneWay
        : typeof transfer.pricing?.return === "number"
          ? transfer.pricing.return
          : null;
    const currency = transfer.pricing?.currency ?? null;
    const transferType = transfer.transferType ?? null;
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
        price,
        currency,
        transferType,
      },
      updatedAt: Date.now(),
    }));
  };

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
      <span className="package-service__badge">
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

  const getStartingPrice = useCallback((options: AoryxTransferRate[]) => {
    const normalized = options
      .map((transfer) => {
        const price = transfer.pricing?.oneWay ?? transfer.pricing?.return ?? null;
        const currency = transfer.pricing?.currency ?? null;
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
  }, [amdRates, intlLocale]);

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
    if (transferOptions.length === 0) return null;

    const individualLabel = individualStarting
      ? `${t.packageBuilder.transfers.startingFrom} ${individualStarting}`
      : t.common.contactForRates;
    const groupLabel = groupStarting
      ? `${t.packageBuilder.transfers.startingFrom} ${groupStarting}`
      : t.common.contactForRates;

    return (
      <div className="transfer-type-group">
        <div className="package-service__transfer-types">
          <button
            type="button"
            className={`transfer-type-card${selectedTransferType === "INDIVIDUAL" ? " is-selected" : ""}`}
            onClick={() => setSelectedTransferType("INDIVIDUAL")}
            aria-pressed={selectedTransferType === "INDIVIDUAL"}
          >
            <span className="transfer-type-card__content">
              <h2>{t.packageBuilder.transfers.individual}</h2>
              <span>{individualLabel}</span>
              <span className="transfer-type-card__note">
                {t.packageBuilder.transfers.perCar}
              </span>
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
            className={`transfer-type-card${selectedTransferType === "GROUP" ? " is-selected" : ""}`}
            onClick={() => setSelectedTransferType("GROUP")}
            aria-pressed={selectedTransferType === "GROUP"}
          >
            <span className="transfer-type-card__content">
              <h2>{t.packageBuilder.transfers.group}</h2>
              <span>{groupLabel}</span>
              <span className="transfer-type-card__note">
                {t.packageBuilder.transfers.perPax}
              </span>
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
      </div>
    );
  };

  const renderTransferList = () => {
    if (!hasHotel) {
      return (
        <div className="package-service__empty">
          <p>{t.packageBuilder.warningSelectHotel}</p>
          <Link href={`/${locale}/services/hotel`} className="service-builder__cta">
            {t.packageBuilder.services.hotel}
          </Link>
        </div>
      );
    }
    if (transferMissingDestination) {
      return <p className="package-service__state error">{t.hotel.addons.transfers.missingDestination}</p>;
    }
    if (transferLoading) {
      return <p className="package-service__state">{t.hotel.addons.transfers.loading}</p>;
    }
    if (transferError) {
      return <p className="package-service__state error">{transferError}</p>;
    }
    if (transferOptions.length === 0) {
      return <p className="package-service__state">{t.hotel.addons.transfers.noOptions}</p>;
    }

    const activeTransfers =
      selectedTransferType === "GROUP"
        ? groupTransfers
        : selectedTransferType === "INDIVIDUAL"
          ? individualTransfers
          : [];

    if (!selectedTransferType) {
      return <p className="package-service__state">{t.packageBuilder.transfers.selectType}</p>;
    }

    if (activeTransfers.length === 0) {
      return <p className="package-service__state">{t.hotel.addons.transfers.noOptions}</p>;
    }

    return (
      <div className="package-service__list" role="list">
        {activeTransfers.map((transfer, index) => {
          const id = transferIdMap.get(transfer) ?? buildTransferId(transfer, index);
          const isSelected = selectedTransferId === id;
          const origin = transfer.origin?.name ?? transfer.origin?.locationCode ?? "—";
          const destination = transfer.destination?.name ?? transfer.destination?.locationCode ?? "—";
          const price = transfer.pricing?.oneWay ?? transfer.pricing?.return ?? null;
          const currency = transfer.pricing?.currency ?? "USD";
          const normalizedPrice = normalizeAmount(price, currency, amdRates);
          const formattedPrice = normalizedPrice
            ? formatCurrencyAmount(normalizedPrice.amount, normalizedPrice.currency, intlLocale)
            : null;
          const transferType = normalizeTransferType(transfer.transferType);
          const typeLabel =
            transferType === "GROUP"
              ? t.packageBuilder.transfers.group
              : transferType === "INDIVIDUAL"
                ? t.packageBuilder.transfers.individual
                : t.packageBuilder.services.transfer;
          return (
            <div
              key={id}
              className={`package-service__card${isSelected ? " is-selected" : ""}`}
              role="listitem"
            >
              <div>
                <h3 className="package-service__route">
                  {origin} → {destination}
                </h3>
                <p className="package-service__meta">
                  {typeLabel}
                  {formattedPrice ? ` · ${formattedPrice}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="service-builder__cta"
                onClick={() => handleSelectTransfer(transfer, id)}
              >
                {isSelected ? t.packageBuilder.selectedTag : t.packageBuilder.addTag}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderExcursionList = () => {
    if (excursionLoading) {
      return <p className="package-service__state">{t.hotel.addons.excursions.loading}</p>;
    }
    if (excursionError) {
      return <p className="package-service__state error">{excursionError}</p>;
    }
    if (excursionOptionsWithId.length === 0) {
      return <p className="package-service__state">{t.hotel.addons.excursions.noOptions}</p>;
    }

    const activeGuest = activeExcursionGuestId
      ? excursionGuestMap.get(activeExcursionGuestId) ?? null
      : null;

    return (
      <>
        {!hasHotel && (
          <p className="package-service__state">{t.packageBuilder.warningSelectHotel}</p>
        )}
        {hasHotel && excursionGuests.length === 0 && (
          <p className="package-service__state">{t.hotel.errors.unableBuildGuests}</p>
        )}
        {excursionGuests.length > 1 && (
          <div className="excursion-guest-header">
            <div className="excursion-guest-tabs">
              {excursionGuests.map((guest) => {
                const count = guestExcursions[guest.key]?.length ?? 0;
                return (
                  <button
                    key={guest.key}
                    type="button"
                    className={`excursion-guest-tab${guest.key === activeExcursionGuestId ? " is-active" : ""}`}
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
              className="excursion-apply-all"
              onClick={applyActiveSelectionToAllGuests}
              disabled={!canSelectExcursions || !activeExcursionGuestId}
            >
              <span className="material-symbols-rounded" aria-hidden="true">group_add</span>
              {t.hotel.addons.excursions.applyAll}
              {excursionGuests.length > 0 ? ` (${excursionGuests.length})` : ""}
            </button>
          </div>
        )}
        {excursionFee && excursionFee > 0 ? (
          <p className="service-builder__note">{t.hotel.addons.excursions.feeNote}</p>
        ) : null}
        <div className="excursion-options">
          {excursionOptionsWithId.map((excursion) => {
            const id = excursion.id;
            const isSelected = activeExcursionSelection.includes(id);
            const isEligible = activeGuest ? isExcursionEligibleForGuest(excursion, activeGuest) : true;
            const isDisabled = !canSelectExcursions || !activeExcursionGuestId || !isEligible;
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
                className={`excursion-option excursion-option--selectable${isSelected ? " is-selected" : ""}${isDisabled ? " is-disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleExcursionForActiveGuest(id)}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                />
                <div className="excursion-option__content">
                  <div className="excursion-info">
                    <div>
                      <h5>{excursion.name ?? t.hotel.addons.excursions.unnamed}</h5>
                      {excursion.description && <p>{excursion.description}</p>}
                    </div>
                    {excursion.childPolicy && (
                      <span className="excursion-policy">{excursion.childPolicy}</span>
                    )}
                  </div>
                  <div className="excursion-controls">
                    <div className="excursion-pricing">
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
                </div>
              </label>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <main className="service-builder">
      <div className="container">
        <div className="service-builder__header">
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.body}</p>
          {serviceKey === "transfer" && destinationBadge}
        </div>

        {serviceKey === "hotel" ? (
          <div className="search">
            <SearchForm copy={t.search} />
          </div>
        ) : serviceKey === "transfer" ? (
          <>
            {renderTransferTypeGroup()}
            <div className="service-builder__panel">{renderTransferList()}</div>
          </>
        ) : serviceKey === "excursion" ? (
          <div className="service-builder__panel">{renderExcursionList()}</div>
        ) : (
          <div className="service-builder__panel service-builder__panel--compact">
            {!hasHotel ? (
              <div className="package-service__empty">
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
