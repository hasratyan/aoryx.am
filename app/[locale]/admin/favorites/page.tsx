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

type FavoriteRecord = {
  userIdString?: string | null;
  hotelCode?: string | null;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  savedAt?: Date | string | null;
};

type ProfileDoc = {
  userIdString?: string | null;
  name?: string | null;
  email?: string | null;
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
    title: t.admin.favorites.title,
    description: t.admin.favorites.subtitle,
    path: "/admin/favorites",
  });
}

export default async function AdminFavoritesPage({ params }: PageProps) {
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
  const favoritesCollection = db.collection("user_favorites");
  const favoriteDocs = (await favoritesCollection
    .find({})
    .sort({ savedAt: -1 })
    .limit(200)
    .toArray()) as FavoriteRecord[];

  const userIds = Array.from(
    new Set(
      favoriteDocs
        .map((entry) => entry.userIdString)
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
    )
  );

  const profileDocs = userIds.length
    ? ((await db
        .collection("user_profiles")
        .find({ userIdString: { $in: userIds } })
        .project({ userIdString: 1, name: 1, email: 1 })
        .toArray()) as ProfileDoc[])
    : [];

  const profileMap = new Map(
    profileDocs.map((profile) => [
      profile.userIdString as string,
      {
        name: profile.name ?? null,
        email: profile.email ?? null,
      },
    ])
  );

  const intlLocale = intlLocales[resolvedLocale] ?? "en-GB";

  return (
    <main className="container admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.favorites.title}</h1>
          <p className="admin-subtitle">{t.admin.favorites.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{session.user.name ?? session.user.email ?? t.auth.guestNameFallback}</span>
          <small>{session.user.email ?? "—"}</small>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.favorites.title}</h2>
            <p>{t.admin.favorites.subtitle}</p>
          </div>
        </div>

        {favoriteDocs.length === 0 ? (
          <div className="admin-empty">
            <h3>{t.admin.favorites.emptyTitle}</h3>
            <p>{t.admin.favorites.emptyBody}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.admin.favorites.columns.user}</th>
                  <th>{t.admin.favorites.columns.hotel}</th>
                  <th>{t.admin.favorites.columns.location}</th>
                  <th>{t.admin.favorites.columns.rating}</th>
                  <th>{t.admin.favorites.columns.savedAt}</th>
                </tr>
              </thead>
              <tbody>
                {favoriteDocs.map((entry, index) => {
                  const profile = entry.userIdString ? profileMap.get(entry.userIdString) ?? null : null;
                  const hotelLabel = entry.name ?? entry.hotelCode ?? "—";
                  const locationLabel = entry.city ?? entry.address ?? "—";

                  return (
                    <tr key={entry.userIdString ?? entry.hotelCode ?? `fav-${index}`}>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{profile?.name ?? t.auth.guestNameFallback}</strong>
                          <small>{profile?.email ?? entry.userIdString ?? "—"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{hotelLabel}</strong>
                          {entry.hotelCode && <small>{entry.hotelCode}</small>}
                        </div>
                      </td>
                      <td>{locationLabel}</td>
                      <td>{entry.rating ? `${entry.rating.toFixed(1)} ★` : "—"}</td>
                      <td>{formatDate(entry.savedAt ?? null, intlLocale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
