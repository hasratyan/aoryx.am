import ProfileSignIn from "@/components/profile-signin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasAdminConfig, isAdminUser } from "@/lib/admin";
import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";
import type { AoryxSearchParams } from "@/types/aoryx";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type SearchRecord = {
  createdAt?: Date | string | null;
  userIdString?: string | null;
  params?: AoryxSearchParams | null;
  resultSummary?: {
    destinationCode?: string | null;
    destinationName?: string | null;
  } | null;
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

const formatDateRange = (start?: string | null, end?: string | null, locale?: string) => {
  if (!start || !end || !locale) return "—";
  const parsedStart = new Date(start);
  const parsedEnd = new Date(end);
  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return `${formatter.format(parsedStart)} — ${formatter.format(parsedEnd)}`;
};

const countGuests = (rooms: AoryxSearchParams["rooms"] = []) =>
  rooms.reduce((sum, room) => sum + room.adults + room.childrenAges.length, 0);

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);
  const t = getTranslations(resolvedLocale);
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t.admin.searches.title,
    description: t.admin.searches.subtitle,
    path: "/admin/searches",
  });
}

export default async function AdminSearchesPage({ params }: PageProps) {
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
  const searchesCollection = db.collection("user_searches");
  const searchDocs = (await searchesCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()) as SearchRecord[];

  const userIds = Array.from(
    new Set(
      searchDocs
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
          <h1 className="admin-title">{t.admin.searches.title}</h1>
          <p className="admin-subtitle">{t.admin.searches.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{session.user.name ?? session.user.email ?? t.auth.guestNameFallback}</span>
          <small>{session.user.email ?? "—"}</small>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.searches.title}</h2>
            <p>{t.admin.searches.subtitle}</p>
          </div>
        </div>

        {searchDocs.length === 0 ? (
          <div className="admin-empty">
            <h3>{t.admin.searches.emptyTitle}</h3>
            <p>{t.admin.searches.emptyBody}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.admin.searches.columns.user}</th>
                  <th>{t.admin.searches.columns.destination}</th>
                  <th>{t.admin.searches.columns.dates}</th>
                  <th>{t.admin.searches.columns.rooms}</th>
                  <th>{t.admin.searches.columns.guests}</th>
                  <th>{t.admin.searches.columns.createdAt}</th>
                </tr>
              </thead>
              <tbody>
                {searchDocs.map((entry, index) => {
                  const params = entry.params;
                  const profile = entry.userIdString ? profileMap.get(entry.userIdString) ?? null : null;
                  const destinationLabel =
                    entry.resultSummary?.destinationName ??
                    params?.destinationCode ??
                    params?.hotelCode ??
                    "—";
                  const destinationSub = params?.hotelCode ? `${t.admin.searches.columns.hotel}: ${params.hotelCode}` : null;
                  const roomsCount = params?.rooms?.length ?? 0;
                  const guestsCount = params?.rooms ? countGuests(params.rooms) : 0;

                  return (
                    <tr key={entry.userIdString ?? entry.createdAt?.toString() ?? `search-${index}`}>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{profile?.name ?? t.auth.guestNameFallback}</strong>
                          <small>{profile?.email ?? entry.userIdString ?? "—"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="admin-cell-stack">
                          <strong>{destinationLabel}</strong>
                          {destinationSub && <small>{destinationSub}</small>}
                        </div>
                      </td>
                      <td>{formatDateRange(params?.checkInDate, params?.checkOutDate, intlLocale)}</td>
                      <td>{roomsCount || "—"}</td>
                      <td>{guestsCount || "—"}</td>
                      <td>{formatDate(entry.createdAt ?? null, intlLocale)}</td>
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
