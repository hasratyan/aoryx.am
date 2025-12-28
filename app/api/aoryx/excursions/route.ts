import { NextRequest, NextResponse } from "next/server";
import { fetchExcursions } from "@/lib/aoryx-addons";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body.limit);
    const maxDocs = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 200;

    const { excursions, excursionFee } = await fetchExcursions(maxDocs);

    return NextResponse.json({
      excursions,
      destinationName: null,
      excursionFee,
    });
  } catch (error) {
    console.error("[Excursions] Failed to fetch excursion options", error);
    return NextResponse.json(
      { error: "Failed to fetch excursion options" },
      { status: 500 }
    );
  }
}
