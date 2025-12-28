import type { Metadata } from "next";
import { defaultLocale, Locale, locales } from "@/lib/i18n";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const baseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
);

export const metadataBase = new URL(baseUrl);

const siteName = "MEGATOURS";

const ogImagesByLocale: Record<Locale, string> = {
  hy: "/images/ogimage.jpg",
  en: "/images/ogimage_en.jpg",
  ru: "/images/ogimage_ru.jpg",
};

const ogLocaleCodes: Record<Locale, string> = {
  hy: "hy_AM",
  en: "en_GB",
  ru: "ru_RU",
};

const resolveLocale = (value: string | undefined): Locale =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const normalizePath = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const toAbsoluteUrl = (value: string) => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return new URL(value, metadataBase).toString();
};

const buildLocalePath = (locale: Locale, path: string) => `/${locale}${path}`;

type LocalizedMetadataInput = {
  locale: string | undefined;
  title: string;
  description?: string | null;
  path?: string | null;
  imagePath?: string | null;
  openGraphType?: "website" | "article";
};

export function buildLocalizedMetadata({
  locale,
  title,
  description,
  path,
  imagePath,
  openGraphType = "website",
}: LocalizedMetadataInput): Metadata {
  const resolvedLocale = resolveLocale(locale);
  const normalizedPath = normalizePath(path);
  const localePath = buildLocalePath(resolvedLocale, normalizedPath);
  const canonicalUrl = toAbsoluteUrl(localePath);
  const metaDescription = description && description.trim().length > 0 ? description.trim() : undefined;
  const ogImage = (imagePath && imagePath.trim().length > 0 ? imagePath : ogImagesByLocale[resolvedLocale]) ?? "";
  const ogImageUrl = ogImage ? toAbsoluteUrl(ogImage) : undefined;
  const alternateLocales = locales
    .filter((entry) => entry !== resolvedLocale)
    .map((entry) => ogLocaleCodes[entry]);

  return {
    title,
    description: metaDescription,
    alternates: {
      canonical: localePath,
      languages: Object.fromEntries(
        locales.map((entry) => [entry, buildLocalePath(entry, normalizedPath)])
      ),
    },
    openGraph: {
      title,
      description: metaDescription,
      url: canonicalUrl,
      siteName,
      locale: ogLocaleCodes[resolvedLocale],
      alternateLocale: alternateLocales.length > 0 ? alternateLocales : undefined,
      type: openGraphType,
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}
