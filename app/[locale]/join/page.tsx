"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Link, useRouter } from "@/i18n/navigation";
import { signInHref } from "@/lib/auth-href";
import { postSignUpPath } from "@/lib/profile";

function JoinForm() {
  const t = useTranslations("auth");
  const { signUp, user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(postSignUpPath(profile, isAdmin));
    }
  }, [loading, user, profile, isAdmin, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        Happy People
      </p>
      <h1 className="font-display mt-3 text-3xl text-ink sm:text-4xl">
        {t("joinTitle")}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {t("joinLead")}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium text-ink">
          {t("email")}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          {t("password")}
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base outline-none focus:border-accent"
          />
          <span className="mt-1.5 block text-xs text-ink-soft">
            {t("passwordHint")}
          </span>
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || (!!user && !profile)}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
        >
          {busy || (user && !profile) ? "…" : t("joinCta")}
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
        {t("joinNote")}
      </p>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {t("alreadyMember")}{" "}
        <Link
          href={signInHref("/members")}
          className="font-semibold text-accent hover:underline"
        >
          {t("switchToReturn")}
        </Link>
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <>
      <SiteHeader variant="solid" />
      <Suspense fallback={<div className="p-16 text-center">…</div>}>
        <JoinForm />
      </Suspense>
    </>
  );
}
