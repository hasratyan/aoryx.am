"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";

const initials = (name?: string | null, fallback = "Guest") =>
  (name || fallback)
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

type AuthActionsProps = {
  onAction?: () => void;
};

export default function AuthActions({ onAction }: AuthActionsProps) {
  const { data: session, status } = useSession();
  const { locale, t } = useLanguage();
  const loading = status === "loading";

  if (loading) {
    return (
      <div className="auth-chip">
        <span className="badge" />
        {t.auth.checking}
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="auth-user">
        <Link href={`/${locale}/profile`} className="auth-profile" onClick={onAction}>
          <div className="avatar">
            {session.user.image ? (
              <Image src={session.user.image} alt={session.user.name || t.auth.signedIn} fill sizes="48px" />
            ) : (
              <div className="avatar-fallback">{initials(session.user.name, t.auth.guestInitialsFallback)}</div>
            )}
          </div>
          <div className="auth-name">{session.user.name || t.auth.guestNameFallback}</div>
        </Link>
        <button
          onClick={() => {
            onAction?.();
            void signOut({ callbackUrl: `/${locale}` });
          }}
          type="button"
          aria-label={t.auth.signOut}
          title={t.auth.signOut}
        >
          <span className={"material-symbols-rounded"}>logout</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        onAction?.();
        void signIn("google");
      }}
      type="button"
      className="login"
    >
      <span className={"material-symbols-rounded"}>login</span>{t.auth.signIn}
    </button>
  );
}
