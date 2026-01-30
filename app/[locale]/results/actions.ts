"use server";

import type { AoryxSearchParams } from "@/types/aoryx";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserSearch } from "@/lib/user-data";
import {
  normalizeSearchError,
  runAoryxSearch,
  type SafeSearchResult,
  withAoryxDefaults,
} from "@/lib/aoryx-search";

export type SearchActionResult =
  | { ok: true; data: SafeSearchResult }
  | { ok: false; error: string; code?: string };

export async function runResultsSearch(payload: AoryxSearchParams): Promise<SearchActionResult> {
  try {
    const data = await runAoryxSearch(payload);

    try {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      if (userId) {
        const params = withAoryxDefaults(payload);
        await recordUserSearch({
          userId,
          params,
          resultSummary: {
            propertyCount: data.propertyCount ?? null,
            destinationCode: data.destination?.code ?? null,
            destinationName: data.destination?.name ?? null,
          },
          source: "aoryx",
        });
      }
    } catch (error) {
      console.error("[Aoryx][search] Failed to record user search", error);
    }

    return { ok: true, data };
  } catch (error) {
    const normalized = normalizeSearchError(error);
    return { ok: false, error: normalized.message, code: normalized.code };
  }
}
