import type { AoryxBookingPayload } from "@/types/aoryx";
import { convertToAmd, type AmdRates } from "@/lib/currency";
import { applyMarkup } from "@/lib/pricing-utils";

type BookingTotalOptions = {
  hotelMarkup?: number | null;
};

export const calculateBookingTotal = (
  payload: AoryxBookingPayload,
  options?: BookingTotalOptions
): number => {
  const roomTotal = payload.rooms.reduce((sum, room) => {
    const net = room.price.net;
    const gross = room.price.gross;
    const price =
      typeof net === "number" && Number.isFinite(net)
        ? net
        : typeof gross === "number" && Number.isFinite(gross)
          ? gross
        : 0;
    return sum + price;
  }, 0);
  const roomTotalWithMarkup = applyMarkup(roomTotal, options?.hotelMarkup) ?? roomTotal;

  const transferTotal =
    typeof payload.transferSelection?.totalPrice === "number" &&
    Number.isFinite(payload.transferSelection.totalPrice)
      ? payload.transferSelection.totalPrice
      : 0;

  const excursionsTotal =
    typeof payload.excursions?.totalAmount === "number" &&
    Number.isFinite(payload.excursions.totalAmount)
      ? payload.excursions.totalAmount
      : 0;

  const insuranceTotal =
    typeof payload.insurance?.price === "number" && Number.isFinite(payload.insurance.price)
      ? payload.insurance.price
      : 0;

  const airTicketsTotal =
    typeof payload.airTickets?.price === "number" && Number.isFinite(payload.airTickets.price)
      ? payload.airTickets.price
      : 0;

  return roomTotalWithMarkup + transferTotal + excursionsTotal + insuranceTotal + airTicketsTotal;
};

export const calculateBookingTotalAmd = (
  payload: AoryxBookingPayload,
  rates: AmdRates | null | undefined,
  options?: BookingTotalOptions
): number | null => {
  if (!rates) return null;
  const baseCurrency = payload.currency ?? "USD";
  const roomTotal = payload.rooms.reduce((sum, room) => {
    const net = room.price.net;
    const gross = room.price.gross;
    const price =
      typeof net === "number" && Number.isFinite(net)
        ? net
        : typeof gross === "number" && Number.isFinite(gross)
          ? gross
          : 0;
    return sum + price;
  }, 0);
  const roomTotalWithMarkup = applyMarkup(roomTotal, options?.hotelMarkup) ?? roomTotal;
  const transferTotal =
    typeof payload.transferSelection?.totalPrice === "number" &&
    Number.isFinite(payload.transferSelection.totalPrice)
      ? payload.transferSelection.totalPrice
      : 0;
  const excursionsTotal =
    typeof payload.excursions?.totalAmount === "number" &&
    Number.isFinite(payload.excursions.totalAmount)
      ? payload.excursions.totalAmount
      : 0;
  const insuranceTotal =
    typeof payload.insurance?.price === "number" && Number.isFinite(payload.insurance.price)
      ? payload.insurance.price
      : 0;
  const airTicketsTotal =
    typeof payload.airTickets?.price === "number" && Number.isFinite(payload.airTickets.price)
      ? payload.airTickets.price
      : 0;

  const convertAmount = (amount: number, currency: string | null | undefined) => {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const converted = convertToAmd(amount, currency, rates);
    return converted === null ? null : converted;
  };

  const transferCurrency = payload.transferSelection?.pricing?.currency ?? baseCurrency;
  const excursionsCurrency = payload.excursions?.selections?.[0]?.currency ?? baseCurrency;
  const insuranceCurrency = payload.insurance?.currency ?? baseCurrency;
  const airTicketsCurrency = payload.airTickets?.currency ?? baseCurrency;

  const roomsConverted = convertAmount(roomTotalWithMarkup, baseCurrency);
  const transferConverted = convertAmount(transferTotal, transferCurrency);
  const excursionsConverted = convertAmount(excursionsTotal, excursionsCurrency);
  const insuranceConverted = convertAmount(insuranceTotal, insuranceCurrency);
  const airTicketsConverted = convertAmount(airTicketsTotal, airTicketsCurrency);

  if (
    roomsConverted === null ||
    transferConverted === null ||
    excursionsConverted === null ||
    insuranceConverted === null ||
    airTicketsConverted === null
  ) {
    return null;
  }

  return (
    roomsConverted +
    transferConverted +
    excursionsConverted +
    insuranceConverted +
    airTicketsConverted
  );
};

export const resolveBookingDisplayTotal = (
  payload: AoryxBookingPayload,
  rates: AmdRates | null | undefined,
  options?: BookingTotalOptions
) => {
  const amdTotal = calculateBookingTotalAmd(payload, rates, options);
  if (amdTotal !== null) {
    return { amount: Math.round(amdTotal), currency: "AMD" };
  }
  return {
    amount: calculateBookingTotal(payload, options),
    currency: payload.currency ?? "USD",
  };
};
