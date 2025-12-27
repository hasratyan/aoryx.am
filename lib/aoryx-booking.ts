import type { AoryxBookingPayload } from "@/types/aoryx";
import type { StoredPrebookState } from "@/app/api/aoryx/_shared";
import { decodeRateToken, hashRateKey, isRateToken } from "@/lib/aoryx-rate-tokens";

type UnknownRecord = Record<string, unknown>;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseTransferSelection = (
  input: unknown
): AoryxBookingPayload["transferSelection"] => {
  if (!input || typeof input !== "object") return undefined;
  const record = input as UnknownRecord;
  const transferTypeRaw = sanitizeString(record.transferType)?.toUpperCase();
  const transferType =
    transferTypeRaw === "INDIVIDUAL" || transferTypeRaw === "GROUP" ? transferTypeRaw : undefined;

  const originRaw = record.origin as UnknownRecord | undefined;
  const origin = originRaw
    ? {
        locationCode: sanitizeString(originRaw.locationCode),
        locationType: sanitizeString(originRaw.locationType),
        countryCode: sanitizeString(originRaw.countryCode),
        cityCode: sanitizeString(originRaw.cityCode),
        zoneCode: sanitizeString(originRaw.zoneCode),
        airportCode: sanitizeString(originRaw.airportCode),
        name: sanitizeString(originRaw.name),
      }
    : undefined;

  const destinationRaw = record.destination as UnknownRecord | undefined;
  const destination = destinationRaw
    ? {
        locationCode: sanitizeString(destinationRaw.locationCode),
        locationType: sanitizeString(destinationRaw.locationType),
        countryCode: sanitizeString(destinationRaw.countryCode),
        cityCode: sanitizeString(destinationRaw.cityCode),
        zoneCode: sanitizeString(destinationRaw.zoneCode),
        airportCode: sanitizeString(destinationRaw.airportCode),
        name: sanitizeString(destinationRaw.name),
      }
    : undefined;

  const vehicleRaw = record.vehicle as UnknownRecord | undefined;
  const vehicle = vehicleRaw
    ? {
        code: sanitizeString(vehicleRaw.code),
        category: sanitizeString(vehicleRaw.category),
        name: sanitizeString(vehicleRaw.name),
        maxPax: toNumber(vehicleRaw.maxPax),
        maxBags: toNumber(vehicleRaw.maxBags),
      }
    : undefined;

  const paxRangeRaw = record.paxRange as UnknownRecord | undefined;
  const paxRange = paxRangeRaw
    ? {
        minPax: toNumber(paxRangeRaw.minPax),
        maxPax: toNumber(paxRangeRaw.maxPax),
      }
    : undefined;

  const pricingRaw = record.pricing as UnknownRecord | undefined;
  const chargeTypeRaw = sanitizeString(pricingRaw?.chargeType)?.toUpperCase();
  const chargeType =
    chargeTypeRaw === "PER_PAX" || chargeTypeRaw === "PER_VEHICLE" ? chargeTypeRaw : undefined;
  const pricing = pricingRaw
    ? {
        currency: sanitizeString(pricingRaw.currency),
        chargeType,
        oneWay: toNumber(pricingRaw.oneWay),
        return: toNumber(pricingRaw.return),
      }
    : undefined;

  const validityRaw = record.validity as UnknownRecord | undefined;
  const validity = validityRaw
    ? {
        from: sanitizeString(validityRaw.from),
        to: sanitizeString(validityRaw.to),
      }
    : undefined;

  const flightDetailsRaw = record.flightDetails as UnknownRecord | undefined;
  const flightDetails = flightDetailsRaw
    ? {
        flightNumber: sanitizeString(flightDetailsRaw.flightNumber) ?? "",
        arrivalDateTime: sanitizeString(flightDetailsRaw.arrivalDateTime) ?? "",
      }
    : undefined;

  const selection = {
    id: sanitizeString(record.id),
    transferType,
    origin,
    destination,
    bothDirections: typeof record.bothDirections === "boolean" ? record.bothDirections : undefined,
    vehicle,
    paxRange,
    pricing,
    validity,
    includeReturn: typeof record.includeReturn === "boolean" ? record.includeReturn : undefined,
    quantity: toNumber(record.quantity),
    flightDetails,
    totalPrice: toNumber(record.totalPrice),
    paxCount: toNumber(record.paxCount),
  };

  if (!selection.totalPrice && !selection.id && !selection.transferType) {
    return undefined;
  }

  return selection;
};

