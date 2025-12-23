import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { hotels } from "@/lib/hotels";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const baseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
);

type RouteDefinition = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const routeDefinitions: RouteDefinition[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/results", priority: 0.7, changeFrequency: "weekly" },
  { path: "/refund-policy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.4, changeFrequency: "monthly" },
];

const hotelRoutes: RouteDefinition[] = hotels.map((hotel) => ({
  path: `/hotels/${hotel.id}`,
  priority: 0.8,
  changeFrequency: "weekly",
}));

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const allRoutes = [...routeDefinitions, ...hotelRoutes];

  return allRoutes.flatMap((route) => {
    const alternates = {
      languages: Object.fromEntries(
        locales.map((locale) => [locale, `${baseUrl}/${locale}${route.path}`]),
      ),
    };

    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates,
    }));
  });
}
