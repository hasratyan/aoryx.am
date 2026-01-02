import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { extractFlagUpdates, getServiceFlags, saveServiceFlags } from "@/lib/service-flags";
import type { ServiceFlags } from "@/lib/package-builder-state";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const flags = await getServiceFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    console.error("[AdminServices] Failed to load service flags", error);
    return NextResponse.json({ error: "Failed to load service flags" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updates = extractFlagUpdates(body?.flags ?? null);
    const current = await getServiceFlags();
    const next = { ...current, ...updates } as ServiceFlags;
    const flags = await saveServiceFlags(next);
    return NextResponse.json({ flags });
  } catch (error) {
    console.error("[AdminServices] Failed to save service flags", error);
    return NextResponse.json({ error: "Failed to save service flags" }, { status: 500 });
  }
}
