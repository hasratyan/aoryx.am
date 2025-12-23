import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import type { AoryxBookingResult, AoryxRoomOption } from "@/types/aoryx";

const RATE_TOKEN_PREFIX = "mt_rk_";
const TOKEN_VERSION = 1;

type RateTokenPayload = {
  v: number;
  rateKey: string;
  groupCode: number;
  sessionId?: string | null;
  hotelCode?: string | null;
  roomIdentifier?: number | null;
  issuedAt: number;
};

export type RateTokenContext = {
  sessionId: string;
  hotelCode: string;
  groupCode?: number | null;
};

const resolveSecret = (): string => {
  const candidates = [
    process.env.AORYX_RATE_TOKEN_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.AORYX_API_KEY,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  throw new Error("Missing rate token secret configuration.");
};

let cachedKey: Buffer | null = null;
const getKey = (): Buffer => {
  if (!cachedKey) {
    const secret = resolveSecret();
    cachedKey = createHash("sha256").update(secret).digest();
  }
  return cachedKey;
};

export const isRateToken = (value: string): boolean => value.startsWith(RATE_TOKEN_PREFIX);

export const createRateToken = (
  payload: Omit<RateTokenPayload, "v" | "issuedAt">
): string => {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body: RateTokenPayload = { ...payload, v: TOKEN_VERSION, issuedAt: Date.now() };
  const plaintext = Buffer.from(JSON.stringify(body), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const token = Buffer.concat([iv, tag, ciphertext]).toString("base64url");
  return `${RATE_TOKEN_PREFIX}${token}`;
};

export const decodeRateToken = (token: string): RateTokenPayload => {
  if (!isRateToken(token)) {
    throw new Error("Not a rate token.");
  }
  const raw = token.slice(RATE_TOKEN_PREFIX.length);
  const packed = Buffer.from(raw, "base64url");
  if (packed.length < 12 + 16 + 1) {
    throw new Error("Invalid rate token.");
  }
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as Partial<RateTokenPayload>;
  if (
    parsed.v !== TOKEN_VERSION ||
    typeof parsed.rateKey !== "string" ||
    parsed.rateKey.trim().length === 0 ||
    typeof parsed.groupCode !== "number" ||
    !Number.isFinite(parsed.groupCode)
  ) {
    throw new Error("Invalid rate token.");
  }
  return parsed as RateTokenPayload;
};

export const hashRoomOptionId = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digest = createHash("sha256").update(trimmed).digest("hex").slice(0, 16);
  return `rid_${digest}`;
};

export const hashRateKey = (rateKey: string): string => {
  const key = getKey();
  return createHmac("sha256", key).update(rateKey).digest("hex");
};

export const obfuscateRoomOptions = (
  rooms: AoryxRoomOption[],
  context: RateTokenContext
): AoryxRoomOption[] =>
  rooms.map((room, index) => {
    const idSource =
      typeof room.id === "string" && room.id.trim().length > 0
        ? room.id
        : `room-${index + 1}`;
    const obfuscatedId = hashRoomOptionId(idSource);
    const rateKey =
      typeof room.rateKey === "string" && room.rateKey.trim().length > 0
        ? room.rateKey.trim()
        : null;
    const fallbackGroup =
      typeof context.groupCode === "number" && Number.isFinite(context.groupCode)
        ? context.groupCode
        : null;
    const groupCode =
      typeof room.groupCode === "number" && Number.isFinite(room.groupCode)
        ? room.groupCode
        : fallbackGroup;
    const token =
      rateKey && groupCode !== null
        ? createRateToken({
            rateKey,
            groupCode,
            sessionId: context.sessionId,
            hotelCode: context.hotelCode,
            roomIdentifier:
              typeof room.roomIdentifier === "number" ? room.roomIdentifier : null,
          })
        : null;
    return {
      ...room,
      id: obfuscatedId ?? room.id,
      rateKey: token,
      groupCode: null,
    };
  });

export const obfuscateBookingResult = (result: AoryxBookingResult): AoryxBookingResult => ({
  ...result,
  sessionId: "",
  rooms: result.rooms.map((room) => ({
    ...room,
    rateKey: null,
  })),
});
