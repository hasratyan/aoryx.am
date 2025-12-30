"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import Images from "next/image";

export default function Footer() {
  const { locale, t } = useLanguage();

  return (
    <footer>
      <div className="container">
        <span>&copy; 2026 | MEGATOURS</span>
        <nav>
          <Link href={`/${locale}/refund-policy`}>{t.footer.refundPolicy}</Link>
          •
          <Link href={`/${locale}/privacy-policy`}>{t.footer.securityPolicy}</Link>
          •
          <Link href={"https://b2b.megatours.am"} target={"_blank"}>{t.footer.b2bPartnership}</Link>
        </nav>
        {/* <div className="social"></div> */}
        <div className="payment">
          <Images src="/images/icons/payment-methods.png" width="350" height="50" unoptimized alt="Payment methods" />
        </div>
      </div>
    </footer>
  );
}
