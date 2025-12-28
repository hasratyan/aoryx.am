import HomeClient from "./home-client";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = getTranslations(resolveLocale(locale));
  return {
    title: t.hero.title,
    description: t.hero.subtitle,
  };
}

export default function HomePage() {
  return <HomeClient />;
}