"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  DONATION_DEFAULT_EUR,
  DONATION_PRESETS_EUR,
} from "@/lib/stripe";

type Variant = "section" | "compact";

export function DonateButton({
  variant = "compact",
  returnPath = "/",
  className = "",
}: {
  variant?: Variant;
  /** Path after locale, e.g. / or /members */
  returnPath?: string;
  className?: string;
}) {
  const t = useTranslations("donate");
  const locale = useLocale();
  const { user } = useAuth();
  const [amountEur, setAmountEur] = useState<number>(DONATION_DEFAULT_EUR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDonate(eur: number) {
    setBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const res = await fetch("/api/stripe/donate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amountCents: Math.round(eur * 100),
          locale,
          returnPath,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || t("failed"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
      setBusy(false);
    }
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex flex-col gap-2 ${className}`}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void startDonate(amountEur)}
          className="inline-flex rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-white disabled:opacity-60"
        >
          {busy ? "…" : t("cta")}
        </button>
        {error && <p className="max-w-xs text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {DONATION_PRESETS_EUR.map((eur) => {
          const selected = amountEur === eur;
          return (
            <button
              key={eur}
              type="button"
              disabled={busy}
              onClick={() => setAmountEur(eur)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-accent text-white"
                  : "border border-line bg-white text-ink hover:border-accent"
              }`}
            >
              €{eur}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void startDonate(amountEur)}
        className="mt-5 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "…" : t("ctaAmount", { amount: amountEur })}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
