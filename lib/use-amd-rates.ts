"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api-helpers";

type AmdRates = {
  USD: number;
  EUR: number;
};

const normalizeCurrency = (currency: string | null | undefined) =>
  (currency ?? "USD").trim().toUpperCase();

const isValidRates = (value: AmdRates | null | undefined): value is AmdRates =>
  Boolean(value && Number.isFinite(value.USD) && Number.isFinite(value.EUR));

export const convertToAmd = (
  amount: number,
  currency: string | null | undefined,
  rates: AmdRates
): number | null => {
  if (!Number.isFinite(amount)) return null;
  const normalized = normalizeCurrency(currency);
  if (normalized === "AMD") return amount;
  if (normalized === "USD") return amount * rates.USD;
  if (normalized === "EUR") return amount * rates.EUR;
  return null;
};

export function useAmdRates(initialRates?: AmdRates | null) {
  const hasInitialRates = isValidRates(initialRates);
  const [rates, setRates] = useState<AmdRates | null>(hasInitialRates ? initialRates : null);
  const [loading, setLoading] = useState(!hasInitialRates);

  useEffect(() => {
    let active = true;

    if (hasInitialRates) {
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getJson<AmdRates>("/api/utils/exchange-rates")
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
  }, [hasInitialRates]);

  return { rates, loading };
}

export type { AmdRates };
