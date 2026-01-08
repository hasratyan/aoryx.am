"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

// Custom marker icons
const createMarkerIcon = (isSelected: boolean, isHovered: boolean) => {
  const color = isSelected ? "#10b981" : isHovered ? "#34d399" : "#1e40af";
  const size = isSelected || isHovered ? 36 : 28;
  
  return L.divIcon({
    className: "hotel-marker",
    html: `
      <div class="hotel-marker__pin" style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span class="material-symbols-rounded" style="
          transform: rotate(45deg);
          color: white;
          font-size: ${size * 0.5}px;
          font-variation-settings: 'FILL' 1;
        ">hotel</span>
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [hoveredHotel, setHoveredHotel] = useState<string | null>(null);

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

  // Initialize map
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

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Fit to bounds if we have hotels
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapInstanceRef.current = map;

    // Capture ref for cleanup
    const currentMarkers = markersRef.current;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      currentMarkers.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validHotels.length > 0]);

  // Add/update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add markers for each hotel
    validHotels.forEach((hotel) => {
      const isSelected = selectedHotel?.value === hotel.value;
      const isHovered = hoveredHotel === hotel.value;
      
      const marker = L.marker([hotel.lat!, hotel.lng!], {
        icon: createMarkerIcon(isSelected, isHovered),
        zIndexOffset: isSelected ? 1000 : isHovered ? 500 : 0,
      });

      // Create popup content
      const rating = hotel.rating ?? 0;
      const popupContent = `
        <div class="hotel-popup">
          <div class="hotel-popup__header">
            <h4 class="hotel-popup__name">${hotel.label}</h4>
            ${rating > 0 ? `<div class="hotel-popup__rating">${generateStars(rating)}</div>` : ""}
          </div>
          <button class="hotel-popup__select" data-hotel-id="${hotel.value}">
            <span class="material-symbols-rounded">check_circle</span>
            Select Hotel
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "hotel-marker-popup",
        closeButton: false,
        autoPan: true,
      });

      // Event handlers
      marker.on("mouseover", () => {
        setHoveredHotel(hotel.value);
        marker.openPopup();
      });

      marker.on("mouseout", () => {
        setHoveredHotel(null);
      });

      marker.on("click", () => {
        onSelectHotel(hotel);
      });

      marker.addTo(map);
      markersRef.current.set(hotel.value, marker);
    });

    // Handle popup button clicks
    const handlePopupClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".hotel-popup__select") as HTMLElement;
      if (button) {
        const hotelId = button.dataset.hotelId;
        const hotel = validHotels.find((h) => h.value === hotelId);
        if (hotel) {
          onSelectHotel(hotel);
        }
      }
    };

    map.getContainer().addEventListener("click", handlePopupClick);

    return () => {
      map.getContainer().removeEventListener("click", handlePopupClick);
    };
  }, [validHotels, selectedHotel, hoveredHotel, onSelectHotel]);

  // Update marker icons when selection or hover changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, hotelId) => {
      const isSelected = selectedHotel?.value === hotelId;
      const isHovered = hoveredHotel === hotelId;
      marker.setIcon(createMarkerIcon(isSelected, isHovered));
      marker.setZIndexOffset(isSelected ? 1000 : isHovered ? 500 : 0);
    });
  }, [selectedHotel, hoveredHotel]);

  if (validHotels.length === 0) {
    return (
      <div className="hotel-map-picker hotel-map-picker--empty">
        <span className="material-symbols-rounded">location_off</span>
        <p>No hotels with location data available</p>
      </div>
    );
  }

  return (
    <div className="hotel-map-picker">
      <div className="hotel-map-picker__info">
        <span className="material-symbols-rounded">touch_app</span>
        <span>
          {validHotels.length} hotel{validHotels.length !== 1 ? "s" : ""} — Click a marker to select
        </span>
      </div>
      <div className="hotel-map-picker__map" ref={mapRef} />
    </div>
  );
}
