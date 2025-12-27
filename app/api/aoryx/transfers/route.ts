import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const destinationLocationCode =
      typeof body.destinationLocationCode === "string" ? body.destinationLocationCode.trim() : "";
    const destinationName =
      typeof body.destinationName === "string" ? body.destinationName.trim() : "";
    const transferType =
      typeof body.transferType === "string" && body.transferType.trim().length > 0
        ? body.transferType.trim().toUpperCase()
        : undefined;
    const paxCount = Number(body.paxCount);
    const travelDate = parseDate(body.travelDate);

    if (!destinationLocationCode && !destinationName) {
      return NextResponse.json(
        { error: "destinationLocationCode or destinationName is required" },
        { status: 400 }
      );
    }

    const clauses: Record<string, unknown>[] = [{ isActive: { $ne: false } }];
    const destFilters: Record<string, unknown>[] = [];

    if (destinationLocationCode) {
      destFilters.push({ "destination.locationCode": destinationLocationCode });
    }
    if (destinationName) {
      const safeName = escapeRegex(destinationName);
      const regex = new RegExp(safeName, "i");
      destFilters.push({
        $or: [
          { "destination.name": regex },
          { "destination.locationCode": regex },
          { "destination.cityCode": regex },
          { "destination.zoneCode": regex },
        ],
      });
    }

    if (destFilters.length > 0) {
      clauses.push(destFilters.length === 1 ? destFilters[0] : { $or: destFilters });
    }

    if (transferType === "INDIVIDUAL" || transferType === "GROUP") {
      clauses.push({ transferType });
    }

    if (Number.isFinite(paxCount) && paxCount > 0) {
      clauses.push({
        "paxRange.minPax": { $lte: paxCount },
        "paxRange.maxPax": { $gte: paxCount },
      });
    }

    if (travelDate) {
      clauses.push({
        $or: [
          { "validity.from": { $exists: false } },
          { "validity.from": { $lte: travelDate } },
          { validity: null },
        ],
      });
      clauses.push({
        $or: [
          { "validity.to": { $exists: false } },
          { "validity.to": { $gte: travelDate } },
          { validity: null },
        ],
      });
    }

    const query = clauses.length > 1 ? { $and: clauses } : clauses[0];
    const db = await getDb();
    let transfers = await db
      .collection("aoryxTransferRates")
      .find(query)
      .sort({ transferType: 1, "pricing.oneWay": 1, "vehicle.maxPax": 1 })
      .toArray();

    if (transfers.length === 0) {
      const fallbackDestFilters: Record<string, unknown>[] = [];
      if (destinationLocationCode) {
        fallbackDestFilters.push({ "destination.locationCode": destinationLocationCode });
      }
      if (destinationName) {
        const safeName = escapeRegex(destinationName);
        const regex = new RegExp(safeName, "i");
        fallbackDestFilters.push({
          $or: [
            { "destination.name": regex },
            { "destination.locationCode": regex },
            { "destination.cityCode": regex },
            { "destination.zoneCode": regex },
          ],
        });
      }

      const destinationClause =
        fallbackDestFilters.length === 0
          ? {}
          : fallbackDestFilters.length === 1
            ? fallbackDestFilters[0]
            : { $or: fallbackDestFilters };

      transfers = await db
        .collection("aoryxTransferRates")
        .find({ ...destinationClause, isActive: { $ne: false } })
        .sort({ transferType: 1, "pricing.oneWay": 1, "vehicle.maxPax": 1 })
        .toArray();
    }

    return NextResponse.json({
      transfers,
      destinationLocationCode,
      destinationName: destinationName || null,
    });
  } catch (error) {
    console.error("[Transfers] Failed to fetch transfer options", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer options" },
      { status: 500 }
    );
  }
}
