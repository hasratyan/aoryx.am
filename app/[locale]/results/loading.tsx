import { cookies } from "next/headers";
import Loader from "@/components/loader";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

const resolveLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("megatours-locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  return defaultLocale;
};

export default async function ResultsLoading() {
  const locale = await resolveLocale();
  const t = getTranslations(locale);

  return (
    <main className="results">
      <Loader text={t.results.loading} />
    </main>
  );
}
