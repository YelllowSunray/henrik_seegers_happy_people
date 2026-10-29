"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

export function AdminLogin() {
  const t = useTranslations("admin");
  const { unlockAdmin } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unlockAdmin(password)) {
      setError(t("wrongPassword"));
      return;
    }
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-center text-3xl text-ink">
          {t("title")}
        </h1>
        <p className="mt-3 text-center text-ink-soft">{t("signInHint")}</p>
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
            {t("unlock")}
          </button>
        </form>
      </div>
    </>
  );
}
