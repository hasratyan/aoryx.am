import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "aoryx_session";
const PREBOOK_COOKIE_NAME = "aoryx_prebook";
const SESSION_MAX_AGE = 60 * 60; // 1 hour
const PREBOOK_MAX_AGE = 60 * 10; // 10 minutes

const cookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const setSessionCookie = (response: NextResponse, sessionId: string) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    maxAge: SESSION_MAX_AGE,
    ...cookieOptions,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    ...cookieOptions,
  });
};

export const getSessionFromCookie = (request: NextRequest): string | undefined => {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return value && value.length > 0 ? value : undefined;
};

export interface StoredPrebookState {
  sessionId: string;
  hotelCode: string;
  groupCode: number;
  rateKeys?: string[];
  rateKeyHashes?: string[];
  isBookable: boolean | null;
  isPriceChanged: boolean | null;
  recordedAt: number;
}

const encodePrebookState = (state: StoredPrebookState): string => {
  const json = JSON.stringify(state);
  return Buffer.from(json).toString("base64url");
};

const decodePrebookState = (value: string): StoredPrebookState | null => {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as StoredPrebookState;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.sessionId === "string" &&
      typeof parsed.hotelCode === "string" &&
      typeof parsed.groupCode === "number" &&
      (Array.isArray(parsed.rateKeys) || Array.isArray(parsed.rateKeyHashes))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const setPrebookCookie = (response: NextResponse, state: StoredPrebookState) => {
  response.cookies.set({
    name: PREBOOK_COOKIE_NAME,
    value: encodePrebookState(state),
    maxAge: PREBOOK_MAX_AGE,
    ...cookieOptions,
  });
};

export const clearPrebookCookie = (response: NextResponse) => {
  response.cookies.set({
    name: PREBOOK_COOKIE_NAME,
    value: "",
    maxAge: 0,
    ...cookieOptions,
  });
};

export const getPrebookState = (request: NextRequest): StoredPrebookState | null => {
  const value = request.cookies.get(PREBOOK_COOKIE_NAME)?.value;
  if (!value) return null;
  return decodePrebookState(value);
};
