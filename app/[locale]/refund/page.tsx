"use client";

import { useTranslations } from "@/components/language-provider";

export default function RefundPolicyPage() {
  const t = useTranslations();

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
