import Link from "next/link";
import ProfileSignIn from "@/components/profile-signin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasAdminConfig, isAdminUser } from "@/lib/admin";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

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
    title: t.admin.dashboard.title,
    description: t.admin.dashboard.subtitle,
    path: "/admin",
  });
}

export default async function AdminHomePage({ params }: PageProps) {
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

  const cards = [
    {
      href: "/admin/bookings",
      icon: "receipt_long",
      title: t.admin.bookings.title,
      body: t.admin.dashboard.cards.bookings,
    },
    {
      href: "/admin/featured-hotels",
      icon: "hotel",
      title: t.admin.featured.title,
      body: t.admin.dashboard.cards.featured,
    },
    {
      href: "/admin/users",
      icon: "group",
      title: t.admin.users.title,
      body: t.admin.dashboard.cards.users,
    },
    {
      href: "/admin/searches",
      icon: "search",
      title: t.admin.searches.title,
      body: t.admin.dashboard.cards.searches,
    },
    {
      href: "/admin/favorites",
      icon: "favorite",
      title: t.admin.favorites.title,
      body: t.admin.dashboard.cards.favorites,
    },
  ];

  return (
    <main className="container admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.dashboard.title}</h1>
          <p className="admin-subtitle">{t.admin.dashboard.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{session.user.name ?? session.user.email ?? t.auth.guestNameFallback}</span>
          <small>{session.user.email ?? "—"}</small>
        </div>
      </section>

      <section className="admin-panel admin-dashboard">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.dashboard.navTitle}</h2>
            <p>{t.admin.dashboard.navSubtitle}</p>
          </div>
        </div>
        <div className="admin-card-grid">
          {cards.map((card) => (
            <Link key={card.href} href={`/${resolvedLocale}${card.href}`} className="admin-nav-card">
              <span className="admin-card-icon">
                <span className="material-symbols-rounded" aria-hidden="true">
                  {card.icon}
                </span>
              </span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
              <span className="admin-card-cta">{t.admin.dashboard.open}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
