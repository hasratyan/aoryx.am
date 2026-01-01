"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import type { Locale as AppLocale } from "@/lib/i18n";
import { formatCurrencyAmount, normalizeAmount } from "@/lib/currency";
import { useAmdRates } from "@/lib/use-amd-rates";
import {
  PackageBuilderState,
  PackageBuilderService,
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
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
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number | null>(null);
  const [sessionWarningKey, setSessionWarningKey] = useState<SessionWarningKey | null>(null);
  const sessionWarningRef = useRef<"none" | "ten" | "five" | "expired">("none");
  const sessionExpiresAtRef = useRef<number | null>(null);
  const hotelSelectionRef = useRef<string | null>(null);
  const lastScrollYRef = useRef(0);

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

  useEffect(() => {
    const unsubscribe = subscribePackageBuilderState(() => {
      setBuilderState(readPackageBuilderState());
    });
    return unsubscribe;
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
  const hotelSelectionKey = hasHotel
    ? [
        builderState.hotel?.hotelCode ?? "",
        builderState.hotel?.selectionKey ?? "",
        builderState.hotel?.checkInDate ?? "",
        builderState.hotel?.checkOutDate ?? "",
        builderState.hotel?.roomCount ?? "",
        builderState.hotel?.guestCount ?? "",
      ].join("|")
    : null;
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
    if (hotelSelectionRef.current === hotelSelectionKey) return;
    hotelSelectionRef.current = hotelSelectionKey;
    sessionWarningRef.current = "none";
    setSessionWarningKey(null);
  }, [hotelSelectionKey]);

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
    if (!hasHotel || !sessionExpiresAt) {
      if (sessionWarningRef.current !== "expired") {
        sessionWarningRef.current = "none";
        setSessionWarningKey(null);
      }
      sessionExpiresAtRef.current = null;
      return;
    }

    if (sessionExpiresAt !== sessionExpiresAtRef.current) {
      sessionExpiresAtRef.current = sessionExpiresAt;
      sessionWarningRef.current = "none";
      setSessionWarningKey(null);
    }

    if (sessionRemainingMs === null) return;

    if (sessionRemainingMs <= 0) {
      if (sessionWarningRef.current !== "expired") {
        sessionWarningRef.current = "expired";
        setSessionWarningKey("expired");
        setIsOpen(true);
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
      return;
    }

    if (sessionRemainingMs <= FIVE_MINUTES_MS) {
      if (sessionWarningRef.current !== "five") {
        sessionWarningRef.current = "five";
        setSessionWarningKey("five");
        setIsOpen(true);
      }
      return;
    }

    if (sessionRemainingMs <= TEN_MINUTES_MS) {
      if (sessionWarningRef.current !== "ten") {
        sessionWarningRef.current = "ten";
        setSessionWarningKey("ten");
        setIsOpen(true);
      }
    }
  }, [
    hasHotel,
    sessionExpiresAt,
    sessionRemainingMs,
  ]);

  const toggleOpen = () => {
    setShowHotelWarning(false);
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (service: ServiceItem) => {
    if (service.id !== "hotel" && !hasHotel) {
      setShowHotelWarning(true);
      return;
    }

    setShowHotelWarning(false);
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
            <div className="package-builder__grid" role="list">
              {services.map((service) => {
                const serviceSelection =
                  service.id === "hotel"
                    ? builderState.hotel
                    : builderState[service.id as Exclude<PackageBuilderService, "hotel">];
                const isSelected = serviceSelection?.selected === true;
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
                const statusLabel = isSelected
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
                    className={`package-builder__item${isSelected ? " is-selected" : ""}${isLocked ? " is-locked" : ""}`}
                  >
                    <button
                      type="button"
                      className="package-builder__item-button"
                      aria-disabled={isLocked}
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
