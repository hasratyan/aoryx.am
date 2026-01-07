export type PackageBuilderService = "hotel" | "flight" | "transfer" | "excursion" | "insurance";

export type ServiceFlags = Record<PackageBuilderService, boolean>;
export const DEFAULT_SERVICE_FLAGS: ServiceFlags = {
  hotel: true,
  flight: true,
  transfer: true,
  excursion: true,
  insurance: true,
};

import type { AoryxRoomSearch, BookingInsuranceTraveler } from "@/types/aoryx";

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
    transferType?: string | null;
    includeReturn?: boolean | null;
    vehicleQuantity?: number | null;
  };
  excursion?: PackageBuilderServiceSelection & {
    selections?: Record<string, string[]>;
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
    return parsed && typeof parsed === "object" ? parsed : {};
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
  writePackageBuilderState(next);
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
