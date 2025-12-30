export type PackageBuilderService = "hotel" | "flight" | "transfer" | "excursion" | "insurance";

export type PackageBuilderHotelSelection = {
  selected: boolean;
  hotelCode?: string | null;
  hotelName?: string | null;
  destinationName?: string | null;
  destinationCode?: string | null;
};

export type PackageBuilderServiceSelection = {
  selected: boolean;
  selectionId?: string | null;
  label?: string | null;
};

export type PackageBuilderState = {
  hotel?: PackageBuilderHotelSelection;
  transfer?: PackageBuilderServiceSelection & {
    destinationName?: string | null;
    destinationCode?: string | null;
  };
  excursion?: PackageBuilderServiceSelection;
  insurance?: PackageBuilderServiceSelection;
  flight?: PackageBuilderServiceSelection;
  updatedAt?: number;
};

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
