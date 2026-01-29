import Home from "./home";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import { getFeaturedHotelCards, type FeaturedHotelCard } from "@/lib/featured-hotels";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: `MEGATOURS | ${t.hero.title}`,
    description: t.hero.subtitle,
  });
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  let featuredHotels: FeaturedHotelCard[] = [];

  try {
    featuredHotels = await getFeaturedHotelCards(resolvedLocale);
  } catch (error) {
    console.error("[Home] Failed to load featured hotels", error);
  }

  return <Home locale={resolvedLocale} featuredHotels={featuredHotels} />;
}
