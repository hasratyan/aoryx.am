"use client";

import { FormEvent, useState, useMemo, useCallback, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import Select, { StylesConfig, CSSObjectWithLabel, components as selectComponents } from "react-select";
import type { SingleValue } from "react-select";
import { DateRange, type Range, type RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import type { Locale as DateFnsLocale } from "date-fns";
import { enGB, hy, ru } from "date-fns/locale";
import { useLanguage } from "@/components/language-provider";
import StarBorder from '@/components/StarBorder'
import { postJson } from "@/lib/api-helpers";
import type { AoryxSearchParams, HotelInfo } from "@/types/aoryx";
import type { Locale as AppLocale } from "@/lib/i18n";

// Types
type LocationOption = {
  value: string;
  label: string;
  rawId?: string;
  type: "destination" | "hotel";
  parentDestinationId?: string;
  lat?: number;
  lng?: number;
};

type RoomConfig = {
  adults: number;
  children: number;
  childAges: number[];
};

export type SearchCopy = {
  wherePlaceholder: string;
  loadingDestinations: string;
  noLocations: string;
  adultsLabel: string;
  childrenLabel: string;
  childrenAges: string;
  submitIdle: string;
  submitLoading: string;
  roomLabel: string;
  roomsLabel: string;
  datePlaceholder: string;
  unknownHotel: string;
  errors: {
    missingLocation: string;
    missingDates: string;
    invalidRooms: string;
    submit: string;
  };
};

// API response type for destinations
type DestinationApiResponse = {
  destinations: Array<{
    id: string;
    name: string;
    rawId: string;
  }>;
};

// Helper to build default dates
const buildDefaultDates = () => {
  const today = new Date();
  const checkIn = new Date(today);
  const checkOut = new Date(today);
  checkIn.setDate(checkIn.getDate() + 1);
  checkOut.setDate(checkOut.getDate() + 3);
  return { checkIn, checkOut };
};

// Helper to format date as YYYY-MM-DD using local timezone (avoids UTC shift)
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to format date for display (consistent between server and client)
const formatDateDisplay = (date: Date, locale: string): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  // Use consistent format: DD.MM.YYYY for all locales to avoid hydration mismatch
  return `${day}.${month}.${year}`;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const dateFnsLocales: Record<AppLocale, DateFnsLocale> = {
  hy,
  en: enGB,
  ru,
};

const intlLocales: Record<AppLocale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

// Custom styles for react-select
const selectStyles: StylesConfig<LocationOption, false> = {
  container: (base: CSSObjectWithLabel) => ({
    ...base,
    height: "100%",
  }),
  control: (base: CSSObjectWithLabel) => ({
    ...base,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    padding: ".25em .8em",
    height: "100%",
    color: "#fff",
    minHeight: "50px",
    borderRadius: "1em",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
  }),
  menu: (base: CSSObjectWithLabel) => ({
    ...base,
    backgroundColor: "#1a1a2e",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "1em",
    padding: "0.5em",
  }),
  option: (base: CSSObjectWithLabel, state) => ({
    ...base,
    borderRadius: "0.5em",
    backgroundColor: state.isSelected
      ? "#10b981"
      : state.isFocused
      ? "rgba(16, 185, 129, 0.2)"
      : "transparent",
    color: "#fff",
    "&:active": {
      backgroundColor: "#10b981",
    },
  }),
  singleValue: (base: CSSObjectWithLabel) => ({
    ...base,
    color: "#fff",
    fontWeight: 700,
  }),
  input: (base: CSSObjectWithLabel) => ({
    ...base,
    color: "#fff",
    fontWeight: 700,
  }),
  placeholder: (base: CSSObjectWithLabel) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.5)",
  }),
  indicatorsContainer: (base: CSSObjectWithLabel) => ({
    ...base,
    gap: "0.5em",
  }),
  dropdownIndicator: (base: CSSObjectWithLabel) => ({
    ...base,
    padding: "0"
  }),
  clearIndicator: (base: CSSObjectWithLabel) => ({
    ...base,
    padding: "0"
  })
};

type Props = {
  copy: SearchCopy;
  hideLocationFields?: boolean;
  presetDestination?: { id: string; label?: string; rawId?: string };
  presetHotel?: { id: string; label?: string };
  initialDateRange?: { startDate: Date; endDate: Date };
  initialRooms?: RoomConfig[];
  showRoomCount?: boolean;
  isSearchPending?: boolean;
  onSubmitSearch?: (
    payload: AoryxSearchParams,
    params: URLSearchParams
  ) => void | Promise<void>;
};

