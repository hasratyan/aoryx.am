import ProfileSignIn from "@/components/profile-signin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasAdminConfig, isAdminUser } from "@/lib/admin";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type UserProfileDoc = {
  userIdString?: string | null;
  name?: string | null;
  email?: string | null;
  createdAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
  lastSearchAt?: Date | string | null;
  lastBookingAt?: Date | string | null;
};

const resolveLocale = (value: string | undefined) =>
  locales.includes(value as Locale) ? (value as Locale) : defaultLocale;

const intlLocales: Record<Locale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

const formatDate = (value: Date | string | null | undefined, locale: string) => {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.admin.users.title,
    description: t.admin.users.subtitle,
    path: "/admin/users",
  });
}

export default async function AdminUsersPage({ params }: PageProps) {
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

  const db = await getDb();
  const profilesCollection = db.collection("user_profiles");
  const [totalUsers, users] = await Promise.all([
    profilesCollection.countDocuments(),
    profilesCollection
      .find({})
      .project({
        userIdString: 1,
        name: 1,
        email: 1,
        createdAt: 1,
        lastLoginAt: 1,
        lastSearchAt: 1,
        lastBookingAt: 1,
      })
      .sort({ lastLoginAt: -1 })
      .limit(200)
      .toArray(),
  ]);

  const intlLocale = intlLocales[resolvedLocale] ?? "en-GB";
  const rows = users as UserProfileDoc[];

  return (
    <main className="container admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.users.title}</h1>
          <p className="admin-subtitle">{t.admin.users.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{session.user.name ?? session.user.email ?? t.auth.guestNameFallback}</span>
          <small>{session.user.email ?? "—"}</small>
        </div>
      </section>

      <section className="admin-stats">
        <div className="admin-stat">
          <p>{t.admin.users.stats.total}</p>
          <strong>{totalUsers}</strong>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.users.title}</h2>
            <p>{t.admin.users.subtitle}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="admin-empty">
            <h3>{t.admin.users.emptyTitle}</h3>
            <p>{t.admin.users.emptyBody}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.admin.users.columns.user}</th>
                  <th>{t.admin.users.columns.email}</th>
                  <th>{t.admin.users.columns.lastLogin}</th>
                  <th>{t.admin.users.columns.lastSearch}</th>
                  <th>{t.admin.users.columns.lastBooking}</th>
                  <th>{t.admin.users.columns.createdAt}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user, index) => (
                  <tr key={user.userIdString ?? user.email ?? `user-${index}`}>
                    <td>
                      <div className="admin-cell-stack">
                        <strong>{user.name ?? t.auth.guestNameFallback}</strong>
                        <small>{user.userIdString ?? "—"}</small>
                      </div>
                    </td>
                    <td>{user.email ?? "—"}</td>
                    <td>{formatDate(user.lastLoginAt ?? null, intlLocale)}</td>
                    <td>{formatDate(user.lastSearchAt ?? null, intlLocale)}</td>
                    <td>{formatDate(user.lastBookingAt ?? null, intlLocale)}</td>
                    <td>{formatDate(user.createdAt ?? null, intlLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
