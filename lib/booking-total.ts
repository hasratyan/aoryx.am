import type { AoryxBookingPayload } from "@/types/aoryx";

export const calculateBookingTotal = (payload: AoryxBookingPayload): number => {
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

  return roomTotal + transferTotal + excursionsTotal + insuranceTotal + airTicketsTotal;
};
