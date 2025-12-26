import * as React from "react";
import { locales, Locale, getTranslations } from "@/lib/i18n";

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);

  return {
    title: t.hero.title,
    description: t.hero.subtitle,
  };
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  // Validate locale param - this ensures the route is valid
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    // Invalid locale - this will be handled by Next.js 404
    return null;
  }

  return <>{children}</>;
}
