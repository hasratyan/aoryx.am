import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateId: string }> }
) {
  void request;
  const { stateId: rawStateId } = await params;
  const stateId = rawStateId?.trim();
  if (!stateId) {
    return NextResponse.json(
      { error: "Missing RA state id." },
      { status: 400 }
    );
  }

  const safeId = encodeURIComponent(stateId);
  const url = `https://api.efes.am/api/v1/ra-states/${safeId}/city-villages`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error("[EFES] City/villages request failed", response.status, payload);
      return NextResponse.json(
        { error: "Failed to load RA city/villages." },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[EFES] Failed to load RA city/villages", error);
    return NextResponse.json(
      { error: "Failed to load RA city/villages." },
      { status: 500 }
    );
  }
}