const parseExcursions = (
  input: unknown
): AoryxBookingPayload["excursions"] => {
  if (!input || typeof input !== "object") return undefined;
  const record = input as UnknownRecord;
  const totalAmountRaw = toNumber(record.totalAmount);
  const selectionsRaw = Array.isArray(record.selections) ? record.selections : [];

  const selections = selectionsRaw
    .map((entry) => {
      const entryRecord = entry as UnknownRecord;
      const id = sanitizeString(entryRecord.id);
      if (!id) return null;
      return {
        id,
        name: sanitizeString(entryRecord.name),
        quantityAdult: toNumber(entryRecord.quantityAdult),
        quantityChild: toNumber(entryRecord.quantityChild),
        priceAdult: toNumber(entryRecord.priceAdult),
        priceChild: toNumber(entryRecord.priceChild),
        currency: sanitizeString(entryRecord.currency),
        childPolicy: sanitizeString(entryRecord.childPolicy),
        totalPrice: toNumber(entryRecord.totalPrice),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (selections.length === 0 && totalAmountRaw === null) {
    return undefined;
  }

  const totalAmount =
    totalAmountRaw ??
    selections.reduce((sum, selection) => {
      if (typeof selection.totalPrice === "number") return sum + selection.totalPrice;
      const adultPrice = selection.priceAdult ?? 0;
      const childPrice = selection.priceChild ?? selection.priceAdult ?? 0;
      const adultQty = selection.quantityAdult ?? 0;
      const childQty = selection.quantityChild ?? 0;
      return sum + adultQty * adultPrice + childQty * childPrice;
    }, 0);

  return {
    totalAmount,
    selections,
  };
};

const parseInsurance = (
  input: unknown
): AoryxBookingPayload["insurance"] => {
  if (!input || typeof input !== "object") return undefined;
  const record = input as UnknownRecord;
  const planId = sanitizeString(record.planId);
  if (!planId) return undefined;
  return {
    planId,
    planName: sanitizeString(record.planName),
    note: sanitizeString(record.note),
    price: toNumber(record.price),
    currency: sanitizeString(record.currency),
  };
};

const parseAirTickets = (
  input: unknown
): AoryxBookingPayload["airTickets"] => {
  if (!input || typeof input !== "object") return undefined;
  const record = input as UnknownRecord;
  const origin = sanitizeString(record.origin);
  const destination = sanitizeString(record.destination);
  const departureDate = sanitizeString(record.departureDate);
  const returnDate = sanitizeString(record.returnDate);
  const cabinClass = sanitizeString(record.cabinClass);
  const notes = sanitizeString(record.notes);
  const price = toNumber(record.price);
  const currency = sanitizeString(record.currency);

  if (!origin && !destination && !departureDate && !returnDate && !cabinClass && !notes && price === null) {
    return undefined;
  }

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    cabinClass,
    notes,
    price,
    currency,
  };
};

const parseGuests = (input: unknown): AoryxBookingPayload["rooms"][number]["guests"] => {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Each room requires at least one guest");
  }
  return input.map((guest, index) => {
    const guestRecord = guest as UnknownRecord;
    const firstName = sanitizeString(guestRecord.firstName) ?? "";
    const lastName = sanitizeString(guestRecord.lastName) ?? "";
    const typeRaw =
      typeof guestRecord.type === "string" ? guestRecord.type.trim().toLowerCase() : "adult";
    const type = typeRaw === "child" ? "Child" : "Adult";
    const ageRaw = guestRecord.age;
    const age = typeof ageRaw === "number" ? ageRaw : Number(ageRaw ?? 0);

    if (!firstName || !lastName) {
      throw new Error(`Guest ${index + 1} must include firstName and lastName`);
    }
    if (!Number.isFinite(age) || age < 0) {
      throw new Error(`Guest ${index + 1} has invalid age`);
    }

    const titleText =
      sanitizeString(guestRecord.title) ?? (type === "Child" ? "Master" : "Mr.");

    return {
      title: titleText,
      titleCode: sanitizeString(guestRecord.titleCode),
      firstName,
      lastName,
      isLeadGuest: Boolean(guestRecord.isLeadGuest),
      type,
      age,
    };
  });
};

const ensureSingleLeadGuest = (rooms: AoryxBookingPayload["rooms"]): AoryxBookingPayload["rooms"] => {
  let leadRoomIndex: number | null = null;
  let leadGuestIndex: number | null = null;

  rooms.forEach((room, roomIdx) => {
    room.guests.forEach((guest, guestIdx) => {
      if (leadRoomIndex === null && guest.isLeadGuest) {
        leadRoomIndex = roomIdx;
        leadGuestIndex = guestIdx;
      }
    });
  });

  if (leadRoomIndex === null) {
    rooms.forEach((room, roomIdx) => {
      room.guests.forEach((guest, guestIdx) => {
        if (leadRoomIndex === null && guest.type === "Adult") {
          leadRoomIndex = roomIdx;
          leadGuestIndex = guestIdx;
        }
      });
    });
  }

  if (leadRoomIndex === null) {
    leadRoomIndex = 0;
    leadGuestIndex = 0;
  }

  return rooms.map((room, roomIdx) => ({
    ...room,
    guests: room.guests.map((guest, guestIdx) => ({
      ...guest,
      isLeadGuest: roomIdx === leadRoomIndex && guestIdx === leadGuestIndex,
    })),
  }));
};

const parseRooms = (
  input: unknown,
  context?: { sessionId?: string; hotelCode?: string }
): {
  rooms: AoryxBookingPayload["rooms"];
  groupCodeFromTokens: number | null;
  sessionIdFromTokens: string | null;
} => {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("rooms must be a non-empty array");
  }

  let sawToken = false;
  let sawRaw = false;
  const groupCodes: number[] = [];
  const sessionIds: string[] = [];

  const parsed = input.map((room, index) => {
    const roomRecord = room as UnknownRecord;
    const roomIdentifierRaw = roomRecord.roomIdentifier;
    const rateKeyRaw = sanitizeString(roomRecord.rateKey) ?? "";
    const price = roomRecord.price as
      | { gross?: unknown; net?: unknown; tax?: unknown }
      | undefined;

    const gross = toNumber(price?.gross);
    const net = toNumber(price?.net);
    const tax = toNumber(price?.tax) ?? 0;

    const roomIdentifier = typeof roomIdentifierRaw === "number" ? roomIdentifierRaw : index + 1;

    let rateKey = rateKeyRaw;
    if (rateKeyRaw && isRateToken(rateKeyRaw)) {
      sawToken = true;
      const decoded = decodeRateToken(rateKeyRaw);
      if (context?.sessionId && decoded.sessionId && decoded.sessionId !== context.sessionId) {
        throw new Error("Rate token session mismatch. Please prebook again.");
      }
      if (context?.hotelCode && decoded.hotelCode && decoded.hotelCode !== context.hotelCode) {
        throw new Error("Rate token hotel mismatch. Please prebook again.");
      }
      rateKey = decoded.rateKey;
      groupCodes.push(decoded.groupCode);
      if (decoded.sessionId) {
        sessionIds.push(decoded.sessionId);
      }
    } else {
      sawRaw = true;
    }

    if (!rateKey) {
      throw new Error(`Room ${roomIdentifier} is missing rateKey`);
    }
    if (gross === null || net === null) {
      throw new Error(`Room ${roomIdentifier} price must include gross and net values`);
    }

    const guests = parseGuests(roomRecord.guests);
    const adultsRaw = roomRecord.adults;
    const adults =
      typeof adultsRaw === "number"
        ? adultsRaw
        : guests.filter((g) => g.type === "Adult").length;

    if (!Number.isFinite(adults) || adults <= 0) {
      throw new Error(`Invalid adults count for room ${roomIdentifier}`);
    }

    const childrenRaw = roomRecord.childrenAges ?? roomRecord.children;
    const childrenFromPayload = Array.isArray(childrenRaw)
      ? childrenRaw
          .map((value) => {
            const parsedAge = toNumber(value);
            return parsedAge !== null ? parsedAge : undefined;
          })
          .filter((value): value is number => value !== undefined)
      : [];
    const childrenFromGuests = guests
      .filter((guest) => guest.type === "Child")
      .map((guest) => guest.age);
    const childrenAges = childrenFromPayload.length > 0 ? childrenFromPayload : childrenFromGuests;

    return {
      roomIdentifier,
      adults,
      childrenAges,
      rateKey,
      guests,
      price: {
        gross,
        net,
        tax,
      },
    };
  });

  if (sawToken && sawRaw) {
    throw new Error("Mixed rate token and raw rate key payload.");
  }

  let groupCodeFromTokens: number | null = null;
  if (groupCodes.length > 0) {
    groupCodeFromTokens = groupCodes[0];
    if (groupCodes.some((code) => code !== groupCodeFromTokens)) {
      throw new Error("Rate selection changed. Please prebook again.");
    }
  }

  const uniqueSessionIds = Array.from(new Set(sessionIds));
  const sessionIdFromTokens = uniqueSessionIds.length > 0 ? uniqueSessionIds[0] : null;
  if (uniqueSessionIds.length > 1) {
    throw new Error("Rate selection changed. Please prebook again.");
  }

  return { rooms: ensureSingleLeadGuest(parsed), groupCodeFromTokens, sessionIdFromTokens };
};

