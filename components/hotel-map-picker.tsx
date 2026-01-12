"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/components/language-provider";
import type { PluralForms } from "@/lib/i18n";

// Types - exported for use in search-form
export type MapLocationOption = {
  value: string;
  label: string;
  rawId?: string;
  type: "destination" | "hotel";
  parentDestinationId?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  imageUrl?: string;
  price?: string;
};

export type HotelMapPickerProps = {
  hotels: MapLocationOption[];
  selectedHotel: MapLocationOption | null;
  onSelectHotel: (hotel: MapLocationOption) => void;
};

// Marker colors
const MARKER_COLOR_DEFAULT = "#1e40af";
const MARKER_COLOR_HOVER = "#34d399";
const MARKER_COLOR_SELECTED = "#10b981";
const MARKER_SIZE_DEFAULT = 28;
const MARKER_SIZE_ACTIVE = 36;

// Custom marker icons - uses CSS classes for state to avoid recreating icons
const createMarkerIcon = (isSelected: boolean) => {
  const color = isSelected ? MARKER_COLOR_SELECTED : MARKER_COLOR_DEFAULT;
  const size = isSelected ? MARKER_SIZE_ACTIVE : MARKER_SIZE_DEFAULT;
  
  return L.divIcon({
    className: `hotel-marker ${isSelected ? "hotel-marker--selected" : ""}`,
    html: `
      <div class="hotel-marker__pin">
        <span class="material-symbols-rounded">hotel</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Generate star rating HTML
const generateStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let starsHtml = "";
  
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<span class="material-symbols-rounded star-icon">star</span>';
  }
  if (hasHalfStar) {
    starsHtml += '<span class="material-symbols-rounded star-icon">star_half</span>';
  }
  
  return starsHtml;
};

export default function HotelMapPicker({ hotels, selectedHotel, onSelectHotel }: HotelMapPickerProps) {
  const { locale, t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const hotelsRef = useRef<Map<string, MapLocationOption>>(new Map());
  const pluralRules = useMemo(() => new Intl.PluralRules(locale), [locale]);
  const formatPlural = useCallback((count: number, forms: PluralForms) => {
    const category = pluralRules.select(count);
    const template = forms[category] ?? forms.other;
    return template.replace("{count}", count.toString());
  }, [pluralRules]);

  // Filter hotels with valid coordinates
  const validHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const lat = hotel.lat;
      const lng = hotel.lng;
      return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        lat !== 0 &&
        lng !== 0 &&
        !isNaN(lat) &&
        !isNaN(lng)
      );
    });
  }, [hotels]);

  // Build a lookup map for hotels
  useEffect(() => {
    hotelsRef.current.clear();
    validHotels.forEach((hotel) => {
      hotelsRef.current.set(hotel.value, hotel);
    });
  }, [validHotels]);

  // Stable callback for hotel selection
  const handleHotelSelect = useCallback((hotelId: string) => {
    const hotel = hotelsRef.current.get(hotelId);
    if (hotel) {
      onSelectHotel(hotel);
    }
  }, [onSelectHotel]);

  // Calculate map bounds from hotels
  const bounds = useMemo(() => {
    if (validHotels.length === 0) return null;
    
    const lats = validHotels.map((h) => h.lat!);
    const lngs = validHotels.map((h) => h.lng!);
    
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [validHotels]);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (validHotels.length === 0) return;

    // Default center (Dubai)
    const defaultCenter: L.LatLngExpression = [25.2048, 55.2708];
    
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add tile layer (OpenStreetMap light theme)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Fit to bounds if we have hotels
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validHotels.length > 0]);

  // Add markers (only when hotels change, not on hover/selection)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add markers for each hotel
    validHotels.forEach((hotel) => {
      const isSelected = selectedHotel?.value === hotel.value;
      
      const marker = L.marker([hotel.lat!, hotel.lng!], {
        icon: createMarkerIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      // Create lightweight tooltip for hover (no image, just text)
      const rating = hotel.rating ?? 0;
      const tooltipContent = `
        <div class="hotel-tooltip">
          <div class="hotel-tooltip__name">${hotel.label}</div>
          ${rating > 0 ? `<div class="hotel-tooltip__rating">${generateStars(rating)}<span>${rating.toFixed(1)}</span></div>` : ""}
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        className: "hotel-marker-tooltip",
        direction: "top",
        offset: [0, -20],
        opacity: 1,
      });

      // Click handler - select the hotel
      marker.on("click", () => {
        handleHotelSelect(hotel.value);
      });

      marker.addTo(map);
      markersRef.current.set(hotel.value, marker);
    });

    // Handle popup button clicks (in case popup is clicked instead of marker)
    const handlePopupClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".hotel-popup__select") as HTMLElement;
      if (button) {
        const hotelId = button.dataset.hotelId;
        if (hotelId) {
          handleHotelSelect(hotelId);
        }
      }
    };

    map.getContainer().addEventListener("click", handlePopupClick);

    return () => {
      map.getContainer().removeEventListener("click", handlePopupClick);
    };
  }, [validHotels, selectedHotel?.value, handleHotelSelect]);

  // Update only the selected marker's icon when selection changes (lightweight update)
  useEffect(() => {
    markersRef.current.forEach((marker, hotelId) => {
      const isSelected = selectedHotel?.value === hotelId;
      marker.setIcon(createMarkerIcon(isSelected));
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });
  }, [selectedHotel?.value]);

  if (validHotels.length === 0) {
    return (
      <div className="hotel-map-picker hotel-map-picker--empty">
        <span className="material-symbols-rounded">location_off</span>
        <p>{t.search.mapEmpty}</p>
      </div>
    );
  }

  return (
    <div className="hotel-map-picker">
      <div className="hotel-map-picker__info">
        <span className="material-symbols-rounded">touch_app</span>
        <span>
          {formatPlural(validHotels.length, t.search.mapHotelsCount)} — {t.search.mapSelectHint}
        </span>
      </div>
      <div className="hotel-map-picker__map" ref={mapRef} />
    </div>
  );
}
