import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import PackageServiceClient from "@/components/package-service-client";
import ProfileSignIn from "@/components/profile-signin";
import { authOptions } from "@/lib/auth";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import type { PackageBuilderService } from "@/lib/package-builder-state";

const serviceKeys: PackageBuilderService[] = [
  "hotel",
  "flight",
  "transfer",
  "excursion",
  "insurance",
];

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; service: string }>;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const resolveServiceKey = (value: string | undefined): PackageBuilderService | null => {
  const normalized = value?.toLowerCase() ?? "";
  return serviceKeys.includes(normalized as PackageBuilderService)
    ? (normalized as PackageBuilderService)
    : null;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale, service } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  const serviceKey = resolveServiceKey(service);
  const pageCopy = serviceKey ? t.packageBuilder.pages[serviceKey] : null;
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: pageCopy?.title ?? t.packageBuilder.title,
    description: pageCopy?.body ?? t.packageBuilder.subtitle,
    path: serviceKey ? `/services/${serviceKey}` : "/services",
  });
}

export default async function ServicePage({ params }: PageProps) {
  const { service } = await params;
  const serviceKey = service.toLowerCase() as PackageBuilderService;

  if (!serviceKeys.includes(serviceKey)) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <main className="container service-builder">
        <ProfileSignIn />
      </main>
    );
  }

  return <PackageServiceClient serviceKey={serviceKey} />;
}
