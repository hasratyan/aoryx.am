"use client";

import { localeLabels, locales } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

type LanguageSwitcherProps = {
  onAction?: () => void;
};

export default function LanguageSwitcher({ onAction }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="language-switcher">
      {locales.map((code) => (
        <button
          key={code}
          onClick={() => {
            setLocale(code);
            onAction?.();
          }}
          className={code === locale ? "active" : ""}
          aria-pressed={locale === code}
        >
          {localeLabels[code]}
        </button>
      ))}
    </div>
  );
}
