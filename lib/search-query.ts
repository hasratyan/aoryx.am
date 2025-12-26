import type { AoryxSearchParams } from "@/types/aoryx";

export type ParsedSearch = {
  payload: AoryxSearchParams | null;
  error?: string;
  notice?: string;
};

const createDefaultRooms = (): AoryxSearchParams["rooms"] => [
  { roomIdentifier: 1, adults: 2, childrenAges: [] },
];

function parseRooms(raw: string | null): { rooms: AoryxSearchParams["rooms"]; notice?: string } {
  if (!raw) return { rooms: createDefaultRooms() };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { rooms: createDefaultRooms(), notice: "Your room selection has been reset due to invalid data. Please re-enter your preferences." };
    }

    const rooms = parsed.map((room: Record<string, unknown>, index: number) => ({
      roomIdentifier: typeof room?.roomIdentifier === "number" ? room.roomIdentifier : index + 1,
      adults: typeof room?.adults === "number" ? room.adults : 2,
      childrenAges: Array.isArray(room?.childrenAges)
        ? room.childrenAges.filter((age): age is number => typeof age === "number")
        : [],
    }));

    return { rooms };
  } catch {
    return { rooms: createDefaultRooms(), notice: "Your room selection has been reset due to invalid data. Please re-enter your preferences." };
  }
}

export function parseSearchParams(searchParams: URLSearchParams): ParsedSearch {
  const destinationCode = searchParams.get("destinationCode") ?? undefined;
  const hotelCode = searchParams.get("hotelCode") ?? undefined;
  const countryCode = searchParams.get("countryCode") ?? "AE";
  const nationality = searchParams.get("nationality") ?? "AM";
  const currency = searchParams.get("currency") ?? "USD";
  const checkInDate = searchParams.get("checkInDate") ?? undefined;
  const checkOutDate = searchParams.get("checkOutDate") ?? undefined;
  const { rooms, notice } = parseRooms(searchParams.get("rooms"));

  if (!checkInDate || !checkOutDate) {
    return { payload: null, error: "Please select your travel dates to begin your search." };
  }

  if (!destinationCode && !hotelCode) {
    return { payload: null, error: "Please select a destination or hotel to view available results." };
  }

  return {
    payload: {
      destinationCode,
      hotelCode,
      countryCode,
      nationality,
      currency,
      checkInDate,
      checkOutDate,
      rooms,
    },
    notice,
  };
}

export function buildSearchQuery(params: AoryxSearchParams): string {
  const search = new URLSearchParams();
  if (params.destinationCode) search.set("destinationCode", params.destinationCode);
  if (params.hotelCode) search.set("hotelCode", params.hotelCode);
  search.set("countryCode", params.countryCode);
  search.set("nationality", params.nationality);
  search.set("currency", params.currency ?? "USD");
  search.set("checkInDate", params.checkInDate);
  search.set("checkOutDate", params.checkOutDate);
  search.set("rooms", JSON.stringify(params.rooms));
  return search.toString();
}
