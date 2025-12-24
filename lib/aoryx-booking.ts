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
