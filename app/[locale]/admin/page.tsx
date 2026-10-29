"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "@/i18n/navigation";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { isAdmin, loading, unlockAdmin } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace("/");
    }
  }, [loading, isAdmin, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unlockAdmin(password)) {
      setError(t("wrongPassword"));
      return;
    }
    router.replace("/");
  }

  if (loading || isAdmin) {
    return (
      <>
        <SiteHeader variant="solid" />
        <p className="p-16 text-center text-ink-soft">…</p>
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-md px-5 py-20">
        <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          CMS · NL
        </p>
        <h1 className="font-display mt-3 text-center text-3xl text-ink">
          {t("title")}
        </h1>
        <p className="mt-3 text-center text-ink-soft">
          Log in om de website te bewerken. Je gaat daarna naar de homepage.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-ink">
            {t("password")}
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-line bg-white px-3 py-3 text-base outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white hover:bg-accent-soft"
          >
            Start CMS
          </button>
        </form>
      </div>
    </>
  );
}
