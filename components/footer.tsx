"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function Footer() {
  const { locale, t } = useLanguage();

  return (
    <footer>
      <div className="container">
        <span>&copy; 2026 | MEGATOURS</span>
        <nav>
          <Link href={`/${locale}/refund`}>{t.footer.refundPolicy}</Link>
          •
          <Link href={`/${locale}/security`}>{t.footer.securityPolicy}</Link>
          •
          <Link href={"https://b2b.megatours.am"} target={"_blank"}>{t.footer.b2bPartnership}</Link>
        </nav>
      </div>
    </footer>
  );
}
