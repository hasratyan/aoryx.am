export type PackageBuilderService = "hotel" | "flight" | "transfer" | "excursion" | "insurance";

export type ServiceFlags = Record<PackageBuilderService, boolean>;
export const DEFAULT_SERVICE_FLAGS: ServiceFlags = {
  hotel: true,
  flight: true,
  transfer: true,
  excursion: true,
  insurance: true,
};

import type {
  AoryxExcursionSelection,
  AoryxRoomSearch,
  AoryxTransferChargeType,
  AoryxTransferLocation,
  AoryxTransferPricing,
  AoryxTransferVehicle,
  BookingInsuranceTraveler,
} from "@/types/aoryx";

export type PackageBuilderHotelSelection = {
  selected: boolean;
  hotelCode?: string | null;
  hotelName?: string | null;
  destinationName?: string | null;
  destinationCode?: string | null;
  countryCode?: string | null;
  nationality?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  roomCount?: number | null;
  guestCount?: number | null;
  mealPlan?: string | null;
  rooms?: AoryxRoomSearch[] | null;
  roomSelections?: Array<{
    roomIdentifier: number;
    rateKey: string;
    price: {
      gross: number | null;
      net: number | null;
      tax: number | null;
    };
  }> | null;
  price?: number | null;
  currency?: string | null;
  selectionKey?: string | null;
};

const DEFAULT_CHILD_AGE = 8;

const buildHotelSelectionKey = (selection?: PackageBuilderHotelSelection | null) =>
  selection
    ? [
        selection.hotelCode ?? "",
        selection.destinationCode ?? "",
        selection.checkInDate ?? "",
        selection.checkOutDate ?? "",
        selection.roomCount ?? "",
        selection.guestCount ?? "",
        selection.selectionKey ?? "",
      ].join("|")
    : "";

const buildRoomsFromExcursionSelections = (
  selections?: Record<string, string[]> | null
): AoryxRoomSearch[] | null => {
  if (!selections) return null;
  const roomMap = new Map<number, { adults: number; children: number }>();
  Object.keys(selections).forEach((key) => {
    const match = /^(\d+):(adult|child)-(\d+)$/i.exec(key);
    if (!match) return;
    const roomId = Number(match[1]);
    const type = match[2]?.toLowerCase();
    const index = Number(match[3]);
    if (!Number.isFinite(roomId) || roomId <= 0) return;
    if (!Number.isFinite(index) || index <= 0) return;
    const entry = roomMap.get(roomId) ?? { adults: 0, children: 0 };
    if (type === "adult") {
      entry.adults = Math.max(entry.adults, index);
    } else if (type === "child") {
      entry.children = Math.max(entry.children, index);
    }
    roomMap.set(roomId, entry);
  });
  if (roomMap.size === 0) return null;
  return Array.from(roomMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roomIdentifier, counts]) => {
      const adults = counts.adults > 0 ? counts.adults : counts.children > 0 ? 1 : 2;
      const childrenAges = Array.from({ length: counts.children }, () => DEFAULT_CHILD_AGE);
      return { roomIdentifier, adults, childrenAges };
    });
};

const buildFallbackRooms = (
  roomCount?: number | null,
  guestCount?: number | null
): AoryxRoomSearch[] => {
  const safeRoomCount =
    typeof roomCount === "number" && Number.isFinite(roomCount) && roomCount > 0
      ? Math.floor(roomCount)
      : 1;
  const safeGuestCount =
    typeof guestCount === "number" && Number.isFinite(guestCount) && guestCount > 0
      ? Math.floor(guestCount)
      : safeRoomCount * 2;
  const base = Math.floor(safeGuestCount / safeRoomCount);
  const remainder = safeGuestCount % safeRoomCount;
  return Array.from({ length: safeRoomCount }, (_, index) => ({
    roomIdentifier: index + 1,
    adults: base + (index < remainder ? 1 : 0),
    childrenAges: [],
  }));
};

const normalizeHotelRooms = (
  next: PackageBuilderState,
  prev: PackageBuilderState
): PackageBuilderState => {
  if (!next.hotel?.selected) return next;
  const nextRooms = next.hotel.rooms;
  if (Array.isArray(nextRooms) && nextRooms.length > 0) return next;
  const prevRooms = prev.hotel?.rooms;
  const sameHotel = buildHotelSelectionKey(prev.hotel) === buildHotelSelectionKey(next.hotel);
  const selectionRooms = buildRoomsFromExcursionSelections(next.excursion?.selections ?? null);
  const resolvedRooms =
    sameHotel && Array.isArray(prevRooms) && prevRooms.length > 0
      ? prevRooms
      : selectionRooms ??
        buildFallbackRooms(next.hotel.roomCount ?? null, next.hotel.guestCount ?? null);
  const resolvedRoomCount =
    typeof next.hotel.roomCount === "number" && next.hotel.roomCount > 0
      ? next.hotel.roomCount
      : resolvedRooms.length;
  const resolvedGuestCount =
    typeof next.hotel.guestCount === "number" && next.hotel.guestCount > 0
      ? next.hotel.guestCount
      : resolvedRooms.reduce(
          (sum, room) =>
            sum + room.adults + (Array.isArray(room.childrenAges) ? room.childrenAges.length : 0),
          0
        );
  return {
    ...next,
    hotel: {
      ...next.hotel,
      rooms: resolvedRooms,
      roomCount: resolvedRoomCount,
      guestCount: resolvedGuestCount,
    },
  };
};

