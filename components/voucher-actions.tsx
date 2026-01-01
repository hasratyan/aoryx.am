"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VoucherActionsProps = {
  downloadLabel: string;
  backLabel: string;
  profileHref: string;
};

export default function VoucherActions({
  downloadLabel,
  backLabel,
  profileHref,
}: VoucherActionsProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("download") !== "1") return;
    const handle = window.setTimeout(() => {
      window.print();
    }, 150);
    return () => window.clearTimeout(handle);
  }, [searchParams]);

  return (
    <div className="voucher-actions">
      <button type="button" className="voucher-download" onClick={() => window.print()}>
        {downloadLabel}
      </button>
      <Link className="voucher-back" href={profileHref}>
        {backLabel}
      </Link>
    </div>
  );
}