export const parseBookingPayload = (body: unknown, sessionId?: string): AoryxBookingPayload => {
  const record = body as UnknownRecord;
  const hotelCode = sanitizeString(record.hotelCode) ?? "";
  if (!hotelCode) {
    throw new Error("hotelCode is required");
  }

  const destinationCode = sanitizeString(record.destinationCode) ?? "";
  if (!destinationCode) {
    throw new Error("destinationCode is required");
  }

  const hotelName = sanitizeString(record.hotelName);
  const checkInDate = sanitizeString(record.checkInDate);
  const checkOutDate = sanitizeString(record.checkOutDate);

  const nationality = sanitizeString(record.nationality) ?? "AM";
  const countryCode = sanitizeString(record.countryCode) ?? "AE";
  const currency = sanitizeString(record.currency) ?? "USD";
  const customerRefNumber = sanitizeString(record.customerRefNumber) ?? `MEGA-${Date.now()}`;
  const transferSelection = parseTransferSelection(record.transferSelection);
  const excursions = parseExcursions(record.excursions);
  const insurance = parseInsurance(record.insurance);
  const airTickets = parseAirTickets(record.airTickets);

  const { rooms, groupCodeFromTokens, sessionIdFromTokens } = parseRooms(record.rooms, {
    sessionId,
    hotelCode,
  });
  const parsedGroupCode = Number(record.groupCode);
  const resolvedGroupCode = Number.isFinite(parsedGroupCode) ? parsedGroupCode : groupCodeFromTokens;
  if (resolvedGroupCode === null || !Number.isFinite(resolvedGroupCode)) {
    throw new Error("groupCode must be a number");
  }
  if (groupCodeFromTokens !== null && groupCodeFromTokens !== resolvedGroupCode) {
    throw new Error("Rate selection changed. Please prebook again.");
  }

  const resolvedSessionId = sessionId ?? sessionIdFromTokens ?? "";
  if (!resolvedSessionId) {
    throw new Error("sessionId is required");
  }

  return {
    sessionId: resolvedSessionId,
    hotelCode,
    hotelName,
    checkInDate,
    checkOutDate,
    destinationCode,
    countryCode,
    currency,
    nationality,
    customerRefNumber,
    groupCode: resolvedGroupCode,
    rooms,
    transferSelection,
    excursions,
    insurance,
    airTickets,
    acknowledgePriceChange: Boolean(record.acknowledgePriceChange),
  };
};

