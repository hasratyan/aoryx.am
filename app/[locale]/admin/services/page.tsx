import ProfileSignIn from "@/components/profile-signin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasAdminConfig, isAdminUser } from "@/lib/admin";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import AdminServicesClient from "./admin-services-client";
import { getServiceFlags } from "@/lib/service-flags";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.admin.services.title,
    description: t.admin.services.subtitle,
    path: "/admin/services",
  });
}

export default async function AdminServicesPage({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  const session = await getServerSession(authOptions);
  const userIdentity = {
    id: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };

  if (!session?.user) {
    return (
      <main className="container admin-page">
        <ProfileSignIn
          title={t.admin.access.signInTitle}
          body={t.admin.access.signInBody}
          cta={t.admin.access.signInCta}
        />
      </main>
    );
  }

  if (!hasAdminConfig()) {
    return (
      <main className="container admin-page">
        <section className="profile-card admin-empty">
          <h1>{t.admin.access.configTitle}</h1>
          <p>{t.admin.access.configBody}</p>
        </section>
      </main>
    );
  }

  if (!isAdminUser(userIdentity)) {
    return (
      <main className="container admin-page">
        <section className="profile-card admin-empty">
          <h1>{t.admin.access.deniedTitle}</h1>
          <p>{t.admin.access.deniedBody}</p>
        </section>
      </main>
    );
  }

  const flags = await getServiceFlags();

  return (
    <main className="container admin-page">
      <AdminServicesClient
        adminUser={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
        }}
        initialFlags={flags}
      />
    </main>
  );
}
