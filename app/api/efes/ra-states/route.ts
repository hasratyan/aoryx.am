import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EFES_RA_STATES_URL = "https://api.efes.am/api/v1/ra-states";

export async function GET() {
  try {
    const response = await fetch(EFES_RA_STATES_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error("[EFES] RA states request failed", response.status, payload);
      return NextResponse.json(
        { error: "Failed to load RA states." },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[EFES] Failed to load RA states", error);
    return NextResponse.json(
      { error: "Failed to load RA states." },
      { status: 500 }
    );
  }
}
