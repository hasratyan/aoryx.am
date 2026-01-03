"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";
import type { Locale as AppLocale } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import { useAmdRates } from "@/lib/use-amd-rates";
import { getJson } from "@/lib/api-helpers";
import {
  DEFAULT_SERVICE_FLAGS,
  PackageBuilderState,
  PackageBuilderService,
  PACKAGE_BUILDER_OPEN_EVENT,
  ServiceFlags,
  clearPackageBuilderStateForOwner,
  openPackageBuilder,
  readPackageBuilderOwner,
  readPackageBuilderState,
  readPackageBuilderStateForOwner,
  subscribePackageBuilderState,
  updatePackageBuilderState,
  writePackageBuilderOwner,
  writePackageBuilderStateForOwner,
} from "@/lib/package-builder-state";
import { buildSearchQuery } from "@/lib/search-query";

type ServiceItem = {
  id: PackageBuilderService;
  icon: string;
  label: string;
  required?: boolean;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

type SessionWarningKey = "ten" | "five" | "expired";

const intlLocales: Record<AppLocale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const formatRemainingTime = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function PackageBuilder() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const intlLocale = intlLocales[locale] ?? "en-GB";
  const { rates: hotelRates } = useAmdRates();
  const { rates: baseRates } = useAmdRates(undefined, {
    endpoint: "/api/utils/exchange-rates?scope=transfers",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [showToggle, setShowToggle] = useState(true);
  const [builderState, setBuilderState] = useState<PackageBuilderState>(() =>
    readPackageBuilderState()
  );
  const [showHotelWarning, setShowHotelWarning] = useState(false);
  const [disabledServiceId, setDisabledServiceId] = useState<PackageBuilderService | null>(null);
  const [serviceFlags, setServiceFlags] = useState<ServiceFlags>(DEFAULT_SERVICE_FLAGS);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number | null>(null);
  const [sessionWarningKey, setSessionWarningKey] = useState<SessionWarningKey | null>(null);
  const sessionWarningRef = useRef<"none" | SessionWarningKey>("none");
  const lastScrollYRef = useRef(0);
  const hotelSelectionRef = useRef<string | null>(null);
  const hasSelection = (state: PackageBuilderState) =>
    Boolean(
      state.hotel?.selected ||
        state.transfer?.selected ||
        state.flight?.selected ||
        state.excursion?.selected ||
        state.insurance?.selected
    );
  const isSessionActive = (state: PackageBuilderState) => {
    const expiresAt = state.sessionExpiresAt;
    return typeof expiresAt === "number" && expiresAt > Date.now();
  };
  const isStateRestorable = (state: PackageBuilderState) =>
    hasSelection(state) && isSessionActive(state);

  useEffect(() => {
    if (authStatus === "loading") return;
    const ownerId = session?.user?.id ?? session?.user?.email ?? null;
    const currentOwner = ownerId ? `user:${ownerId}` : "guest";
    const activeState = readPackageBuilderState();
    const activeHasSelections = hasSelection(activeState);
    const rawStoredOwner = readPackageBuilderOwner();
    const storedOwner = rawStoredOwner ?? (activeHasSelections ? "guest" : null);
    const activeRestorable = isStateRestorable(activeState);

    if (storedOwner && storedOwner !== currentOwner && storedOwner !== "guest") {
      if (activeRestorable) {
        writePackageBuilderStateForOwner(storedOwner, activeState);
      } else {
        clearPackageBuilderStateForOwner(storedOwner);
      }
    }

    if (storedOwner !== currentOwner) {
      const allowGuestMigration =
        storedOwner === "guest" && currentOwner !== "guest" && activeRestorable;
      if (allowGuestMigration) {
        writePackageBuilderStateForOwner(currentOwner, activeState);
        writePackageBuilderOwner(currentOwner);
        return;
      }

      const savedState = readPackageBuilderStateForOwner(currentOwner);
      const savedRestorable = isStateRestorable(savedState);
      if (!savedRestorable && currentOwner !== "guest") {
        clearPackageBuilderStateForOwner(currentOwner);
      }
      updatePackageBuilderState(() => (savedRestorable ? savedState : {}));
    }
    writePackageBuilderOwner(currentOwner);
  }, [authStatus, session?.user?.email, session?.user?.id]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const ownerId = session?.user?.id ?? session?.user?.email ?? null;
    if (!ownerId) return;
    const currentOwner = `user:${ownerId}`;
    const storedOwner = readPackageBuilderOwner();
    if (storedOwner !== currentOwner) return;
    if (isStateRestorable(builderState)) {
      writePackageBuilderStateForOwner(currentOwner, builderState);
    } else {
      clearPackageBuilderStateForOwner(currentOwner);
    }
  }, [authStatus, builderState, session?.user?.email, session?.user?.id]);

  const selectedHotelLabel = (() => {
    if (!builderState.hotel?.selected) return null;
    const name = builderState.hotel.hotelName?.trim();
    const destination = builderState.hotel.destinationName?.trim();
    if (name && destination && name !== destination) {
      return `${name} - ${destination}`;
    }
    return name || destination || null;
  })();
  const selectedTransferLabel = (() => {
    if (!builderState.transfer?.selected) return null;
    const transferType = builderState.transfer.transferType?.trim().toUpperCase();
    if (transferType === "GROUP") return t.packageBuilder.transfers.group;
    if (transferType === "INDIVIDUAL") return t.packageBuilder.transfers.individual;
    return null;
  })();
  const selectedFlightLabel = (() => {
    if (!builderState.flight?.selected) return null;
    const label = builderState.flight.label?.trim();
    if (label) return label;
    const origin = builderState.flight.origin?.trim();
    const destination = builderState.flight.destination?.trim();
    if (origin && destination) {
      return `${origin} - ${destination}`;
    }
    return null;
  })();

  const hotelViewHref = (() => {
    const selection = builderState.hotel;
    if (!selection?.selected || !selection.hotelCode) return null;
    const base = `/${locale}/hotels/${selection.hotelCode}`;
    const rooms = selection.rooms ?? null;
    if (!selection.checkInDate || !selection.checkOutDate || !rooms || rooms.length === 0) {
      return base;
    }
    const query = buildSearchQuery({
      destinationCode: selection.destinationCode ?? undefined,
      hotelCode: selection.hotelCode ?? undefined,
      countryCode: selection.countryCode ?? "AE",
      nationality: selection.nationality ?? "AM",
      currency: selection.currency ?? "USD",
      checkInDate: selection.checkInDate,
      checkOutDate: selection.checkOutDate,
      rooms,
    });
    return `${base}?${query}`;
  })();

  const services: ServiceItem[] = [
    { id: "hotel", icon: "hotel", label: t.packageBuilder.services.hotel, required: true },
    { id: "flight", icon: "flight", label: t.packageBuilder.services.flight },
    { id: "transfer", icon: "directions_car", label: t.packageBuilder.services.transfer },
    { id: "excursion", icon: "tour", label: t.packageBuilder.services.excursion },
    { id: "insurance", icon: "shield_with_heart", label: t.packageBuilder.services.insurance },
  ];
  const serviceDisabledMessage = (() => {
    if (!disabledServiceId) return null;
    const serviceLabel = services.find((service) => service.id === disabledServiceId)?.label;
    return serviceLabel
      ? t.packageBuilder.serviceDisabled.replace("{service}", serviceLabel)
      : null;
  })();

  useEffect(() => {
    const unsubscribe = subscribePackageBuilderState(() => {
      const nextState = readPackageBuilderState();
      setBuilderState(nextState);
      const nextHotelKey =
        nextState.hotel?.selected === true
          ? [
              nextState.hotel.hotelCode ?? "",
              nextState.hotel.selectionKey ?? "",
              nextState.hotel.checkInDate ?? "",
              nextState.hotel.checkOutDate ?? "",
              nextState.hotel.roomCount ?? "",
              nextState.hotel.guestCount ?? "",
            ].join("|")
          : null;
      if (nextHotelKey !== hotelSelectionRef.current) {
        hotelSelectionRef.current = nextHotelKey;
        const shouldClearWarning =
          Boolean(nextHotelKey) || sessionWarningRef.current !== "expired";
        if (shouldClearWarning) {
          sessionWarningRef.current = "none";
          setSessionWarningKey(null);
        }
      }
      const nextExpiresAt =
        typeof nextState.sessionExpiresAt === "number" ? nextState.sessionExpiresAt : null;
      if (!nextState.hotel?.selected || !nextExpiresAt) {
        setSessionRemainingMs(null);
        return;
      }
      const remaining = nextExpiresAt - Date.now();
      setSessionRemainingMs(remaining > 0 ? remaining : 0);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getJson<{ flags?: ServiceFlags }>("/api/services/availability");
        if (!active) return;
        setServiceFlags({ ...DEFAULT_SERVICE_FLAGS, ...(data.flags ?? {}) });
      } catch (error) {
        if (!active) return;
        setServiceFlags(DEFAULT_SERVICE_FLAGS);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      setShowHotelWarning(false);
      setDisabledServiceId(null);
      setIsOpen(true);
    };
    window.addEventListener(PACKAGE_BUILDER_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(PACKAGE_BUILDER_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollYRef.current = window.scrollY;
    const threshold = 8;
    const topThreshold = 24;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollYRef.current;
        if (currentY <= topThreshold) {
          setShowToggle(true);
        } else if (diff > threshold) {
          setShowToggle(false);
        } else if (diff < -threshold) {
          setShowToggle(true);
        }
        lastScrollYRef.current = currentY;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasHotel = builderState.hotel?.selected === true;
  const sessionExpiresAt =
    typeof builderState.sessionExpiresAt === "number" ? builderState.sessionExpiresAt : null;
  const formattedSessionRemaining =
    sessionRemainingMs !== null ? formatRemainingTime(sessionRemainingMs) : null;
  const sessionWarning = (() => {
    if (!sessionWarningKey) return null;
    if (sessionWarningKey === "ten") return t.packageBuilder.sessionWarningTen;
    if (sessionWarningKey === "five") return t.packageBuilder.sessionWarningFive;
    return t.packageBuilder.sessionExpired;
  })();

  const checkoutTotal = (() => {
    let missingPrice = false;
    const totals: { amount: number; currency: string }[] = [];
    let selectedCount = 0;
    const addSelection = (
      selected: boolean,
      price: number | null | undefined,
      currency: string | null | undefined,
      rates: typeof hotelRates
    ) => {
      if (!selected) return;
      selectedCount += 1;
      const normalized = normalizeAmount(price, currency, rates);
      if (!normalized) {
        missingPrice = true;
        return;
      }
      totals.push({
        amount: normalized.amount,
        currency: normalized.currency,
      });
    };

    addSelection(
      builderState.hotel?.selected === true,
      builderState.hotel?.price ?? null,
      builderState.hotel?.currency ?? null,
      hotelRates
    );
    addSelection(
      builderState.transfer?.selected === true,
      builderState.transfer?.price ?? null,
      builderState.transfer?.currency ?? null,
      baseRates
    );
    addSelection(
      builderState.flight?.selected === true,
      builderState.flight?.price ?? null,
      builderState.flight?.currency ?? null,
      baseRates
    );
    addSelection(
      builderState.excursion?.selected === true,
      builderState.excursion?.price ?? null,
      builderState.excursion?.currency ?? null,
      baseRates
    );
    addSelection(
      builderState.insurance?.selected === true,
      builderState.insurance?.price ?? null,
      builderState.insurance?.currency ?? null,
      baseRates
    );

    if (selectedCount === 0) {
      return { label: null, isExact: false };
    }

    if (totals.length === 0 || missingPrice) {
      return { label: t.common.contactForRates, isExact: false };
    }

    const currency = totals[0].currency;
    if (totals.some((item) => item.currency !== currency)) {
      return { label: t.common.contactForRates, isExact: false };
    }

    const totalAmount = totals.reduce((sum, item) => sum + item.amount, 0);
    return {
      label: formatCurrencyAmount(totalAmount, currency, intlLocale) ?? t.common.contactForRates,
      isExact: true,
    };
  })();

  useEffect(() => {
    if (!hasHotel || !sessionExpiresAt) return;
    const tick = () => {
      const remaining = sessionExpiresAt - Date.now();
      const nextRemaining = remaining > 0 ? remaining : 0;
      setSessionRemainingMs(nextRemaining);
      let nextWarning: SessionWarningKey | null = null;
      if (nextRemaining <= 0) {
        nextWarning = "expired";
      } else if (nextRemaining <= FIVE_MINUTES_MS) {
        nextWarning = "five";
      } else if (nextRemaining <= TEN_MINUTES_MS) {
        nextWarning = "ten";
      }
      const nextKey = nextWarning ?? "none";
      if (nextKey !== sessionWarningRef.current) {
        sessionWarningRef.current = nextKey;
        setSessionWarningKey(nextWarning);
        if (nextWarning) {
          openPackageBuilder();
          if (nextWarning === "expired") {
            updatePackageBuilderState((prev) => ({
              ...prev,
              hotel: undefined,
              transfer: undefined,
              excursion: undefined,
              insurance: undefined,
              flight: undefined,
              sessionExpiresAt: undefined,
              updatedAt: Date.now(),
            }));
          }
        }
      }
    };
    const interval = window.setInterval(tick, 1000);
    const timeout = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [hasHotel, sessionExpiresAt]);

  const toggleOpen = () => {
    setShowHotelWarning(false);
    setDisabledServiceId(null);
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (service: ServiceItem) => {
    if (serviceFlags[service.id] === false) {
      setShowHotelWarning(false);
      setDisabledServiceId(service.id);
      return;
    }
    if (service.id !== "hotel" && !hasHotel) {
      setShowHotelWarning(true);
      setDisabledServiceId(null);
      return;
    }

    setShowHotelWarning(false);
    setDisabledServiceId(null);
    const target = service.id === "hotel" ? `/${locale}` : `/${locale}/services/${service.id}`;
    setIsOpen(false);
    router.push(target);
  };

  const handleRemove = (serviceId: PackageBuilderService) => {
    updatePackageBuilderState((prev) => {
      if (serviceId === "hotel") {
        return {
          ...prev,
          hotel: undefined,
          transfer: undefined,
          excursion: undefined,
          insurance: undefined,
          flight: undefined,
          sessionExpiresAt: undefined,
          updatedAt: Date.now(),
        };
      }
      const next = { ...prev, updatedAt: Date.now() };
      if (serviceId === "transfer") next.transfer = undefined;
      if (serviceId === "flight") next.flight = undefined;
      if (serviceId === "excursion") next.excursion = undefined;
      if (serviceId === "insurance") next.insurance = undefined;
      return next;
    });
  };

  const handleCheckout = () => {
    if (!hasHotel) {
      setShowHotelWarning(true);
      return;
    }
    setShowHotelWarning(false);
    setDisabledServiceId(null);
    setIsOpen(false);
    router.push(`/${locale}/checkout`);
  };

  return (
    <div className={`package-builder${isOpen ? " is-open" : ""}`}>
      <div className="package-builder__shell">
        {!isOpen ? (
          <button
            type="button"
            className={`package-builder__toggle${showToggle ? "" : " is-hidden"}`}
            aria-label={t.packageBuilder.toggleOpen}
            onClick={toggleOpen}
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              auto_awesome
            </span>
            {t.packageBuilder.toggleOpen}
          </button>
        ) : (
          <div className="package-builder__panel" role="dialog" aria-label={t.packageBuilder.title}>
            <div className="package-builder__header">
              <h3 className="package-builder__title">{t.packageBuilder.title}</h3>
              <button
                type="button"
                className="package-builder__close"
                aria-label={t.packageBuilder.toggleClose}
                onClick={toggleOpen}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            {sessionWarning && (
              <div className="package-builder__warning" role="alert">
                <span className="material-symbols-rounded" aria-hidden="true">
                  warning
                </span>
                {sessionWarning}
              </div>
            )}
            {showHotelWarning && (
              <div className="package-builder__warning" role="alert">
                <span className="material-symbols-rounded" aria-hidden="true">
                  error
                </span>
                {t.packageBuilder.warningSelectHotel}
              </div>
            )}
            {serviceDisabledMessage && (
              <div className="package-builder__warning" role="alert">
                <span className="material-symbols-rounded" aria-hidden="true">
                  block
                </span>
                {serviceDisabledMessage}
              </div>
            )}
            <div className="package-builder__grid" role="list">
              {services.map((service) => {
                const serviceSelection =
                  service.id === "hotel"
                    ? builderState.hotel
                    : builderState[service.id as Exclude<PackageBuilderService, "hotel">];
                const isSelected = serviceSelection?.selected === true;
                const isDisabled = serviceFlags[service.id] === false;
                const serviceRates = service.id === "hotel" ? hotelRates : baseRates;
                const normalizedPrice = isSelected
                  ? normalizeAmount(
                      serviceSelection?.price ?? null,
                      serviceSelection?.currency ?? null,
                      serviceRates
                    )
                  : null;
                const formattedPrice = normalizedPrice
                  ? formatCurrencyAmount(normalizedPrice.amount, normalizedPrice.currency, intlLocale)
                  : null;
                const priceLabel = isSelected ? formattedPrice ?? t.common.contactForRates : null;
                const statusLabel = isDisabled
                  ? t.packageBuilder.disabledTag
                  : isSelected
                    ? t.packageBuilder.selectedTag
                    : service.required
                      ? t.packageBuilder.requiredTag
                      : t.packageBuilder.addTag;
                const isLocked = !hasHotel && service.id !== "hotel";
                const selectionLabel =
                  service.id === "hotel"
                    ? selectedHotelLabel
                    : service.id === "transfer"
                      ? selectedTransferLabel
                      : service.id === "flight"
                        ? selectedFlightLabel
                      : null;
                const viewHref =
                  service.id === "hotel" ? hotelViewHref : `/${locale}/services/${service.id}`;
                const showView = isSelected && Boolean(viewHref);
                const showChange = service.id === "hotel" && isSelected;
                const canRemove = isSelected;
                const showActions = showView || showChange || canRemove;
                return (
                  <div
                    key={service.id}
                    role="listitem"
                    className={`package-builder__item${isSelected ? " is-selected" : ""}${isLocked ? " is-locked" : ""}${isDisabled ? " is-disabled" : ""}`}
                  >
                    <button
                      type="button"
                      className="package-builder__item-button"
                      aria-disabled={isLocked || isDisabled}
                      onClick={() => handleSelect(service)}
                    >
                      <span
                        className="package-builder__icon material-symbols-rounded"
                        aria-hidden="true"
                      >
                        {service.icon}
                      </span>
                      <span className="package-builder__label">{service.label}</span>
                      {selectionLabel && (
                        <span className="package-builder__selected-name" title={selectionLabel}>
                          {selectionLabel}
                        </span>
                      )}
                      {priceLabel && (
                        <span
                          className={`package-builder__price${formattedPrice ? "" : " is-muted"}`}
                        >
                          {t.packageBuilder.checkout.labels.price}: {priceLabel}
                        </span>
                      )}
                      <span className="package-builder__status">{statusLabel}</span>
                    </button>
                    {showActions ? (
                      <div className="package-builder__actions">
                        {showView ? (
                          <button
                            type="button"
                            className="package-builder__view"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (viewHref) {
                                setIsOpen(false);
                                router.push(viewHref);
                              }
                            }}
                          >
                            {t.packageBuilder.viewService}
                          </button>
                        ) : null}
                        {showChange ? (
                          <button
                            type="button"
                            className="package-builder__change"
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowHotelWarning(false);
                              setIsOpen(false);
                              router.push(`/${locale}`);
                            }}
                          >
                            {t.packageBuilder.changeHotel}
                          </button>
                        ) : null}
                        {canRemove ? (
                          <button
                            type="button"
                            className="package-builder__remove"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemove(service.id);
                            }}
                          >
                            {t.packageBuilder.removeTag}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {hasHotel && (
              <div className="package-builder__footer">
                {hasHotel && formattedSessionRemaining ? (
                  <span className="package-builder__timer">
                    <span className="material-symbols-rounded">timer</span>
                    {t.packageBuilder.sessionExpiresIn}:{" "}
                    <strong>{formattedSessionRemaining}</strong>
                  </span>
                ) : null}
                {hasHotel ? (
                  <button
                    type="button"
                    className="package-builder__checkout"
                    onClick={handleCheckout}
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">payments</span>
                    <span className="package-builder__checkout-text">
                      <span className="package-builder__checkout-label">
                        {t.packageBuilder.checkoutButton}
                      </span>
                      {checkoutTotal.label ? (
                        <span className="package-builder__checkout-total">
                          ({checkoutTotal.isExact
                            ? `${t.common.total}: ${checkoutTotal.label}`
                            : checkoutTotal.label})
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
