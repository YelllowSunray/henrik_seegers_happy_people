"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "@/i18n/navigation";

function AuthForm() {
  const t = useTranslations("auth");
  const { signIn, signUp, user, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/members";

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl">
        {mode === "in" ? t("signInTitle") : t("signUpTitle")}
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          {t("email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-line bg-white/70 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          {t("password")}
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-line bg-white/70 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mode === "in" ? t("signInTitle") : t("createAccount")}
        </button>
      </form>
      <button
        type="button"
        className="mt-6 text-sm text-accent"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? t("needAccount") : t("haveAccount")}
      </button>
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
