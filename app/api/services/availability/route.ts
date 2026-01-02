import { NextResponse } from "next/server";
import { DEFAULT_SERVICE_FLAGS } from "@/lib/package-builder-state";
import { getServiceFlags } from "@/lib/service-flags";

export const runtime = "nodejs";

export async function GET() {
  try {
    const flags = await getServiceFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    console.error("[Services] Failed to load service flags", error);
    return NextResponse.json({ flags: DEFAULT_SERVICE_FLAGS });
  }
}
