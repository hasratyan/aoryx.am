"use client";

import { useState } from "react";
import { postJson } from "@/lib/api-helpers";
import { useTranslations } from "@/components/language-provider";
import type { PackageBuilderService, ServiceFlags } from "@/lib/package-builder-state";

type AdminServicesClientProps = {
  adminUser: { name?: string | null; email?: string | null };
  initialFlags: ServiceFlags;
};

const serviceOrder: PackageBuilderService[] = [
  "hotel",
  "flight",
  "transfer",
  "excursion",
  "insurance",
];

export default function AdminServicesClient({
  adminUser,
  initialFlags,
}: AdminServicesClientProps) {
  const t = useTranslations();
  const [flags, setFlags] = useState<ServiceFlags>(initialFlags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggleFlag = (service: PackageBuilderService) => {
    setFlags((prev) => ({ ...prev, [service]: !prev[service] }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await postJson<{ flags: ServiceFlags }>("/api/admin/services", {
        flags,
      });
      setFlags(response.flags);
      setSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.admin.services.errors.saveFailed;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.services.title}</h1>
          <p className="admin-subtitle">{t.admin.services.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{adminUser.name ?? adminUser.email ?? t.auth.guestNameFallback}</span>
          {adminUser.email && <small>{adminUser.email}</small>}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.services.panelTitle}</h2>
            <p>{t.admin.services.note}</p>
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-service-grid">
          {serviceOrder.map((service) => {
            const enabled = flags[service];
            return (
              <label
                key={service}
                className={`admin-service-card${enabled ? "" : " is-disabled"}`}
              >
                <div>
                  <strong>{t.packageBuilder.services[service]}</strong>
                  <small>
                    {enabled ? t.admin.services.status.enabled : t.admin.services.status.disabled}
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleFlag(service)}
                  aria-checked={enabled}
                />
              </label>
            );
          })}
        </div>

        <div className="admin-featured-actions">
          <button type="button" className="admin-primary" onClick={handleSave} disabled={saving}>
            {saving ? t.admin.services.actions.saving : t.admin.services.actions.save}
          </button>
          {saved && <span className="admin-hint">{t.admin.services.saved}</span>}
        </div>
      </section>
    </>
  );
}
