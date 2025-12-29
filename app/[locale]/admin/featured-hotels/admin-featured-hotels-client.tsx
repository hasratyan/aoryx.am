"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getJson, postJson } from "@/lib/api-helpers";
import { useLanguage, useTranslations } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";
import type { AoryxHotelOption, FeaturedHotelAdminItem } from "@/lib/featured-hotels";

type AdminFeaturedHotelsClientProps = {
  adminUser: { name?: string | null; email?: string | null };
  initialFeaturedHotels: FeaturedHotelAdminItem[];
};

type TranslationForm = {
  badge: string;
  availability: string;
};

type FormState = {
  hotelCode: string;
  priceFrom: string;
  oldPrice: string;
  currency: string;
  translations: Record<Locale, TranslationForm>;
  selectedAmenities: string[];
};

const localeOrder: Locale[] = ["hy", "en", "ru"];
const localeLabels: Record<Locale, string> = { hy: "Հայ", en: "EN", ru: "РУ" };

const emptyTranslations: Record<Locale, TranslationForm> = {
  hy: { badge: "", availability: "" },
  en: { badge: "", availability: "" },
  ru: { badge: "", availability: "" },
};

const normalizeTranslations = (translations?: Record<Locale, TranslationForm>) => ({
  hy: {
    badge: translations?.hy?.badge ?? "",
    availability: translations?.hy?.availability ?? "",
  },
  en: {
    badge: translations?.en?.badge ?? "",
    availability: translations?.en?.availability ?? "",
  },
  ru: {
    badge: translations?.ru?.badge ?? "",
    availability: translations?.ru?.availability ?? "",
  },
});

