"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "@/components/language-provider";

type ProfileSignInProps = {
  title?: string;
  body?: string;
  cta?: string;
};

export default function ProfileSignIn({ title, body, cta }: ProfileSignInProps) {
  const t = useTranslations();
  const copy = {
    title: title ?? t.profile.signIn.title,
    body: body ?? t.profile.signIn.body,
    cta: cta ?? t.profile.signIn.cta,
  };

  return (
    <div className="profile-signin">
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <button type="button" className="profile-action" onClick={() => signIn("google")}>
        {copy.cta}
      </button>
    </div>
  );
}
