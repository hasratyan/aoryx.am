"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchForm from "@/components/search-form";
import Loader from "@/components/loader";
import { postJson } from "@/lib/api-helpers";
import { parseSearchParams } from "@/lib/search-query";
import { useTranslations } from "@/components/language-provider";
import ImageGallery from "./ImageGallery";
import type { AoryxHotelInfoResult, AoryxRoomOption, HotelInfo } from "@/types/aoryx";

function toFinite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatPrice(value: number | null, currency: string | null): string | null {
  if (value === null || value === undefined) return null;
  const safeCurrency = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${safeCurrency} ${value}`;
  }
}

export default function HotelDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  const hotelCode = Array.isArray(params.code) ? params.code[0] : params.code;

  const parsed = useMemo(() => {
    const merged = new URLSearchParams(searchParams.toString());
    if (hotelCode) merged.set("hotelCode", hotelCode);
    return parseSearchParams(merged);
  }, [searchParams, hotelCode]);
  const destinationCode = parsed.payload?.destinationCode ?? searchParams.get("destinationCode") ?? undefined;

  const [hotelInfo, setHotelInfo] = useState<AoryxHotelInfoResult | null>(null);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [roomOptions, setRoomOptions] = useState<AoryxRoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finalError = error;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setHotelInfo(null);
        setFallbackCoordinates(null);
        setError(null);
      }
    });

    if (!hotelCode) {
      return () => {
        cancelled = true;
      };
    }

    postJson<AoryxHotelInfoResult | null>("/api/aoryx/hotel-info", { hotelCode })
      .then((info) => {
        if (!cancelled) {
          setHotelInfo(info);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load this hotel right now.";
          setError(message);
          setHotelInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hotelCode]);

  useEffect(() => {
    let cancelled = false;
    const infoLat = toFinite(hotelInfo?.geoCode?.lat);
    const infoLon = toFinite(hotelInfo?.geoCode?.lon);

    if (!hotelCode || !destinationCode || (infoLat !== null && infoLon !== null)) {
      queueMicrotask(() => {
        setFallbackCoordinates(null);
      });
      return () => {
        cancelled = true;
      };
    }

    postJson<{ hotels: HotelInfo[] }>("/api/aoryx/hotels-by-destination", {
      destinationId: destinationCode,
      parentDestinationId: destinationCode,
    })
      .then((response) => {
        if (cancelled) return;
        const match = (response.hotels ?? []).find((hotel) => hotel.systemId === hotelCode);
        const lat = toFinite(match?.latitude);
        const lon = toFinite(match?.longitude);
        setFallbackCoordinates(lat !== null && lon !== null ? { lat, lon } : null);
      })
      .catch(() => {
        if (!cancelled) setFallbackCoordinates(null);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationCode, hotelCode, hotelInfo?.geoCode?.lat, hotelInfo?.geoCode?.lon]);

  const roomDetailsPayload = useMemo(() => {
    if (!parsed.payload || !hotelCode) return null;
    return { ...parsed.payload, hotelCode };
  }, [hotelCode, parsed.payload]);

  useEffect(() => {
    if (!roomDetailsPayload) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setRoomsLoading(true);
        setRoomsError(null);
        setRoomOptions([]);
      }
    });

    postJson<{ rooms: AoryxRoomOption[] }>("/api/aoryx/room-details", roomDetailsPayload)
      .then((response) => {
        if (!cancelled) {
          setRoomOptions(response.rooms ?? []);
          setRoomsError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load room options.";
          setRoomsError(message);
          setRoomOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomDetailsPayload]);

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

  const initialRooms = parsed.payload?.rooms.map((room) => ({
    adults: room.adults,
    children: room.childrenAges.length,
    childAges: room.childrenAges,
  }));
  const handleSearchSubmit = useCallback(
    (payload: { hotelCode?: string }, params: URLSearchParams) => {
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
            <p>{hotelInfo?.address?.line1}, {hotelInfo?.address?.cityName}</p>
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
            {hotelCoordinates && mapEmbedSrc && (
              <button
                type="button"
                className="map-button"
                popoverTarget={mapPopoverId}
                aria-label="View hotel on map"
              >
                <span className="material-symbols-rounded">map</span>
                Show location on Map
              </button>
            )}
          </section>
          <button type="button" onClick={() => router.back()}>
            <span className="material-symbols-rounded">arrow_back</span>Go back
          </button>
        </div>

          {finalError && (
            <div className="results-error">
              <p>{finalError}</p>
              <div className="results-error-actions">
                <Link href="/" className="btn btn-primary">Back to search</Link>
              </div>
            </div>
          )}

          {!finalError && galleryImages.length > 0 && (
              <ImageGallery
                images={galleryImages}
                altText={hotelInfo?.name ?? "Hotel"}
              />
          )}

          {!finalError && (
            <div className="container">
              <div className="search">
                <h2>Create your next increadable experience.</h2>
                <SearchForm
                  copy={t.search}
                  hideLocationFields
                  presetDestination={presetDestination}
                  presetHotel={presetHotel}
                  initialDateRange={initialDateRange}
                  initialRooms={initialRooms}
                  onSubmitSearch={handleSearchSubmit}
                />
              </div>
            </div>
          )}

          {!finalError && (
            <section className="room-options">
              <div className="container">
                {!roomDetailsPayload && (
                  <p className="room-options-empty">
                    Choose dates and guests to see available rooms.
                  </p>
                )}
                {roomDetailsPayload && roomsLoading && (
                  <Loader text="Loading room options" />
                )}
                {roomDetailsPayload && !roomsLoading && roomsError && (
                  <p className="room-options-error">{roomsError}</p>
                )}
                {roomDetailsPayload && !roomsLoading && !roomsError && roomOptions.length === 0 && (
                  <p className="room-options-empty">No room options available.</p>
                )}
                {roomDetailsPayload && !roomsLoading && !roomsError && roomOptions.length > 0 && (
                  <>
                  <div className="room-options-header">
                    <h2>Room options</h2>
                  </div>
                  <div className="room-options-list">
                    {roomOptions.map((option) => {
                      const price = formatPrice(
                        option.totalPrice,
                        option.currency ?? fallbackCurrency
                      );
                      return (
                        <article key={option.id} className="room-card">
                          <div className="room-card-main">
                            <h3>{option.name ?? "Room option"}</h3>
                            <div className="room-meta">
                              {option.boardType && <span className="room-chip">{option.boardType}</span>}
                              {option.refundable !== null && (
                                <span
                                  className={`room-chip ${
                                    option.refundable ? "refundable" : "non-refundable"
                                  }`}
                                >
                                  {option.refundable ? "Refundable" : "Non-refundable"}
                                </span>
                              )}
                              {typeof option.availableRooms === "number" && (
                                <span className="room-chip">{option.availableRooms} left</span>
                              )}
                            </div>
                            {option.cancellationPolicy && (
                              <p className="room-policy">{option.cancellationPolicy}</p>
                            )}
                          </div>
                          <div className="room-card-price">
                            {price ? (
                              <span className="room-price">{price}</span>
                            ) : (
                              <span className="room-price-muted">Contact for rates</span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
            </section>
          )}

          {hotelCoordinates && mapEmbedSrc && (
            <div id={mapPopoverId} popover="auto" className="popover">
              <h2>Hotel location</h2>
              <iframe
                title="Hotel map location"
                src={mapEmbedSrc}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                aria-label="Hotel location map"
              />
              <button
                type="button"
                className="close"
                popoverTarget={mapPopoverId}
                popoverTargetAction="hide"
                aria-label="Close map"
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
