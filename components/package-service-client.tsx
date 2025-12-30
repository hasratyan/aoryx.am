"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchForm from "@/components/search-form";
import { useLanguage } from "@/components/language-provider";
import { postJson } from "@/lib/api-helpers";
import type { AoryxTransferRate } from "@/types/aoryx";
import {
  PackageBuilderService,
  PackageBuilderState,
  readPackageBuilderState,
  subscribePackageBuilderState,
  updatePackageBuilderState,
} from "@/lib/package-builder-state";

type Props = {
  serviceKey: PackageBuilderService;
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

export default function PackageServiceClient({ serviceKey }: Props) {
  const { locale, t } = useLanguage();
  const [builderState, setBuilderState] = useState<PackageBuilderState>(() =>
    readPackageBuilderState()
  );
  const [transferOptions, setTransferOptions] = useState<AoryxTransferRate[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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

  const handleSelectTransfer = (transfer: AoryxTransferRate, index: number) => {
    const selectionId = buildTransferId(transfer, index);
    updatePackageBuilderState((prev) => ({
      ...prev,
      transfer: {
        selected: true,
        selectionId,
        destinationName,
        destinationCode,
      },
      updatedAt: Date.now(),
    }));
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

    return (
      <div className="package-service__list" role="list">
        {transferOptions.map((transfer, index) => {
          const id = buildTransferId(transfer, index);
          const isSelected = selectedTransferId === id;
          const origin = transfer.origin?.name ?? transfer.origin?.locationCode ?? "—";
          const destination = transfer.destination?.name ?? transfer.destination?.locationCode ?? "—";
          const price = transfer.pricing?.oneWay ?? transfer.pricing?.return ?? null;
          const currency = transfer.pricing?.currency ?? "USD";
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
                  {transfer.transferType ?? "Transfer"}
                  {price !== null && Number.isFinite(price) ? ` · ${price} ${currency}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="service-builder__cta"
                onClick={() => handleSelectTransfer(transfer, index)}
              >
                {isSelected ? t.packageBuilder.selectedTag : t.packageBuilder.addTag}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="service-builder">
      <div className="container">
        <div className="service-builder__header">
          <span className="service-builder__eyebrow">{t.packageBuilder.subtitle}</span>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.body}</p>
          {serviceKey === "transfer" && destinationBadge}
        </div>

        {serviceKey === "hotel" ? (
          <div className="search">
            <SearchForm copy={t.search} />
          </div>
        ) : serviceKey === "transfer" ? (
          <div className="service-builder__panel">{renderTransferList()}</div>
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
