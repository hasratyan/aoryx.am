import { NextRequest, NextResponse } from "next/server";
import { AoryxClientError } from "@/lib/aoryx-client";
import {
  AORYX_API_KEY,
  AORYX_BASE_URL,
  AORYX_CUSTOMER_CODE,
  AORYX_TIMEOUT_MS,
} from "@/lib/env";

export const runtime = "nodejs";

interface CountryInfoItem {
  key?: string;
  value?: string;
}

interface CountryInfoResponse {
  isSuccess?: boolean;
  statusCode?: number;
  exceptionMessage?: string | null;
  errors?: unknown;
  data?: CountryInfoItem[] | null;
}

// Helper to convert value to string
function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();
  return null;
}

// Helper to normalize destination IDs - matches megatours implementation
function normalizeParentDestinationId(rawId: string | null | undefined): string | null {
  const value = toStringValue(rawId);
  if (!value) return null;

  const parts = value.split("-").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return value;
  }

  // Find the last non-zero part
  const nonZero = [...parts].reverse().find((part) => part !== "0");
  return nonZero ?? parts[parts.length - 1];
}

// Check if destination ID has trailing zero format (e.g., "160-0")
function hasTrailingZeroDestinationId(rawId: string | null | undefined): boolean {
  const value = toStringValue(rawId);
  if (!value) return false;

  const parts = value.split("-").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) return false;

  return parts[parts.length - 1] === "0";
}

// Destination IDs to exclude from the list
const EXCLUDED_DESTINATION_IDS = new Set(["650", "650-0"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const countryCode =
      typeof body.countryCode === "string" && body.countryCode.trim().length === 2
        ? body.countryCode.trim().toUpperCase()
        : "AE";
    const includeAll = Boolean(body.includeAll);

    if (!AORYX_API_KEY) {
      throw new AoryxClientError("Missing AORYX_API_KEY configuration");
    }

    const baseUrl = AORYX_BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${baseUrl}/country-info`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AORYX_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ApiKey: AORYX_API_KEY,
        ...(AORYX_CUSTOMER_CODE ? { CustomerCode: AORYX_CUSTOMER_CODE } : {}),
      },
      body: JSON.stringify({ CountryCode: countryCode }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AoryxClientError(
        `Aoryx API error: ${response.status} ${response.statusText}`,
        "country-info",
        response.status
      );
    }

    const data: CountryInfoResponse = await response.json();

    if (!data.isSuccess) {
      throw new AoryxClientError(
        data.exceptionMessage ?? "CountryInfo request failed",
        "country-info"
      );
    }

    const items = data.data ?? [];

    const rawDestinations = items
      .map((item) => {
        const rawId = item.key;
        if (!rawId) return null;
        const normalizedId = normalizeParentDestinationId(rawId);
        if (!normalizedId) return null;
        return {
          id: normalizedId,
          name: item.value ?? normalizedId,
          rawId,
        };
      })
      .filter((dest): dest is { id: string; name: string; rawId: string } => Boolean(dest));

    // Dedupe by normalized parent ID, preferring trailing-zero entries (like "160-0" over "160")
    const destinationsByParent = new Map<
      string,
      { id: string; name: string; rawId: string; priority: number }
    >();

    items.forEach((item) => {
      const rawId = item.key;
      if (!rawId) return;

      const normalizedId = normalizeParentDestinationId(rawId);
      if (!normalizedId) return;

      const name = item.value ?? normalizedId;
      const priority = hasTrailingZeroDestinationId(rawId) ? 2 : 1;
      const existing = destinationsByParent.get(normalizedId);

      if (!existing || priority > existing.priority) {
        destinationsByParent.set(normalizedId, {
          id: normalizedId,
          name,
          rawId,
          priority,
        });
      }
    });

    // Convert to array format for frontend, filtering out excluded destinations
    const destinations = Array.from(destinationsByParent.values())
      .filter((dest) => !EXCLUDED_DESTINATION_IDS.has(dest.id) && !EXCLUDED_DESTINATION_IDS.has(dest.rawId))
      .map((dest) => ({
        id: dest.id,
        name: dest.name,
        rawId: dest.rawId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      countryCode,
      destinations,
      ...(includeAll ? { rawDestinations } : {}),
    });
  } catch (error) {
    console.error("Country info error:", error);

    if (error instanceof AoryxClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch country information" },
      { status: 500 }
    );
  }
}
