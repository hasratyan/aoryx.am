import ResultsClient from "./results-client";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { parseSearchParams } from "@/lib/search-query";
import { authOptions } from "@/lib/auth";
import { getTranslations, type Locale } from "@/lib/i18n";
import { recordUserSearch } from "@/lib/user-data";
import {
  normalizeSearchError,
  runAoryxSearch,
  type SafeSearchResult,
  withAoryxDefaults,
} from "@/lib/aoryx-search";

const buildSearchParams = (input: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string") params.append(key, entry);
      });
      return;
    }
    if (typeof value === "string") params.set(key, value);
  });
  return params;
};

type ResultsDataProps = {
  locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const shouldServerRenderSearch = async () => {
  const cookieStore = await cookies();
  if (cookieStore.get("megatours-results-csr")?.value === "1") {
    return false;
  }
  const headerStore = await headers();
  const accept = headerStore.get("accept") ?? "";
  const fetchMode = headerStore.get("sec-fetch-mode") ?? "";
  const fetchDest = headerStore.get("sec-fetch-dest") ?? "";
  const isRsc =
    headerStore.get("RSC") === "1" ||
    headerStore.has("next-router-state-tree") ||
    accept.includes("text/x-component");
  const isDocumentRequest =
    fetchDest === "document" ||
    fetchMode === "navigate" ||
    accept.includes("text/html");
  return isDocumentRequest && !isRsc;
};

export default async function ResultsData({ locale, searchParams }: ResultsDataProps) {
  const resolvedSearchParams = await searchParams;
  const t = getTranslations(locale);
  const parsed = parseSearchParams(buildSearchParams(resolvedSearchParams), {
    missingDates: t.search.errors.missingDates,
    missingLocation: t.search.errors.missingLocation,
    invalidRooms: t.search.errors.invalidRooms,
  });
  let initialResult: SafeSearchResult | null = null;
  let initialError: string | null = null;

  if (parsed.payload && (await shouldServerRenderSearch())) {
    try {
      initialResult = await runAoryxSearch(parsed.payload);

      try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (userId) {
          const params = withAoryxDefaults(parsed.payload);
          await recordUserSearch({
            userId,
            params,
            resultSummary: {
              propertyCount: initialResult.propertyCount ?? null,
              destinationCode: initialResult.destination?.code ?? null,
              destinationName: initialResult.destination?.name ?? null,
            },
            source: "aoryx",
          });
        }
      } catch (error) {
        console.error("[Aoryx][search] Failed to record user search", error);
      }
    } catch (error) {
      const normalized = normalizeSearchError(error);
      initialError =
        normalized.code === "MISSING_SESSION_ID"
          ? t.search.errors.missingSession
          : normalized.message || t.search.errors.submit;
    }
  }

  return (
    <ResultsClient
      initialResult={initialResult}
      initialError={initialError}
      initialDestinations={[]}
      initialAmdRates={null}
    />
  );
}
