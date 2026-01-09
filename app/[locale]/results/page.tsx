import { Suspense } from "react";
import ResultsData from "./results-data";
import Loader from "@/components/loader";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

type PageProps = {
  params: { locale: string };
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const resolvedLocale = resolveLocale(params.locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.results.fallbackTitle,
    description: t.hero.subtitle,
    path: "/results",
  });
}

export default async function ResultsPage({ params, searchParams }: PageProps) {
  const resolvedLocale = resolveLocale(params.locale);
  const t = getTranslations(resolvedLocale);

  return (
    <Suspense
      fallback={
        <main className="results">
          <Loader text={t.results.loading} />
        </main>
      }
    >
      <ResultsData locale={resolvedLocale} searchParams={searchParams} />
    </Suspense>
  );
}
