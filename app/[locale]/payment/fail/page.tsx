"use client";

import Link from "next/link";
import { useTranslations } from "@/components/language-provider";

export default function PaymentFailPage() {
  const t = useTranslations();

  return (
    <main className="container payment-status">
      <h1>{t.payment.failure.title}</h1>
      <p>{t.payment.failure.body}</p>
      <Link href="/" className="payment-link">
        {t.payment.failure.cta}
      </Link>
    </main>
  );
}
