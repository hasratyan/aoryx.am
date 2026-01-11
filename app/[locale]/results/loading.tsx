"use client";

import { useState, useEffect } from "react";
import Loader from "@/components/loader";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

export default function ResultsLoading() {
  const [loadingText, setLoadingText] = useState<string>("");

  useEffect(() => {
    // Read locale from actual browser URL (client-side only)
    const pathLocale = window.location.pathname.split("/")[1] as Locale | undefined;
    const locale = pathLocale && locales.includes(pathLocale) ? pathLocale : defaultLocale;
    const t = getTranslations(locale);
    setLoadingText(t.results.loading);
  }, []);

  return (
    <main className="results">
      <Loader text={loadingText} />
    </main>
  );
}