export default function AdminFeaturedHotelsClient({
  adminUser,
  initialFeaturedHotels,
}: AdminFeaturedHotelsClientProps) {
  const t = useTranslations();
  const { locale } = useLanguage();
  const [featuredHotels, setFeaturedHotels] = useState<FeaturedHotelAdminItem[]>(initialFeaturedHotels);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AoryxHotelOption[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<AoryxHotelOption | null>(null);
  const [form, setForm] = useState<FormState>({
    hotelCode: "",
    priceFrom: "",
    oldPrice: "",
    currency: "$",
    translations: { ...emptyTranslations },
    selectedAmenities: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  const featuredCodes = useMemo(
    () => new Set(featuredHotels.map((hotel) => hotel.hotelCode)),
    [featuredHotels]
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      setSearchLoading(true);
      try {
        const response = await getJson<{ hotels: AoryxHotelOption[] }>(
          `/api/admin/aoryx-hotels?query=${encodeURIComponent(searchQuery.trim())}`
        );
        if (!active) return;
        setSearchResults(response.hotels ?? []);
      } catch (error) {
        if (!active) return;
        console.error("[AdminFeaturedHotels] Failed to search hotels", error);
        setSearchResults([]);
      } finally {
        if (!active) return;
        setSearchLoading(false);
      }
    };
    const handler = setTimeout(run, searchQuery.trim().length > 0 ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const selectHotel = (hotel: AoryxHotelOption) => {
    const existing = featuredHotels.find((item) => item.hotelCode === hotel.hotelCode);
    const selectedAmenities =
      existing?.selectedAmenities?.length === 3
        ? existing.selectedAmenities
        : hotel.masterHotelAmenities.slice(0, 3);

    setSelectedHotel(hotel);
    setForm({
      hotelCode: hotel.hotelCode,
      priceFrom: existing?.priceFrom?.toString() ?? "",
      oldPrice: existing?.oldPrice?.toString() ?? "",
      currency: existing?.currency ?? "$",
      translations: normalizeTranslations(existing?.translations ?? emptyTranslations),
      selectedAmenities,
    });
    setFormError(null);
  };

  const editHotel = (hotel: FeaturedHotelAdminItem) => {
    const option: AoryxHotelOption = {
      hotelCode: hotel.hotelCode,
      name: hotel.name ?? null,
      destinationName: hotel.destinationName ?? null,
      rating: hotel.rating ?? null,
      imageUrl: hotel.imageUrl ?? null,
      masterHotelAmenities: hotel.availableAmenities ?? [],
    };
    selectHotel(option);
  };

  const clearForm = () => {
    setSelectedHotel(null);
    setForm({
      hotelCode: "",
      priceFrom: "",
      oldPrice: "",
      currency: "$",
      translations: { ...emptyTranslations },
      selectedAmenities: [],
    });
    setFormError(null);
  };

  const updateTranslation = (localeKey: Locale, field: keyof TranslationForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [localeKey]: {
          ...prev.translations[localeKey],
          [field]: value,
        },
      },
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormError(null);
    setForm((prev) => {
      if (prev.selectedAmenities.includes(amenity)) {
        return {
          ...prev,
          selectedAmenities: prev.selectedAmenities.filter((item) => item !== amenity),
        };
      }
      if (prev.selectedAmenities.length >= 3) {
        setFormError(t.admin.featured.validation.amenitiesLimit);
        return prev;
      }
      return { ...prev, selectedAmenities: [...prev.selectedAmenities, amenity] };
    });
  };

  const validateForm = () => {
    if (!selectedHotel || !form.hotelCode) {
      return t.admin.featured.validation.selectHotel;
    }
    if (!form.priceFrom.trim() || Number(form.priceFrom) <= 0) {
      return t.admin.featured.validation.priceFrom;
    }
    if (!form.oldPrice.trim() || Number(form.oldPrice) <= 0) {
      return t.admin.featured.validation.oldPrice;
    }
    if (form.selectedAmenities.length !== 3) {
      return t.admin.featured.validation.amenities;
    }
    const hasMissingTranslations = localeOrder.some(
      (localeKey) =>
        !form.translations[localeKey].badge.trim() ||
        !form.translations[localeKey].availability.trim()
    );
    if (hasMissingTranslations) {
      return t.admin.featured.validation.translations;
    }
    return null;
  };

  const saveHotel = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const response = await postJson<{ featuredHotels: FeaturedHotelAdminItem[] }>(
        "/api/admin/featured-hotels",
        {
          hotelCode: form.hotelCode,
          priceFrom: Number(form.priceFrom),
          oldPrice: Number(form.oldPrice),
          currency: form.currency,
          amenities: form.selectedAmenities,
          translations: form.translations,
        }
      );
      setFeaturedHotels(response.featuredHotels ?? []);
      clearForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.admin.featured.errors.saveFailed;
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const removeHotel = async (hotelCode: string) => {
    setRemovingCode(hotelCode);
    try {
      const response = await fetch("/api/admin/featured-hotels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t.admin.featured.errors.removeFailed);
      }
      const payload = (await response.json()) as { featuredHotels: FeaturedHotelAdminItem[] };
      setFeaturedHotels(payload.featuredHotels ?? []);
      if (form.hotelCode === hotelCode) clearForm();
    } catch (error) {
      console.error("[AdminFeaturedHotels] Failed to remove hotel", error);
      setFormError(error instanceof Error ? error.message : t.admin.featured.errors.removeFailed);
    } finally {
      setRemovingCode(null);
    }
  };

  const selectedTranslation = form.translations[locale];

  return (
    <>
      <section className="admin-hero">
        <div>
          <span className="admin-eyebrow">{t.admin.title}</span>
          <h1 className="admin-title">{t.admin.featured.title}</h1>
          <p className="admin-subtitle">{t.admin.featured.subtitle}</p>
        </div>
        <div className="admin-user">
          <span>{adminUser.name ?? adminUser.email ?? t.auth.guestNameFallback}</span>
          <small>{adminUser.email ?? "—"}</small>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.featured.searchTitle}</h2>
            <p>{t.admin.featured.searchSubtitle}</p>
          </div>
        </div>
        <div className="admin-featured-grid">
          <div className="admin-featured-search">
            <label className="admin-control">
              <span>{t.admin.featured.searchLabel}</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t.admin.featured.searchPlaceholder}
              />
            </label>
            <div className="admin-featured-results">
              {searchLoading && <p className="admin-hint">{t.admin.featured.loading}</p>}
              {!searchLoading && searchResults.length === 0 && (
                <p className="admin-hint">{t.admin.featured.noResults}</p>
              )}
              {searchResults.map((hotel) => (
                <button
                  type="button"
                  key={hotel.hotelCode}
                  className="admin-result-card"
                  onClick={() => selectHotel(hotel)}
                >
                  <div className="admin-result-image">
                    {hotel.imageUrl ? (
                      <Image src={hotel.imageUrl} alt={hotel.name ?? hotel.hotelCode} fill sizes="120px" />
                    ) : (
                      <span>{hotel.name?.charAt(0) ?? "H"}</span>
                    )}
                  </div>
                  <div>
                    <strong>{hotel.name ?? hotel.hotelCode}</strong>
                    <small>{hotel.destinationName ?? "—"}</small>
                    <div className="admin-result-meta">
                      <span>{hotel.rating ? `${hotel.rating.toFixed(1)} ★` : "—"}</span>
                      {featuredCodes.has(hotel.hotelCode) && (
                        <span className="admin-pill">{t.admin.featured.alreadySelected}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-featured-editor">
            <div className="admin-featured-header">
              <div>
                <h3>{t.admin.featured.formTitle}</h3>
                <p>{t.admin.featured.formSubtitle}</p>
              </div>
              {selectedHotel && (
                <button type="button" className="admin-reset" onClick={clearForm}>
                  {t.admin.featured.actions.clear}
                </button>
              )}
            </div>

            {!selectedHotel ? (
              <div className="admin-empty">
                <h3>{t.admin.featured.emptyTitle}</h3>
                <p>{t.admin.featured.emptyBody}</p>
              </div>
            ) : (
              <div className="admin-featured-form">
                <div className="admin-featured-preview">
                  <div className="admin-result-image">
                    {selectedHotel.imageUrl ? (
                      <Image src={selectedHotel.imageUrl} alt={selectedHotel.name ?? selectedHotel.hotelCode} fill sizes="120px" />
                    ) : (
                      <span>{selectedHotel.name?.charAt(0) ?? "H"}</span>
                    )}
                  </div>
                  <div>
                    <strong>{selectedHotel.name ?? selectedHotel.hotelCode}</strong>
                    <small>{selectedHotel.destinationName ?? "—"}</small>
                    <div className="admin-result-meta">
                      <span>{selectedHotel.rating ? `${selectedHotel.rating.toFixed(1)} ★` : "—"}</span>
                      <span>{selectedHotel.hotelCode}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-controls">
                  <label className="admin-control">
                    <span>{t.admin.featured.fields.priceFrom}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.priceFrom}
                      onChange={(event) => setForm((prev) => ({ ...prev, priceFrom: event.target.value }))}
                    />
                  </label>
                  <label className="admin-control">
                    <span>{t.admin.featured.fields.oldPrice}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.oldPrice}
                      onChange={(event) => setForm((prev) => ({ ...prev, oldPrice: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="admin-lang-grid">
                  {localeOrder.map((localeKey) => (
                    <div key={localeKey} className="admin-lang-card">
                      <span className="admin-lang-label">{localeLabels[localeKey]}</span>
                      <label className="admin-control">
                        <span>{t.admin.featured.fields.badge}</span>
                        <input
                          value={form.translations[localeKey].badge}
                          onChange={(event) => updateTranslation(localeKey, "badge", event.target.value)}
                        />
                      </label>
                      <label className="admin-control">
                        <span>{t.admin.featured.fields.availability}</span>
                        <input
                          value={form.translations[localeKey].availability}
                          onChange={(event) => updateTranslation(localeKey, "availability", event.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="admin-featured-amenities">
                  <div className="admin-featured-amenities-header">
                    <span>{t.admin.featured.fields.amenities}</span>
                    <small>
                      {form.selectedAmenities.length}/3 {t.admin.featured.fields.selected}
                    </small>
                  </div>
                  <div className="admin-amenities-grid">
                    {selectedHotel.masterHotelAmenities.map((amenity) => (
                      <button
                        type="button"
                        key={amenity}
                        className={
                          form.selectedAmenities.includes(amenity)
                            ? "admin-amenity active"
                            : "admin-amenity"
                        }
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {formError && <p className="admin-error">{formError}</p>}

                <div className="admin-featured-actions">
                  <button type="button" className="admin-primary" onClick={saveHotel} disabled={saving}>
                    {saving ? t.admin.featured.actions.saving : t.admin.featured.actions.save}
                  </button>
                  <div className="admin-live-preview">
                    <span>{t.admin.featured.previewLabel}</span>
                    <strong>{selectedTranslation.badge || "—"}</strong>
                    <small>{selectedTranslation.availability || "—"}</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>{t.admin.featured.listTitle}</h2>
            <p>{t.admin.featured.listSubtitle}</p>
          </div>
        </div>
        {featuredHotels.length === 0 ? (
          <div className="admin-empty">
            <h3>{t.admin.featured.listEmptyTitle}</h3>
            <p>{t.admin.featured.listEmptyBody}</p>
          </div>
        ) : (
          <div className="admin-featured-list">
            {featuredHotels.map((hotel) => (
              <div key={hotel.hotelCode} className="admin-featured-card">
                <div className="admin-featured-preview">
                  <div className="admin-result-image">
                    {hotel.imageUrl ? (
                      <Image src={hotel.imageUrl} alt={hotel.name ?? hotel.hotelCode} fill sizes="120px" />
                    ) : (
                      <span>{hotel.name?.charAt(0) ?? "H"}</span>
                    )}
                  </div>
                  <div>
                    <strong>{hotel.name ?? hotel.hotelCode}</strong>
                    <small>{hotel.destinationName ?? "—"}</small>
                    <div className="admin-result-meta">
                      <span>{hotel.rating ? `${hotel.rating.toFixed(1)} ★` : "—"}</span>
                      <span>{hotel.hotelCode}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-featured-meta">
                  <p>
                    {t.admin.featured.fields.priceFrom}:{" "}
                    <strong>{hotel.currency ?? "$"}{hotel.priceFrom ?? "—"}</strong>
                  </p>
                  <p>
                    {t.admin.featured.fields.oldPrice}:{" "}
                    <strong>{hotel.currency ?? "$"}{hotel.oldPrice ?? "—"}</strong>
                  </p>
                  <p>
                    {t.admin.featured.fields.badge}:{" "}
                    <strong>{hotel.translations?.[locale]?.badge ?? "—"}</strong>
                  </p>
                  <p>
                    {t.admin.featured.fields.availability}:{" "}
                    <strong>{hotel.translations?.[locale]?.availability ?? "—"}</strong>
                  </p>
                </div>
                <div className="admin-featured-amenities-list">
                  {hotel.selectedAmenities.map((amenity) => (
                    <span key={amenity}>{amenity}</span>
                  ))}
                </div>
                <div className="admin-featured-actions-row">
                  <button type="button" className="admin-secondary" onClick={() => editHotel(hotel)}>
                    {t.admin.featured.actions.edit}
                  </button>
                  <button
                    type="button"
                    className="admin-danger"
                    onClick={() => removeHotel(hotel.hotelCode)}
                    disabled={removingCode === hotel.hotelCode}
                  >
                    {removingCode === hotel.hotelCode ? t.admin.featured.actions.removing : t.admin.featured.actions.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