export default function SearchForm({
  copy,
  hideLocationFields = false,
  presetDestination,
  presetHotel,
  initialDateRange,
  initialRooms,
  showRoomCount = false,
  isSearchPending = false,
  onSubmitSearch,
}: Props) {
  const defaults = useMemo(() => buildDefaultDates(), []);
  const reactSelectId = useId();
  const reactSelectInstanceId = useMemo(
    () => `location-select-${reactSelectId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactSelectId],
  );
  const router = useRouter();
  const { locale: appLocale } = useLanguage();
  const dateFnsLocale = dateFnsLocales[appLocale];
  const intlLocale = intlLocales[appLocale];

  const presetDestinationOption: LocationOption | null = presetDestination
    ? {
        value: presetDestination.id,
        label: presetDestination.label ?? presetDestination.id,
        rawId: presetDestination.rawId ?? presetDestination.id,
        type: "destination",
      }
    : null;

  const presetHotelOption: LocationOption | null = presetHotel
    ? {
        value: presetHotel.id,
        label: presetHotel.label ?? presetHotel.id,
        type: "hotel",
        parentDestinationId: presetDestination?.rawId ?? presetDestination?.id,
      }
    : null;

  // Destinations state
  const [destinations, setDestinations] = useState<LocationOption[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(!hideLocationFields);
  const [destinationsInitialized, setDestinationsInitialized] = useState(
    !!presetDestinationOption,
  );

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(
    presetHotelOption ?? presetDestinationOption,
  );
  const [hotels, setHotels] = useState<LocationOption[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const resolvedDates = initialDateRange?.startDate && initialDateRange?.endDate
    ? {
        checkIn: new Date(initialDateRange.startDate),
        checkOut: new Date(initialDateRange.endDate),
      }
    : defaults;
  const [dateRange, setDateRange] = useState<Range>(() => ({
    startDate: resolvedDates.checkIn,
    endDate: resolvedDates.checkOut,
    key: "selection",
  }));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [showChildAges, setShowChildAges] = useState(false);
  const childAgesRef = useRef<HTMLDivElement | null>(null);
  const [rooms, setRooms] = useState<RoomConfig[]>(() => {
    if (initialRooms && initialRooms.length > 0) {
      return initialRooms.map((room) => {
        const childCount = Math.max(0, room.children ?? room.childAges.length ?? 0);
        const childAges =
          room.childAges && room.childAges.length > 0
            ? room.childAges.slice(0, childCount)
            : Array(childCount).fill(5);
        return {
          adults: Math.max(1, room.adults),
          children: childCount,
          childAges,
        };
      });
    }
    return [{ adults: 2, children: 0, childAges: [] }];
  });
  const [searchError, setSearchError] = useState<string | null>(null);
  const isFormDisabled = isSubmitting || isSearchPending;

  // Load destinations from API on mount
  useEffect(() => {
    if (hideLocationFields) return;

    postJson<DestinationApiResponse>("/api/aoryx/country-info", { countryCode: "AE" })
      .then((response) => {
        const options = (response.destinations ?? []).map<LocationOption>((dest) => ({
          value: dest.id,
          label: dest.name,
          rawId: dest.rawId,
          type: "destination",
        }));
        console.log("Destinations loaded:", options.length, options.slice(0, 3));
        setDestinations(options);
      })
      .catch((error) => {
        console.error("Failed to load destinations:", error);
      })
      .finally(() => {
        setDestinationsLoading(false);
      });
  }, [hideLocationFields, copy.unknownHotel]);

  // Set default destination (Dubai) once destinations are loaded
  useEffect(() => {
    if (hideLocationFields) return;
    if (destinationsInitialized) return;
    if (destinations.length === 0) return;

    const preferred =
      destinations.find((d) => d.label.toLowerCase() === "dubai") ??
      destinations.find((d) => d.value === "160") ??
      destinations[0];

    if (preferred) {
      queueMicrotask(() => {
        setSelectedLocation(preferred);
        setDestinationsInitialized(true);
      });
    }
  }, [destinationsInitialized, destinations, hideLocationFields]);

  // Load hotels for preset destination on mount (even if a hotel is pre-selected)
  useEffect(() => {
    if (hideLocationFields) return;
    if (!presetDestinationOption) return;

    // Load hotels for the preset destination
    setHotelsLoading(true);
    const destinationId = presetDestinationOption.rawId ?? presetDestinationOption.value;

    postJson<{ hotels: HotelInfo[] }>("/api/aoryx/hotels-by-destination", {
      destinationId,
      parentDestinationId: presetDestinationOption.value,
    })
      .then((response) => {
        const options = (response.hotels ?? [])
          .map<LocationOption>((hotel) => ({
            value: hotel.systemId ?? "",
            label: hotel.name ?? hotel.systemId ?? copy.unknownHotel,
            lat: typeof hotel.latitude === "number" ? hotel.latitude : undefined,
            lng: typeof hotel.longitude === "number" ? hotel.longitude : undefined,
            type: "hotel",
            parentDestinationId: presetDestinationOption.rawId ?? presetDestinationOption.value,
          }))
          .filter((option) => option.value.length > 0)
          .sort((a, b) => a.label.localeCompare(b.label));

        console.log("Hotels loaded for preset destination", { count: options.length, first: options[0] });
        setHotels(options);

        // If a hotel is pre-selected, update selectedLocation with the proper name from loaded hotels
        if (presetHotelOption) {
          const matchedHotel = options.find((opt) => opt.value === presetHotelOption.value);
          if (matchedHotel) {
            console.log("Updating preset hotel with proper name:", matchedHotel.label);
            setSelectedLocation(matchedHotel);
          }
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load hotels for preset destination:", error);
        setHotels([]);
      })
      .finally(() => {
        setHotelsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideLocationFields]); // Only run on mount, presetDestinationOption and presetHotelOption are stable

  // Load hotels for a destination from the API
  const loadHotelsForDestination = useCallback((destination: LocationOption | null) => {
    if (hideLocationFields) {
      setSelectedLocation(destination);
      return;
    }

    setSelectedLocation(destination);

    if (!destination) {
      console.warn("loadHotelsForDestination: no destination provided");
      setHotels([]);
      return;
    }

    setHotelsLoading(true);
    const destinationId = destination.rawId ?? destination.value;

    postJson<{ hotels: HotelInfo[] }>("/api/aoryx/hotels-by-destination", {
      destinationId,
      parentDestinationId: destination.value,
    })
      .then((response) => {
        const options = (response.hotels ?? [])
          .map<LocationOption>((hotel) => ({
            value: hotel.systemId ?? "",
            label: hotel.name ?? hotel.systemId ?? copy.unknownHotel,
            lat: typeof hotel.latitude === "number" ? hotel.latitude : undefined,
            lng: typeof hotel.longitude === "number" ? hotel.longitude : undefined,
            type: "hotel",
            parentDestinationId: destination.rawId ?? destination.value,
          }))
          .filter((option) => option.value.length > 0)
          .sort((a, b) => a.label.localeCompare(b.label));

        console.log("Hotels loaded", { count: options.length, first: options[0] });

        setHotels(options);
      })
      .catch((error: unknown) => {
        console.error("Failed to load hotels:", error);
        setHotels([]);
      })
      .finally(() => {
        setHotelsLoading(false);
      });
  }, [hideLocationFields]);

  // Load hotels when destination is selected (after destinations are initialized)
    useEffect(() => {
    if (hideLocationFields) return;
    if (!destinationsInitialized) return;
    if (!selectedLocation || selectedLocation.type !== "destination") return;
    
    // Load hotels for the selected destination
    queueMicrotask(() => setHotelsLoading(true));
    const destinationId = selectedLocation.rawId ?? selectedLocation.value;

    postJson<{ hotels: HotelInfo[] }>("/api/aoryx/hotels-by-destination", {
      destinationId,
      parentDestinationId: selectedLocation.value,
    })
      .then((response) => {
        const options = (response.hotels ?? [])
          .map<LocationOption>((hotel) => ({
            value: hotel.systemId ?? "",
            label: hotel.name ?? hotel.systemId ?? copy.unknownHotel,
            lat: typeof hotel.latitude === "number" ? hotel.latitude : undefined,
            lng: typeof hotel.longitude === "number" ? hotel.longitude : undefined,
            type: "hotel",
            parentDestinationId: selectedLocation.rawId ?? selectedLocation.value,
          }))
          .filter((option) => option.value.length > 0)
          .sort((a, b) => a.label.localeCompare(b.label));

        console.log("Hotels auto-loaded", { count: options.length, first: options[0] });
        setHotels(options);
      })
      .catch((error: unknown) => {
        console.error("Failed to auto-load hotels:", error);
        setHotels([]);
      })
      .finally(() => {
        setHotelsLoading(false);
      });
  }, [destinationsInitialized, selectedLocation, hideLocationFields, copy.unknownHotel]);

  // Guest handlers

  const updateRoomGuests = useCallback(
    (roomIndex: number, field: "adults" | "children", value: number) => {
      setRooms((prev) =>
        prev.map((room, index) => {
          if (index !== roomIndex) return room;
          if (field === "adults") {
            return { ...room, adults: clampNumber(value, 1, 6) };
          }
          const children = clampNumber(value, 0, 4);
          const childAges = Array.isArray(room.childAges)
            ? room.childAges.slice(0, children)
            : [];
          while (childAges.length < children) childAges.push(5);
          return { ...room, children, childAges };
        })
      );
    },
    []
  );

  const updateRoomCount = useCallback((value: number) => {
    const count = clampNumber(value, 1, 4);
    setRooms((prev) => {
      const next = prev.slice(0, count).map((room) => {
        const adults = clampNumber(room.adults ?? 1, 1, 6);
        const children = clampNumber(
          room.children ?? room.childAges.length ?? 0,
          0,
          4
        );
        const childAges = Array.isArray(room.childAges)
          ? room.childAges.slice(0, children)
          : [];
        while (childAges.length < children) childAges.push(5);
        return { adults, children, childAges };
      });
      while (next.length < count) {
        next.push({ adults: 1, children: 0, childAges: [] });
      }
      return next;
    });
  }, []);

  const updateRoomChildAge = useCallback(
    (roomIndex: number, childIndex: number, age: number) => {
      setRooms((prev) =>
        prev.map((room, index) => {
          if (index !== roomIndex) return room;
          const childAges = [...room.childAges];
          childAges[childIndex] = clampNumber(age, 0, 17);
          return { ...room, childAges };
        })
      );
    },
    []
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isFormDisabled) return;
      setIsSubmitting(true);
      setSearchError(null);

      if (!selectedLocation) {
        setSearchError(copy.errors.missingLocation);
        setIsSubmitting(false);
        return;
      }

      if (!dateRange.startDate || !dateRange.endDate) {
        setSearchError(copy.errors.missingDates);
        setIsSubmitting(false);
        return;
      }

      const searchPayload: AoryxSearchParams = {
        destinationCode:
          selectedLocation.type === "destination"
            ? selectedLocation.rawId ?? selectedLocation.value
            : selectedLocation.parentDestinationId ?? undefined,
        hotelCode: selectedLocation.type === "hotel" ? selectedLocation.value : undefined,
        countryCode: "AE",
        nationality: "AM",
        currency: "USD",
        checkInDate: formatDateLocal(dateRange.startDate),
        checkOutDate: formatDateLocal(dateRange.endDate),
        rooms: rooms.map((room, index) => ({
          roomIdentifier: index + 1,
          adults: room.adults,
          childrenAges: room.childAges,
        })),
      };

      const params = new URLSearchParams();
      if (searchPayload.destinationCode) params.set("destinationCode", searchPayload.destinationCode);
      if (searchPayload.hotelCode) params.set("hotelCode", searchPayload.hotelCode);
      params.set("countryCode", searchPayload.countryCode);
      params.set("nationality", searchPayload.nationality);
      params.set("currency", searchPayload.currency ?? "USD");
      params.set("checkInDate", searchPayload.checkInDate);
      params.set("checkOutDate", searchPayload.checkOutDate);
      params.set("rooms", JSON.stringify(searchPayload.rooms));

      try {
        if (onSubmitSearch) {
          await onSubmitSearch(searchPayload, params);
        } else {
          const resultsPath = `/${appLocale}/results`;
          const query = params.toString();
          router.push(query ? `${resultsPath}?${query}` : resultsPath);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : copy.errors.submit;
        setSearchError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      selectedLocation,
      dateRange.startDate,
      dateRange.endDate,
      rooms,
      router,
      onSubmitSearch,
      appLocale,
      isFormDisabled,
    ]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showChildAges) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (childAgesRef.current && !childAgesRef.current.contains(event.target as Node)) {
        setShowChildAges(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showChildAges]);

  useEffect(() => {
    if (
      rooms.length !== 1 ||
      rooms[0]?.children === 0 ||
      rooms[0]?.childAges.length === 0
    ) {
      queueMicrotask(() => setShowChildAges(false));
    }
  }, [rooms]);

  useEffect(() => {
    if (!isFormDisabled) return;
    setShowDatePicker(false);
    setShowChildAges(false);
  }, [isFormDisabled]);

  const combinedOptions = useMemo(() => {
    const merged = [...destinations, ...hotels];
    if (
      selectedLocation &&
      !merged.some((opt) => opt.value === selectedLocation.value && opt.type === selectedLocation.type)
    ) {
      return [selectedLocation, ...merged];
    }
    return merged;
  }, [destinations, hotels, selectedLocation]);

  return (
    <form onSubmit={handleSubmit} className="search-form">
      {!hideLocationFields && (
        <div className="field">
          <Select<LocationOption>
            instanceId={reactSelectInstanceId}
            options={combinedOptions}
            value={selectedLocation}
            onChange={(option: SingleValue<LocationOption>) => {
              setSelectedLocation(option);
              if (option?.type === "destination") {
                loadHotelsForDestination(option);
              }
            }}
            placeholder={destinationsLoading ? copy.loadingDestinations : copy.wherePlaceholder}
            styles={selectStyles}
            isClearable
            isSearchable
            isLoading={destinationsLoading || hotelsLoading}
            isDisabled={isFormDisabled}
            noOptionsMessage={() =>
              destinationsLoading || hotelsLoading
                ? copy.loadingDestinations
                : copy.noLocations
            }
            filterOption={(option, input) => {
              const label = option.label.toLowerCase();
              const search = input.toLowerCase();
              if (!search) return true;
              // Prioritize destinations by always allowing them when they match
              if (option.data.type === "destination") {
                return label.includes(search);
              }
              return label.includes(search);
            }}
            components={{
              IndicatorSeparator: () => null,
              Control: (props) => {
                const current = props.getValue()[0] as LocationOption | undefined;
                const icon =
                  current?.type === "hotel"
                    ? "hotel"
                    : current?.type === "destination"
                    ? "location_city"
                    : "travel_explore";
                return (
                  <selectComponents.Control {...props}>
                    <span className="material-symbols-rounded">
                      {icon}
                    </span>
                    {props.children}
                  </selectComponents.Control>
                );
              },
              Option: (optionProps) => {
                const data = optionProps.data as LocationOption;
                const icon = data.type === "destination" ? "location_city" : "hotel";
                return (
                  <selectComponents.Option {...optionProps}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="material-symbols-rounded" style={{ margin: 0 }}>
                        {icon}
                      </span>
                      {data.type === "destination" ? (
                        <strong>{data.label}</strong>
                      ) : (
                        <span>{data.label}</span>
                      )}
                    </div>
                  </selectComponents.Option>
                );
              },
            }}
          />
        </div>
      )}

      {/* Date range */}
      <div className="field" ref={datePickerRef}>
          <button
            type="button"
            className="date-picker"
            onClick={() => setShowDatePicker((prev) => !prev)}
            disabled={isFormDisabled}
          >
            <span className="material-symbols-rounded">
              date_range
            </span>
            <span>
              {dateRange.startDate && dateRange.endDate
                ? (
                  <>
                    {formatDateDisplay(dateRange.startDate, intlLocale)}{" "}
                    <span className="material-symbols-rounded">arrow_forward</span>{" "}
                    {formatDateDisplay(dateRange.endDate, intlLocale)}
                  </>
                )
                : copy.datePlaceholder}
            </span>
          </button>
          {showDatePicker && !isFormDisabled && (
            <div>
              <DateRange
                ranges={[dateRange]}
                minDate={new Date()}
                onChange={(ranges: RangeKeyDict) => {
                  const selection = ranges.selection;
                  setDateRange(selection);

                  // Close only after both dates are chosen and they differ
                  const hasRange =
                    selection.startDate &&
                    selection.endDate &&
                    selection.startDate.getTime() !== selection.endDate.getTime();
                  if (hasRange) {
                    setShowDatePicker(false);
                  }
                }}
                rangeColors={["#10b981"]}
                moveRangeOnFirstSelection={false}
                showMonthAndYearPickers
                direction="vertical"
                locale={dateFnsLocale}
              />
            </div>
          )}
      </div>

      {/* Guests */}
      <div className="field">
        {showRoomCount && rooms.length > 1 ? (
          <div className="guests guests--rooms">
            {rooms.map((room, roomIndex) => (
              <fieldset key={`room-${roomIndex}`} className="guest-room">
                <legend className="guest-room__header">
                  <span className="material-symbols-rounded">hotel</span>
                  <span>{copy.roomLabel} {roomIndex + 1}</span>
                </legend>
                <div className="guest-room__inputs">
                  <label>
                    <span className="material-symbols-rounded">person</span>
                    {copy.adultsLabel}
                    <input
                      type="number"
                      name={`adults-${roomIndex}`}
                      min={1}
                      max={6}
                      value={room.adults}
                      disabled={isFormDisabled}
                      onChange={(e) =>
                        updateRoomGuests(roomIndex, "adults", parseInt(e.target.value) || 1)
                      }
                    />
                  </label>
                  <label>
                    <span className="material-symbols-rounded">child_friendly</span>
                    {copy.childrenLabel}
                    <input
                      type="number"
                      name={`children-${roomIndex}`}
                      min={0}
                      max={4}
                      value={room.children}
                      disabled={isFormDisabled}
                      onChange={(e) =>
                        updateRoomGuests(roomIndex, "children", parseInt(e.target.value) || 0)
                      }
                    />
                  </label>
                </div>
                {room.children > 0 && room.childAges.length > 0 && (
                  <div className="guest-room__children">
                    {room.childAges.map((age, childIndex) => (
                      <label key={`room-${roomIndex}-child-${childIndex}`}>
                        {copy.childrenAges}
                        <input
                          type="number"
                          min={0}
                          max={17}
                          value={age}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateRoomChildAge(
                              roomIndex,
                              childIndex,
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        ) : (
          <>
            <div className="guests">
              <label>
                <span className="material-symbols-rounded">person</span>
                {copy.adultsLabel}
                <input
                  type="number"
                  name="adults"
                  min={1}
                  max={6}
                  value={rooms[0].adults}
                  disabled={isFormDisabled}
                  onChange={(e) =>
                    updateRoomGuests(0, "adults", parseInt(e.target.value) || 1)
                  }
                />
              </label>
              <label>
                <span className="material-symbols-rounded">child_friendly</span>
                {copy.childrenLabel}
                <input
                  type="number"
                  name="children"
                  min={0}
                  max={4}
                  value={rooms[0].children}
                  disabled={isFormDisabled}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    updateRoomGuests(0, "children", value);
                    setShowChildAges(value > 0);
                  }}
                  onFocus={() => {
                    if (rooms[0].children > 0) {
                      setShowChildAges(true);
                    }
                  }}
                />
              </label>
            </div>
            {showChildAges && rooms[0].childAges.length > 0 && (
              <div className="children-ages" ref={childAgesRef}>
                {rooms[0].childAges.map((age, childIndex) => (
                  <label key={childIndex}>
                    {copy.childrenAges}
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={age}
                      disabled={isFormDisabled}
                      onChange={(e) =>
                        updateRoomChildAge(0, childIndex, parseInt(e.target.value) || 0)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {showRoomCount && (
        <div className="field">
          <div className="rooms">
              <label>
                <span className="material-symbols-rounded">hotel</span>
                {copy.roomsLabel}
                <input
                  type="number"
                  name="rooms"
                  min={1}
                  max={4}
                  value={rooms.length}
                  disabled={isFormDisabled}
                  onChange={(e) => updateRoomCount(parseInt(e.target.value) || 1)}
                />
              </label>
            </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFormDisabled}
        aria-label={isFormDisabled ? copy.submitLoading : copy.submitIdle}
        title={isFormDisabled ? copy.submitLoading : copy.submitIdle}
      >
        <span className="material-symbols-rounded">search</span>
        <b>{isFormDisabled ? copy.submitLoading : copy.submitIdle}</b>
      </button>

      {/* Error Message */}
      {searchError && (
        <div className="error">
          <p>⚠️ {searchError}</p>
        </div>
      )}

      <StarBorder
        as="div"
        color="#34d399"
        speed="5s"
        thickness={2}
      > </StarBorder>
    </form>
  );
}
