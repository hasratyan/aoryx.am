"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postJson } from "@/lib/api-helpers";
import { buildSearchQuery, parseSearchParams } from "@/lib/search-query";
import type { AoryxSearchResult } from "@/types/aoryx";
import Image from "next/image";
import Loader from "@/components/loader";
import SearchForm from "@/components/search-form";
import {useTranslations} from "@/components/language-provider";

const ratingOptions = [5, 4, 3, 2, 1] as const;

// Destination type for API response
interface DestinationInfo {
  id: string;
  name: string;
  rawId?: string;
}

interface DestinationApiResponse {
  countryCode: string;
  destinations: DestinationInfo[];
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

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed);
}

export default function ResultsClient() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const parsed = useMemo(
    () => parseSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [result, setResult] = useState<AoryxSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "rating-desc" | "rating-asc"
  >("rating-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [priceRangeOverride, setPriceRangeOverride] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [destinations, setDestinations] = useState<DestinationInfo[]>([]);
  const missingError = parsed.payload ? null : (parsed.error ?? "Missing search details.");
  const finalError = missingError ?? error;

  // Fetch destinations on mount to get destination names
  useEffect(() => {
    postJson<DestinationApiResponse>("/api/aoryx/country-info", { countryCode: "AE" })
      .then((response) => {
        setDestinations(response.destinations ?? []);
      })
      .catch((err) => {
        console.error("Failed to load destinations:", err);
      });
  }, []);

  useEffect(() => {
    if (!parsed.payload) return;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setResult(null);
    });

    postJson<AoryxSearchResult>("/api/aoryx/search", parsed.payload)
      .then((data) => {
        setResult(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unable to load results right now.";
        setError(message);
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [parsed.payload]);

  const checkIn = formatDate(parsed.payload?.checkInDate);
  const checkOut = formatDate(parsed.payload?.checkOutDate);
  const nightsCount = useMemo(() => {
    if (!parsed.payload?.checkInDate || !parsed.payload?.checkOutDate) return null;
    const checkInDate = new Date(`${parsed.payload.checkInDate}T00:00:00`);
    const checkOutDate = new Date(`${parsed.payload.checkOutDate}T00:00:00`);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return null;
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }, [parsed.payload?.checkInDate, parsed.payload?.checkOutDate]);
  const totalAdults = parsed.payload?.rooms.reduce((sum, room) => sum + room.adults, 0) ?? 0;
  const totalChildren =
    parsed.payload?.rooms.reduce((sum, room) => sum + room.childrenAges.length, 0) ?? 0;
  const totalGuests = totalAdults + totalChildren;
  const roomsCount = parsed.payload?.rooms.length ?? 0;
  const matchedHotel = parsed.payload?.hotelCode
    ? result?.hotels.find((hotel) => hotel.code === parsed.payload?.hotelCode)
    : null;
  
  // Look up destination name from destinations list
  const destinationFromList = useMemo(() => {
    if (!parsed.payload?.destinationCode) return null;
    const code = parsed.payload.destinationCode;
    // Try to find by id or rawId
    return destinations.find((d) => d.id === code || d.rawId === code) ?? null;
  }, [destinations, parsed.payload?.destinationCode]);

  // Helper to resolve city code to name using destinations list
  const resolveCityName = (city: string | null): string | null => {
    if (!city) return null;
    // Check if city looks like a code (numeric or contains dash with numbers)
    const looksLikeCode = /^[\d-]+$/.test(city);
    if (!looksLikeCode) {
      // It's already a readable name
      return city;
    }
    // Try to find the city code in destinations list
    const found = destinations.find((d) => d.id === city || d.rawId === city);
    return found?.name ?? null;
  };

  const presetDestination = parsed.payload?.destinationCode
    ? {
        id: parsed.payload.destinationCode,
        label: destinationFromList?.name ?? result?.destination?.name ?? parsed.payload.destinationCode,
        rawId: destinationFromList?.rawId ?? parsed.payload.destinationCode,
      }
    : undefined;
  const presetHotel = parsed.payload?.hotelCode
    ? {
        id: parsed.payload.hotelCode,
        label: matchedHotel?.name ?? parsed.payload.hotelCode,
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
  const priceBounds = useMemo(() => {
    const prices = (result?.hotels ?? [])
      .map((hotel) => hotel.minPrice)
      .filter((price): price is number => typeof price === "number" && !Number.isNaN(price));
    if (!prices.length) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [result?.hotels]);

  const priceRange = useMemo(() => {
    if (!priceBounds) return null;
    if (!priceRangeOverride) return { min: priceBounds.min, max: priceBounds.max };

    const clampedMin = Math.max(
      priceBounds.min,
      Math.min(priceRangeOverride.min, priceBounds.max)
    );
    const clampedMax = Math.min(
      priceBounds.max,
      Math.max(priceRangeOverride.max, priceBounds.min)
    );

    return {
      min: Math.min(clampedMin, clampedMax),
      max: Math.max(clampedMin, clampedMax),
    };
  }, [priceBounds, priceRangeOverride]);

  const sortedHotels = useMemo(() => {
    const hotels = [...(result?.hotels ?? [])];
    if (!hotels.length) return [];
    const ratingSet = new Set(selectedRatings);
    const hasActivePriceFilter =
      priceBounds &&
      priceRange &&
      (priceRange.min > priceBounds.min || priceRange.max < priceBounds.max);
    const filteredHotels = hotels.filter((hotel) => {
      if (priceBounds && priceRange) {
        if (typeof hotel.minPrice === "number") {
          if (hotel.minPrice < priceRange.min || hotel.minPrice > priceRange.max) return false;
        } else if (hasActivePriceFilter) {
          return false;
        }
      }
      if (ratingSet.size) {
        if (typeof hotel.rating !== "number") return false;
        const bucket = Math.floor(hotel.rating);
        if (!ratingSet.has(bucket)) return false;
      }
      return true;
    });

    const compareNullable = (
      a: number | null | undefined,
      b: number | null | undefined,
      direction: "asc" | "desc"
    ) => {
      const aHas = typeof a === "number";
      const bHas = typeof b === "number";
      if (!aHas && !bHas) return 0;
      if (!aHas) return 1;
      if (!bHas) return -1;
      return direction === "asc" ? a - b : b - a;
    };
    const comparePrice = (a: typeof hotels[number], b: typeof hotels[number], direction: "asc" | "desc") => {
      const priceDelta = compareNullable(a.minPrice, b.minPrice, direction);
      if (priceDelta !== 0) return priceDelta;
      return compareNullable(a.rating, b.rating, "desc");
    };
    const compareRating = (a: typeof hotels[number], b: typeof hotels[number], direction: "asc" | "desc") => {
      const ratingDelta = compareNullable(a.rating, b.rating, direction);
      if (ratingDelta !== 0) return ratingDelta;
      return compareNullable(a.minPrice, b.minPrice, "asc");
    };
    switch (sortBy) {
      case "price-asc":
        filteredHotels.sort((a, b) => comparePrice(a, b, "asc"));
        break;
      case "price-desc":
        filteredHotels.sort((a, b) => comparePrice(a, b, "desc"));
        break;
      case "rating-asc":
        filteredHotels.sort((a, b) => compareRating(a, b, "asc"));
        break;
      default:
        filteredHotels.sort((a, b) => compareRating(a, b, "desc"));
        break;
    }
    return filteredHotels;
  }, [priceBounds, priceRange, result?.hotels, selectedRatings, sortBy]);

  return (
    <main className="results">
      {result?.hotels.length ? (
        <aside
          id="results-filters"
          className={`results-filters${filtersOpen ? " is-open" : ""}`}
        >
          <button
            type="button"
            className="filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="results-filters"
            onClick={() => setFiltersOpen((current) => !current)}
          >
            {filtersOpen ? <><span className="material-symbols-rounded">close</span></> : <><span className="material-symbols-rounded">discover_tune</span>Filters</>}
          </button>
          <div className="filters-header">
            <h2>Filters</h2>
          </div>
          <div className="filters-section">
            <h3>Price range</h3>
            {priceBounds ? (
              <>
                <div className="filter-range-values">
                  <span>
                    {formatPrice(priceRange?.min ?? priceBounds.min, result?.currency ?? null)}
                  </span>
                  <span>
                    {formatPrice(priceRange?.max ?? priceBounds.max, result?.currency ?? null)}
                  </span>
                </div>
                <div className="filter-range-inputs">
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={priceRange?.min ?? priceBounds.min}
                    onChange={(event) => {
                      const nextMin = Number(event.target.value);
                      setPriceRangeOverride((current) => {
                        const currentMax = current?.max ?? priceBounds.max;
                        return {
                          min: Math.min(nextMin, currentMax),
                          max: currentMax,
                        };
                      });
                    }}
                  />
                  <input
                    type="range"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={priceRange?.max ?? priceBounds.max}
                    onChange={(event) => {
                      const nextMax = Number(event.target.value);
                      setPriceRangeOverride((current) => {
                        const currentMin = current?.min ?? priceBounds.min;
                        return {
                          min: currentMin,
                          max: Math.max(nextMax, currentMin),
                        };
                      });
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="filter-muted">No pricing data available.</p>
            )}
          </div>
          <div className="filters-section">
            <h3>Rating</h3>
            <div className="filter-options">
              {ratingOptions.map((rating) => (
                <label key={rating} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selectedRatings.includes(rating)}
                    onChange={() =>
                      setSelectedRatings((current) =>
                        current.includes(rating)
                          ? current.filter((value) => value !== rating)
                          : [...current, rating]
                      )
                    }
                  />
                  {rating} ★
                </label>
              ))}
            </div>
          </div>
        </aside>
      ) : null}
      {loading ? (
        <Loader text="Loading available stays ..." />
      ) : finalError ? (
        <div className="error-container">
          <Image src="/images/icons/error.gif" alt="Error" width={100} height={100} />
          <p>
            {finalError}
          </p>
          <Link href="/"><span className="material-symbols-rounded">arrow_back</span>Back to search</Link>
        </div>
      ) : (
        <div className="container">
          <div className="search">
            <SearchForm
              copy={t.search}
              presetDestination={presetDestination}
              presetHotel={presetHotel}
              initialDateRange={initialDateRange}
              initialRooms={initialRooms}
            />
          </div>
          {result && result.hotels.length === 0 ? (
            <div className="results-empty">
              <Image src="/images/icons/sad.gif" alt="No hotels found" width={100} height={100} />
              <p>No hotels matched this search. Try adjusting dates or destination.</p>
            </div>
          ) : (
            <>
              <div className="results-top">
                <h1>
                  {destinationFromList?.name ?? result?.destination?.name ?? "UAE stays"}
                  {(() => {
                    const placesFound = result?.propertyCount ?? result?.hotels.length ?? 0;
                    return (
                      placesFound > 1 && (
                        <span>
                          • {placesFound} places found
                        </span>
                      )
                    );
                  })()}
                </h1>
                {result?.hotels.length ? (
                  <label className="results-sort">
                    Sort by:
                    <select
                      value={sortBy}
                      onChange={(event) =>
                        setSortBy(
                          event.target.value as
                            | "price-asc"
                            | "price-desc"
                            | "rating-desc"
                            | "rating-asc"
                        )
                      }
                    >
                      <option value="price-asc">Price (lowest first)</option>
                      <option value="price-desc">Price (highest first)</option>
                      <option value="rating-desc">Rating (high to low)</option>
                      <option value="rating-asc">Rating (low to high)</option>
                    </select>
                  </label>
                ) : null}
              </div>

              {parsed.notice && <div className="results-notice">{parsed.notice}</div>}
            </>
          )}

          <div id="hotels" className="grid">
            {sortedHotels.map((hotel, idx) => {
              const formattedPrice = formatPrice(hotel.minPrice, hotel.currency);
              const detailQuery =
                parsed.payload && hotel.code
                  ? buildSearchQuery({
                      ...parsed.payload,
                      hotelCode: hotel.code ?? undefined,
                      destinationCode:
                        parsed.payload.destinationCode ?? result?.destination?.code ?? undefined,
                    })
                  : null;
              const detailHref = detailQuery && hotel.code ? `/hotels/${hotel.code}?${detailQuery}` : null;

              return (
                <div className="hotel-card" key={hotel.code ?? hotel.name ?? idx}>
                  <div className="image">
                    {hotel.imageUrl ? (
                      <Image fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw" src={hotel.imageUrl} alt={hotel.name ?? "Hotel"}/>
                    ) : (
                      <span>{(hotel.name ?? "Hotel").charAt(0)}</span>
                    )}
                  </div>
                  <div className="content">
                    <div className="header">
                      <div>
                        <h3>{hotel.name ?? "Unnamed hotel"}</h3>
                        <p className="location">
                          <span className="material-symbols-rounded">location_on</span>
                          {resolveCityName(hotel.city) ?? destinationFromList?.name ?? result?.destination?.name ?? "UAE"}
                        </p>
                      </div>
                      {typeof hotel.rating === "number" && hotel.rating > 0 && (
                        <span className="rating">
                          {Number.isInteger(hotel.rating)
                            ? hotel.rating
                            : hotel.rating.toFixed(1)} ★
                        </span>
                      )}
                    </div>
                    <div className="footer">
                      <div>
                        <div className="price">
                          {formattedPrice ? (
                            <>
                              {formattedPrice}
                              {nightsCount && nightsCount > 1 && (
                                <small> • {nightsCount} nights</small>
                              )}
                            </>
                          ) : (
                            <span className="result-price-muted">Contact for rates</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!detailHref}
                        onClick={() => detailHref && router.push(detailHref)}
                      >
                        View options
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
