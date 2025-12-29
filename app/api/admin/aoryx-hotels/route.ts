import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { searchAoryxHotels } from "@/lib/featured-hotels";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminUser({ id: session?.user?.id ?? null, email: session?.user?.email ?? null });
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 40;

    const hotels = await searchAoryxHotels(query, limit);
    return NextResponse.json({ hotels });
  } catch (error) {
    console.error("[AdminHotels] Failed to load hotels", error);
    return NextResponse.json({ error: "Failed to load hotels" }, { status: 500 });
  }
}