export type PackageBuilderServiceSelection = {
  selected: boolean;
  selectionId?: string | null;
  label?: string | null;
  price?: number | null;
  currency?: string | null;
};

export type PackageBuilderInsuranceSelection = PackageBuilderServiceSelection & {
  provider?: "efes" | null;
  planId?: string | null;
  planLabel?: string | null;
  riskAmount?: number | null;
  riskCurrency?: string | null;
  riskLabel?: string | null;
  quoteSum?: number | null;
  quoteDiscountedSum?: number | null;
  quoteSumByGuest?: Record<string, number> | null;
  quoteDiscountedSumByGuest?: Record<string, number> | null;
  quotePriceCoverages?: Record<string, number> | null;
  quoteDiscountedPriceCoverages?: Record<string, number> | null;
  quotePriceCoveragesByGuest?: Record<string, Record<string, number>> | null;
  quoteDiscountedPriceCoveragesByGuest?: Record<string, Record<string, number>> | null;
  quotePremiumsByGuest?: Record<string, number> | null;
  quoteError?: string | null;
  insuredGuestIds?: string[] | null;
  subrisksByGuest?: Record<string, string[]> | null;
  territoryCode?: string | null;
  territoryLabel?: string | null;
  territoryPolicyLabel?: string | null;
  travelCountries?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  subrisks?: string[] | null;
  travelers?: BookingInsuranceTraveler[] | null;
};

export type PackageBuilderFlightSelection = PackageBuilderServiceSelection & {
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  cabinClass?: string | null;
  notes?: string | null;
};

export type PackageBuilderState = {
  hotel?: PackageBuilderHotelSelection;
  transfer?: PackageBuilderServiceSelection & {
    destinationName?: string | null;
    destinationCode?: string | null;
    transferOrigin?: string | null;
    transferDestination?: string | null;
    vehicleName?: string | null;
    vehicleMaxPax?: number | null;
    transferType?: string | null;
    includeReturn?: boolean | null;
    vehicleQuantity?: number | null;
    origin?: AoryxTransferLocation | null;
    destination?: AoryxTransferLocation | null;
    vehicle?: AoryxTransferVehicle | null;
    paxRange?: { minPax?: number | null; maxPax?: number | null } | null;
    pricing?: AoryxTransferPricing | null;
    validity?: { from?: string | null; to?: string | null } | null;
    chargeType?: AoryxTransferChargeType | null;
    paxCount?: number | null;
  };
  excursion?: PackageBuilderServiceSelection & {
    selections?: Record<string, string[]>;
    items?: Array<{ id: string; name?: string | null }>;
    selectionsDetailed?: AoryxExcursionSelection[];
  };
  insurance?: PackageBuilderInsuranceSelection;
  flight?: PackageBuilderFlightSelection;
  sessionExpiresAt?: number;
  updatedAt?: number;
};

export const PACKAGE_BUILDER_SESSION_MS = 120 * 60 * 1000;

const STORAGE_KEY = "megatours-package-builder";
const UPDATE_EVENT = "megatours-package-builder:update";
export const PACKAGE_BUILDER_OPEN_EVENT = "megatours-package-builder:open";
const OWNER_KEY = "megatours-package-builder:owner";
const OWNER_STATE_PREFIX = "megatours-package-builder:state:";

const isBrowser = typeof window !== "undefined";

export const readPackageBuilderState = (): PackageBuilderState => {
  if (!isBrowser) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PackageBuilderState;
    if (!parsed || typeof parsed !== "object") return {};
    const normalized = normalizeHotelRooms(parsed, {});
    if (normalized !== parsed) {
      writePackageBuilderState(normalized);
      return normalized;
    }
    return parsed;
  } catch {
    return {};
  }
};

export const readPackageBuilderOwner = (): string | null => {
  if (!isBrowser) return null;
  const owner = window.localStorage.getItem(OWNER_KEY);
  return owner && owner.trim().length > 0 ? owner : null;
};

export const writePackageBuilderOwner = (owner: string | null) => {
  if (!isBrowser) return;
  if (!owner) {
    window.localStorage.removeItem(OWNER_KEY);
    return;
  }
  window.localStorage.setItem(OWNER_KEY, owner);
};

const ownerStateKey = (owner: string) => `${OWNER_STATE_PREFIX}${owner}`;

export const readPackageBuilderStateForOwner = (owner: string): PackageBuilderState => {
  if (!isBrowser) return {};
  const raw = window.localStorage.getItem(ownerStateKey(owner));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PackageBuilderState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const writePackageBuilderStateForOwner = (owner: string, state: PackageBuilderState) => {
  if (!isBrowser) return;
  window.localStorage.setItem(ownerStateKey(owner), JSON.stringify(state));
};

export const clearPackageBuilderStateForOwner = (owner: string) => {
  if (!isBrowser) return;
  window.localStorage.removeItem(ownerStateKey(owner));
};

export const writePackageBuilderState = (state: PackageBuilderState) => {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const updatePackageBuilderState = (
  updater: (prev: PackageBuilderState) => PackageBuilderState
) => {
  const prev = readPackageBuilderState();
  const next = updater(prev);
  writePackageBuilderState(normalizeHotelRooms(next, prev));
};

export const subscribePackageBuilderState = (callback: () => void) => {
  if (!isBrowser) return () => {};
  const handler = () => callback();
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

export const openPackageBuilder = () => {
  if (!isBrowser) return;
  window.dispatchEvent(new Event(PACKAGE_BUILDER_OPEN_EVENT));
};
