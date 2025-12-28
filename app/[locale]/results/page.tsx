import { Suspense } from "react";
import ResultsClient from "./results-client";
import { parseSearchParams } from "@/lib/search-query";
import { search, AoryxClientError, AoryxServiceError } from "@/lib/aoryx-client";
import { AORYX_TASSPRO_CUSTOMER_CODE, AORYX_TASSPRO_REGION_ID } from "@/lib/env";
import { getEffectiveAmdRates } from "@/lib/pricing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordUserSearch } from "@/lib/user-data";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import type { AoryxSearchResult } from "@/types/aoryx";

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

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

type SafeSearchResult = Omit<AoryxSearchResult, "sessionId">;

type PageProps = {
  params: { locale: string };
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = getTranslations(resolveLocale(params.locale));
  return {
    title: t.results.fallbackTitle,
  };
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const parsed = parseSearchParams(buildSearchParams(resolvedSearchParams));
  let initialResult: SafeSearchResult | null = null;
  let initialError: string | null = null;
  let initialAmdRates: { USD: number; EUR: number } | null = null;

  if (parsed.payload) {
    const ratesPromise = getEffectiveAmdRates().catch((error) => {
      console.error("[ExchangeRates] Failed to load rates", error);
      return null;
    });
    try {
      const params = {
        ...parsed.payload,
        customerCode: AORYX_TASSPRO_CUSTOMER_CODE,
        regionId: AORYX_TASSPRO_REGION_ID,
      };
      console.info("[Aoryx][search] Request params", {
        destinationCode: params.destinationCode ?? null,
        hotelCode: params.hotelCode ?? null,
        countryCode: params.countryCode,
        nationality: params.nationality,
        currency: params.currency,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        rooms: params.rooms?.length ?? 0,
      });
      const result = await search(params);
      console.info("[Aoryx][search] Response summary", {
        propertyCount: result.propertyCount ?? null,
        hotels: result.hotels?.length ?? 0,
        currency: result.currency ?? null,
        responseTime: result.responseTime ?? null,
        destination: result.destination ?? null,
      });
      const { sessionId: _sessionId, ...safeResult } = result;
      initialResult = safeResult;

      try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (userId) {
          await recordUserSearch({
            userId,
            params,
            resultSummary: {
              propertyCount: result.propertyCount ?? null,
              destinationCode: result.destination?.code ?? null,
              destinationName: result.destination?.name ?? null,
            },
            source: "aoryx",
          });
        }
      } catch (error) {
        console.error("[Aoryx][search] Failed to record user search", error);
      }
    } catch (error) {
      console.error("[Aoryx][search] Failed", error);
      if (error instanceof AoryxServiceError || error instanceof AoryxClientError) {
        initialError = error.message;
      } else {
        initialError = "Failed to perform search.";
      }
    }
    initialAmdRates = await ratesPromise;
  }

  return (
    <Suspense fallback={null}>
      <ResultsClient
        initialResult={initialResult}
        initialError={initialError}
        initialDestinations={[]}
        initialAmdRates={initialAmdRates}
      />
    </Suspense>
  );
}
