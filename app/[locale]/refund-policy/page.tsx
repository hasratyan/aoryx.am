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
    title: t.policies.refund.title,
    description: t.policies.refund.intro,
    path: "/refund-policy",
  });
}

export default async function RefundPolicyPage({ params }: PageProps) {
  const { locale } = await params;
  const t = getTranslations(resolveLocale(locale));

  return (
    <main className="container policy-page">
      <div className="policy-header">
        <h1>{t.policies.refund.title}</h1>
        <p>{t.policies.refund.intro}</p>
      </div>
      {t.policies.refund.sections.map((section, index) => (
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
      <p className="policy-note">{t.policies.refund.note}</p>
    </main>
  );
}
