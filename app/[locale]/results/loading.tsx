"use client";

import { useSyncExternalStore } from "react";
import Loader from "@/components/loader";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

// Get loading text based on URL locale
function getLoadingText(): string {
  if (typeof window === "undefined") return "";
  const pathLocale = window.location.pathname.split("/")[1] as Locale | undefined;
  const locale = pathLocale && locales.includes(pathLocale) ? pathLocale : defaultLocale;
  return getTranslations(locale).results.loading;
}

// For SSR, return empty string
function getServerSnapshot(): string {
  return "";
}

// Subscribe is no-op since URL doesn't change during loading
function subscribe(): () => void {
  return () => {};
}

export default function ResultsLoading() {
  const loadingText = useSyncExternalStore(subscribe, getLoadingText, getServerSnapshot);

  return (
    <main className="results">
      <Loader text={loadingText} />
    </main>
  );
}
