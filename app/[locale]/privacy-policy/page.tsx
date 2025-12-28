import { buildLocalizedMetadata } from "@/lib/metadata";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

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
    title: t.policies.security.title,
    description: t.policies.security.intro,
    path: "/privacy-policy",
  });
}

export default async function PrivacyPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const t = getTranslations(resolveLocale(locale));

  return (
    <main className="container policy-page">
      <div className="policy-header">
        <h1>{t.policies.security.title}</h1>
        <p>{t.policies.security.intro}</p>
      </div>
      {t.policies.security.sections.map((section, index) => (
        <section key={`${section.title}-${index}`} className="policy-section">
          <h2>{section.title}</h2>
          {section.body && <p>{section.body}</p>}
          {section.items && (
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={`${section.title}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="policy-note">{t.policies.security.note}</p>
    </main>
  );
}
