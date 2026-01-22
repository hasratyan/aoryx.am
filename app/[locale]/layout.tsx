import * as React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import PackageBuilder from "@/components/package-builder";
import { locales, Locale } from "@/lib/i18n";

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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

  return (
    <div className="page">
      <Header />
      {children}
      <Footer locale={locale} />
      <PackageBuilder />
    </div>
  );
}