export const validatePrebookState = (
  prebookState: StoredPrebookState | null,
  payload: AoryxBookingPayload
) => {
  if (!prebookState) {
    throw new Error("Missing prebook state. Please prebook again.");
  }

  if (prebookState.sessionId !== payload.sessionId) {
    throw new Error("Prebook session mismatch. Please prebook again.");
  }

  if (prebookState.hotelCode !== payload.hotelCode || prebookState.groupCode !== payload.groupCode) {
    throw new Error("Rate selection changed. Please prebook again.");
  }

  const requestedKeys = payload.rooms.map((room) => room.rateKey).sort();
  if (Array.isArray(prebookState.rateKeyHashes) && prebookState.rateKeyHashes.length > 0) {
    const requestedHashes = requestedKeys.map(hashRateKey).sort();
    const prebookHashes = [...prebookState.rateKeyHashes].sort();
    if (
      requestedHashes.length !== prebookHashes.length ||
      requestedHashes.some((hash, index) => hash !== prebookHashes[index])
    ) {
      throw new Error("Rate selection changed. Please prebook again.");
    }
  } else if (Array.isArray(prebookState.rateKeys) && prebookState.rateKeys.length > 0) {
    const prebookKeys = [...prebookState.rateKeys].sort();
    if (
      requestedKeys.length !== prebookKeys.length ||
      requestedKeys.some((key, index) => key !== prebookKeys[index])
    ) {
      throw new Error("Rate selection changed. Please prebook again.");
    }
  } else {
    throw new Error("Missing prebook details. Please prebook again.");
  }

  const prebookAgeMs = Date.now() - prebookState.recordedAt;
  if (prebookAgeMs > 10 * 60 * 1000) {
    throw new Error("Prebook window expired. Please prebook again.");
  }

  if (prebookState.isBookable === false) {
    throw new Error("Selected rates are not bookable.");
  }

  if (prebookState.isPriceChanged === true && payload.acknowledgePriceChange !== true) {
    throw new Error("Price changed. Please confirm to proceed.");
  }
};
