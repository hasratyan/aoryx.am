import Link from "next/link";
import { cookies } from "next/headers";
import { defaultLocale, getTranslations, Locale, locales } from "@/lib/i18n";

const resolveLocale = async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("megatours-locale")?.value;
  return locales.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : defaultLocale;
};

export default async function PaymentSuccessPage() {
  const t = getTranslations(await resolveLocale());

  return (
    <main className="container payment-status">
      <h1>{t.payment.success.title}</h1>
      <p>{t.payment.success.body}</p>
      <p>{t.payment.success.note}</p>
      <Link href="/" className="payment-link">
        {t.payment.success.cta}
      </Link>
    </main>
  );
}
