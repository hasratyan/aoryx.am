"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Locale, defaultLocale, locales, getTranslations } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof getTranslations>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

type LanguageProviderProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  // Get locale from URL params, falling back to initialLocale or default
  const paramLocale = params?.locale as Locale | undefined;
  const locale: Locale = paramLocale && locales.includes(paramLocale) 
    ? paramLocale 
    : (initialLocale ?? defaultLocale);

  const setLocale = (newLocale: Locale) => {
    // Set cookie for proxy to use on next navigation
    document.cookie = `megatours-locale=${newLocale};path=/;max-age=31536000`;
    
    // Navigate to the new locale path
    const segments = pathname.split("/");
    // Check if first segment is a locale
    if (segments[1] && locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    
    const queryString = typeof window !== "undefined" ? window.location.search : "";
    const newPath = segments.join("/") || `/${newLocale}`;
    const destination = `${newPath}${queryString}`;
    
    router.push(destination);
  };

  // Update document lang attribute when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t: getTranslations(locale) }),
    [locale, pathname],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export function useTranslations() {
  return useLanguage().t;
}
