"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import {
  PackageBuilderState,
  PackageBuilderService,
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
} from "@/lib/package-builder-state";

type ServiceItem = {
  id: PackageBuilderService;
  icon: string;
  label: string;
  required?: boolean;
};

export default function PackageBuilder() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [builderState, setBuilderState] = useState<PackageBuilderState>(() =>
    readPackageBuilderState()
  );
  const [warning, setWarning] = useState<string | null>(null);

  const selectedHotelLabel = (() => {
    if (!builderState.hotel?.selected) return null;
    const name = builderState.hotel.hotelName?.trim();
    const destination = builderState.hotel.destinationName?.trim();
    if (name && destination && name !== destination) {
      return `${name} - ${destination}`;
    }
    return name || destination || null;
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

  const hasHotel = builderState.hotel?.selected === true;

  const toggleOpen = () => {
    setWarning(null);
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (service: ServiceItem) => {
    if (service.id !== "hotel" && !hasHotel) {
      setWarning(t.packageBuilder.warningSelectHotel);
      return;
    }

    setWarning(null);
    router.push(`/${locale}/services/${service.id}`);
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

  return (
    <div className={`package-builder${isOpen ? " is-open" : ""}`}>
      <div className="package-builder__shell">
        {!isOpen ? (
          <button
            type="button"
            className="package-builder__toggle"
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
              <div>
                <h3 className="package-builder__title">{t.packageBuilder.title}</h3>
                <p className="package-builder__hint">{t.packageBuilder.helper}</p>
              </div>
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
            {warning && (
              <div className="package-builder__warning" role="alert">
                <span className="material-symbols-rounded" aria-hidden="true">
                  error
                </span>
                {warning}
              </div>
            )}
            <div className="package-builder__grid" role="list">
              {services.map((service) => {
                const serviceSelection =
                  service.id === "hotel"
                    ? builderState.hotel
                    : builderState[service.id as Exclude<PackageBuilderService, "hotel">];
                const isSelected = serviceSelection?.selected === true;
                const statusLabel = isSelected
                  ? t.packageBuilder.selectedTag
                  : service.required
                    ? t.packageBuilder.requiredTag
                    : t.packageBuilder.addTag;
                const isLocked = !hasHotel && service.id !== "hotel";
                const hotelLabel = service.id === "hotel" ? selectedHotelLabel : null;
                const showChange = service.id === "hotel" && isSelected;
                const canRemove = isSelected;
                const showActions = showChange || canRemove;
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
                      {hotelLabel && (
                        <span className="package-builder__selected-name" title={hotelLabel}>
                          {hotelLabel}
                        </span>
                      )}
                      <span className="package-builder__status">{statusLabel}</span>
                    </button>
                    {showActions ? (
                      <div className="package-builder__actions">
                        {showChange ? (
                          <button
                            type="button"
                            className="package-builder__change"
                            onClick={(event) => {
                              event.stopPropagation();
                              setWarning(null);
                              router.push(`/${locale}/services/hotel`);
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
          </div>
        )}
      </div>
    </div>
  );
}
