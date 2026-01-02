export type FlydubaiSearchRequest = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  cabinClass?: string | null;
  adults?: number | null;
  children?: number | null;
  currency?: string | null;
};

export type FlydubaiFlightSegment = {
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  flightNumber?: string | null;
  durationMinutes?: number | null;
  stops?: number | null;
};

export type FlydubaiFlightOffer = {
  id: string;
  totalPrice: number;
  currency: string;
  cabinClass?: string | null;
  refundable?: boolean | null;
  segments: FlydubaiFlightSegment[];
  returnSegments?: FlydubaiFlightSegment[] | null;
};

export type FlydubaiSearchResponse = {
  offers: FlydubaiFlightOffer[];
  currency: string;
  mock?: boolean;
};
