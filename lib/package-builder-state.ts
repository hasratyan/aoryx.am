export type PackageBuilderService = "hotel" | "flight" | "transfer" | "excursion" | "insurance";

import type { AoryxRoomSearch } from "@/types/aoryx";

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

export type PackageBuilderState = {
  hotel?: PackageBuilderHotelSelection;
  transfer?: PackageBuilderServiceSelection & {
    destinationName?: string | null;
    destinationCode?: string | null;
    transferOrigin?: string | null;
    transferDestination?: string | null;
    vehicleName?: string | null;
    transferType?: string | null;
  };
  excursion?: PackageBuilderServiceSelection & {
    selections?: Record<string, string[]>;
  };
  insurance?: PackageBuilderServiceSelection;
  flight?: PackageBuilderServiceSelection;
  sessionExpiresAt?: number;
  updatedAt?: number;
};

export const PACKAGE_BUILDER_SESSION_MS = 120 * 60 * 1000;

const STORAGE_KEY = "megatours-package-builder";
const UPDATE_EVENT = "megatours-package-builder:update";

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
