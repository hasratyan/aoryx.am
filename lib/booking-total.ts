import type { AoryxBookingPayload } from "@/types/aoryx";

export const calculateBookingTotal = (payload: AoryxBookingPayload): number => {
  return payload.rooms.reduce((sum, room) => {
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
};
