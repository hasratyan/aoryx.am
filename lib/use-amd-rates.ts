"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api-helpers";
import { convertToAmd, type AmdRates } from "@/lib/currency";

const isValidRates = (value: AmdRates | null | undefined): value is AmdRates =>
  Boolean(value && Number.isFinite(value.USD) && Number.isFinite(value.EUR));

export { convertToAmd };

type UseAmdRatesOptions = {
  endpoint?: string;
};

export function useAmdRates(initialRates?: AmdRates | null, options?: UseAmdRatesOptions) {
  const hasInitialRates = isValidRates(initialRates);
  const [rates, setRates] = useState<AmdRates | null>(hasInitialRates ? initialRates : null);
  const [loading, setLoading] = useState(!hasInitialRates);
  const endpoint = options?.endpoint ?? "/api/utils/exchange-rates";

  useEffect(() => {
    let active = true;

    if (hasInitialRates) {
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => setLoading(true));
    getJson<AmdRates>(endpoint)
      .then((data) => {
        if (!active) return;
        if (data && Number.isFinite(data.USD) && Number.isFinite(data.EUR)) {
          setRates({ USD: data.USD, EUR: data.EUR });
        } else {
          setRates(null);
        }
      })
      .catch((error) => {
        console.error("[ExchangeRates] Failed to load rates", error);
        if (active) setRates(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [endpoint, hasInitialRates]);

  return { rates, loading };
}

export type { AmdRates };
