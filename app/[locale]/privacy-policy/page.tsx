"use client";

import { useTranslations } from "@/components/language-provider";

export default function SecurityPolicyPage() {
  const t = useTranslations();

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
