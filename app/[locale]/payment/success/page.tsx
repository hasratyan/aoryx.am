"use client";

import Link from "next/link";
import { useTranslations } from "@/components/language-provider";

export default function PaymentSuccessPage() {
  const t = useTranslations();

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
