"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { Link, useRouter } from "@/i18n/navigation";
import { joinHref } from "@/lib/auth-href";

function postLoginPath(isAdmin: boolean, next: string | null) {
  if (isAdmin) {
    if (next && next !== "/members" && next !== "/admin") return next;
    return "/admin";
  }
  if (next === "/admin") return "/members";
  return next || "/members";
}

function AuthForm() {
  const t = useTranslations("auth");
  const { signIn, resetPassword, user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(postLoginPath(isAdmin, next));
    }
  }, [loading, user, profile, isAdmin, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResetInfo(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setResetInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("forgotNeedEmail"));
      return;
    }
    setResetBusy(true);
    try {
      await resetPassword(trimmed);
      setResetInfo(t("forgotSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgotFailed"));
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        Happy People
      </p>
      <h1 className="font-display mt-3 text-3xl text-ink sm:text-4xl">
        {t("returnTitle")}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {t("returnLead")}
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
        <div>
          <label className="block text-sm font-medium text-ink">
            {t("password")}
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base outline-none focus:border-accent"
            />
          </label>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={resetBusy || busy}
              onClick={() => void onForgotPassword()}
              className="text-sm font-semibold text-accent underline-offset-4 hover:underline disabled:opacity-60"
            >
              {resetBusy ? "…" : t("forgotPassword")}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {resetInfo && <p className="text-sm text-accent">{resetInfo}</p>}
        <button
          type="submit"
          disabled={busy || resetBusy || (!!user && !profile)}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
        >
          {busy || (user && !profile) ? "…" : t("returnCta")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        {t("needJoin")}{" "}
        <Link
          href={joinHref(next || "/members/onboarding")}
          className="font-semibold text-accent hover:underline"
        >
          {t("switchToJoin")}
        </Link>
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <>
      <SiteHeader variant="solid" />
      <Suspense fallback={<div className="p-16 text-center">…</div>}>
        <AuthForm />
      </Suspense>
    </>
  );
}
