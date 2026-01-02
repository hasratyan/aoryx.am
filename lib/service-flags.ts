import { getDb } from "@/lib/db";
import type { PackageBuilderService, ServiceFlags } from "@/lib/package-builder-state";
import { DEFAULT_SERVICE_FLAGS } from "@/lib/package-builder-state";

const COLLECTION = "service_flags";
const DOC_ID = "service_flags";

const serviceKeys = Object.keys(DEFAULT_SERVICE_FLAGS) as PackageBuilderService[];

const normalizeFlags = (value: unknown, base: ServiceFlags = DEFAULT_SERVICE_FLAGS): ServiceFlags => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const next: ServiceFlags = { ...base };
  serviceKeys.forEach((key) => {
    if (typeof record[key] === "boolean") {
      next[key] = record[key] as boolean;
    }
  });
  return next;
};

export const extractFlagUpdates = (value: unknown): Partial<ServiceFlags> => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const updates: Partial<ServiceFlags> = {};
  serviceKeys.forEach((key) => {
    if (typeof record[key] === "boolean") {
      updates[key] = record[key] as boolean;
    }
  });
  return updates;
};

export async function getServiceFlags(): Promise<ServiceFlags> {
  const db = await getDb();
  const doc = await db
    .collection<{ _id: string; flags?: ServiceFlags }>(COLLECTION)
    .findOne({ _id: DOC_ID });
  const flags = doc && typeof doc === "object" ? (doc as Record<string, unknown>).flags : null;
  return normalizeFlags(flags ?? null);
}

export async function saveServiceFlags(flags: ServiceFlags): Promise<ServiceFlags> {
  const db = await getDb();
  const normalized = normalizeFlags(flags);
  const now = new Date();
  await db.collection<{ _id: string; flags?: ServiceFlags }>(COLLECTION).updateOne(
    { _id: DOC_ID },
    {
      $set: {
        flags: normalized,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return normalized;
}
