"use client";

import type { ReactNode } from "react";
import { openPackageBuilder } from "@/lib/package-builder-state";

type PackageBuilderCtaProps = {
  children: ReactNode;
  className?: string;
};

export default function PackageBuilderCta({ children, className }: PackageBuilderCtaProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        openPackageBuilder();
      }}
    >
      {children}
    </button>
  );
}
