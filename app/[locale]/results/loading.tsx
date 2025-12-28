"use client";

import Loader from "@/components/loader";
import { useTranslations } from "@/components/language-provider";

export default function ResultsLoading() {
  const t = useTranslations();

  return (
    <main className="results">
      <Loader text={t.results.loading} />
    </main>
  );
}
