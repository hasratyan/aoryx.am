import { getB2bDb } from "@/lib/db";
import { getAoryxExcursionFee, getAoryxExcursionPlatformFee } from "@/lib/pricing";
import type { AoryxExcursionTicket, AoryxTransferRate } from "@/types/aoryx";

type TransferQueryInput = {
  destinationLocationCode?: string | null;
  destinationName?: string | null;
  transferType?: string | null;
  paxCount?: number | null;
  travelDate?: string | Date | null;
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTransferType = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed === "INDIVIDUAL" || trimmed === "GROUP" ? trimmed : null;
};

const normalizeId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const asString = (value as { toString: () => string }).toString();
    return asString && asString.trim().length > 0 ? asString : null;
  }
  return null;
};

const normalizeDateValue = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
};

export async function fetchTransferRates(input: TransferQueryInput): Promise<AoryxTransferRate[]> {
  const destinationLocationCode = input.destinationLocationCode?.trim() ?? "";
  const destinationName = input.destinationName?.trim() ?? "";
  const transferType = normalizeTransferType(input.transferType);
  const paxCount = typeof input.paxCount === "number" ? input.paxCount : Number(input.paxCount);
  const travelDate = parseDate(input.travelDate);

  if (!destinationLocationCode && !destinationName) {
    return [];
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

  if (transferType) {
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
  const db = await getB2bDb();
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

  return transfers.map((transfer) => {
    const validity = (transfer as { validity?: { from?: unknown; to?: unknown } }).validity;
    return {
      ...transfer,
      _id: normalizeId((transfer as { _id?: unknown })._id),
      validity: validity
        ? {
            ...validity,
            from: normalizeDateValue(validity.from),
            to: normalizeDateValue(validity.to),
          }
        : validity,
    };
  }) as AoryxTransferRate[];
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildTourDescription = (tour: Record<string, unknown>): string | null => {
  const category = normalizeText(tour.category);
  const subcategory = normalizeText(tour.subcategory);
  const meals = normalizeText(tour.meals);
  const transfers = normalizeText(tour.transfers);
  const approxDuration = normalizeText(tour.approxDuration);
  const minPax = toNumber(tour.minPax);
  const parts: string[] = [];
  if (category) parts.push(`Category: ${category}`);
  if (subcategory) parts.push(`Type: ${subcategory}`);
  if (meals) parts.push(`Meals: ${meals}`);
  if (transfers) parts.push(`Transfers: ${transfers}`);
  if (approxDuration) parts.push(`Duration: ${approxDuration}`);
  if (typeof minPax === "number" && Number.isFinite(minPax)) {
    parts.push(`Min pax: ${minPax}`);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
};

const buildTourProductType = (category: string | null, subcategory: string | null) => {
  if (category && subcategory) return `${category} - ${subcategory}`;
  return category ?? subcategory ?? null;
};

export async function fetchExcursions(limit = 200): Promise<{
  excursions: AoryxExcursionTicket[];
  excursionFee: number;
}> {
  const maxDocs = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 200;
  const db = await getB2bDb();
  const query = { isActive: { $ne: false } };

  const [excursions, tourExcursions, excursionFee, platformFee] = await Promise.all([
    db
      .collection("aoryxExcursionTickets")
      .find(query)
      .sort({ name: 1, "pricing.adult": 1 })
      .limit(maxDocs)
      .toArray(),
    db
      .collection("aoryxTourExcursions")
      .find(query)
      .sort({ name: 1, "pricing.adult": 1 })
      .limit(maxDocs)
      .toArray(),
    getAoryxExcursionFee(),
    getAoryxExcursionPlatformFee(),
  ]);

  const totalFee = excursionFee + platformFee;
  const applyFee = (value: unknown) => {
    const num = toNumber(value);
    return num !== null ? num + totalFee : null;
  };

  const sanitizedExcursions: AoryxExcursionTicket[] = excursions.map((ex) => {
    const pricing = (ex as { pricing?: Record<string, unknown> }).pricing ?? {};
    const adult = applyFee(pricing.adult);
    const child = applyFee(pricing.child ?? pricing.adult);
    const validity = (ex as { validity?: { from?: unknown; to?: unknown } }).validity;
    return {
      ...ex,
      _id: normalizeId((ex as { _id?: unknown })._id),
      validity: validity
        ? {
            ...validity,
            from: normalizeDateValue(validity.from),
            to: normalizeDateValue(validity.to),
          }
        : validity,
      pricing: {
        ...pricing,
        adult,
        child,
        feeApplied: true,
      },
    } as AoryxExcursionTicket;
  });

  const sanitizedTours: AoryxExcursionTicket[] = tourExcursions.map((tour) => {
    const record = tour as Record<string, unknown>;
    const pricing = (record.pricing as Record<string, unknown> | undefined) ?? {};
    const adult = applyFee(pricing.adult);
    const child = applyFee(pricing.child ?? pricing.adult);
    const category = normalizeText(record.category);
    const subcategory = normalizeText(record.subcategory);
    const validity = (record.validity as { from?: unknown; to?: unknown } | undefined) ?? null;
    const currency = normalizeText((pricing as { currency?: unknown }).currency);
    return {
      ...record,
      _id: normalizeId(record._id),
      activityCode: normalizeText(record.tourCode),
      name: normalizeText(record.name),
      description: buildTourDescription(record),
      productType: buildTourProductType(category, subcategory),
      childPolicy: normalizeText(record.childPolicy),
      validity: validity
        ? {
            ...validity,
            from: normalizeDateValue(validity.from),
            to: normalizeDateValue(validity.to),
          }
        : validity,
      pricing: {
        ...pricing,
        currency,
        adult,
        child,
        feeApplied: true,
      },
    } as AoryxExcursionTicket;
  });

  const mergedExcursions: AoryxExcursionTicket[] = [...sanitizedExcursions, ...sanitizedTours];
  mergedExcursions.sort((left, right) => {
    const leftName = normalizeText(left.name)?.toLowerCase() ?? "";
    const rightName = normalizeText(right.name)?.toLowerCase() ?? "";
    if (leftName && rightName) {
      const nameOrder = leftName.localeCompare(rightName);
      if (nameOrder !== 0) return nameOrder;
    } else if (leftName || rightName) {
      return leftName ? -1 : 1;
    }
    const leftPrice = toNumber((left.pricing as { adult?: unknown })?.adult);
    const rightPrice = toNumber((right.pricing as { adult?: unknown })?.adult);
    if (leftPrice === null && rightPrice === null) return 0;
    if (leftPrice === null) return 1;
    if (rightPrice === null) return -1;
    return leftPrice - rightPrice;
  });

  const limitedExcursions = mergedExcursions.slice(0, maxDocs);

  return { excursions: limitedExcursions as AoryxExcursionTicket[], excursionFee: totalFee };
}
