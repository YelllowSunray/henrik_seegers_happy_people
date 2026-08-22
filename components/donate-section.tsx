"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LightboxImage } from "@/components/lightbox-image";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import {
  DONATION_DEFAULT_EUR,
  DONATION_PRESETS_EUR,
} from "@/lib/stripe-constants";

export function DonateSection() {
  const t = useTranslations("donate");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [amountEur, setAmountEur] = useState<number>(DONATION_DEFAULT_EUR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanksVisible, setThanksVisible] = useState(
    searchParams.get("donate") === "success",
  );

  async function startDonate() {
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
          amountCents: Math.round(amountEur * 100),
          locale,
          returnPath: "/",
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

  return (
    <>
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        {thanksVisible && (
          <div className="mb-8 border border-accent/35 bg-accent/10 px-5 py-4">
            <p className="text-sm font-semibold text-accent">{t("thanks")}</p>
            <button
              type="button"
              onClick={() => setThanksVisible(false)}
              className="mt-2 text-sm text-ink-soft underline-offset-2 hover:underline"
            >
              OK
            </button>
          </div>
        )}

        <p className="text-sm font-semibold tracking-[0.18em] text-gold uppercase md:text-base">
          {t("eyebrow")}
        </p>
        <h2
          id="donate-title"
          className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
        >
          {t("title")}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
          {t("lead")}
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink md:text-lg">
          {t("body")}
        </p>

        <p className="mt-8 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">
          {t("chooseAmount")}
        </p>
        <div
          className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
          role="radiogroup"
          aria-label={t("chooseAmount")}
        >
          {DONATION_PRESETS_EUR.map((eur) => {
            const selected = amountEur === eur;
            return (
              <button
                key={eur}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy}
                onClick={() => setAmountEur(eur)}
                className={`relative flex min-h-[4.5rem] flex-col items-center justify-center border px-3 py-4 transition ${
                  selected
                    ? "border-accent bg-accent text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                    : "border-line bg-bg/70 text-ink hover:border-accent/50 hover:bg-bg"
                }`}
              >
                <span className="font-display text-2xl tracking-tight">
                  €{eur}
                </span>
                {selected && (
                  <span className="mt-1 text-[10px] font-semibold tracking-wide uppercase opacity-90">
                    {t("selected")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startDonate()}
            className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
          >
            {busy ? "…" : t("ctaAmount", { amount: amountEur })}
          </button>
          <p className="max-w-xs text-xs leading-relaxed text-ink-soft">
            {t("secureNote")}
          </p>
        </div>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-8 w-full">
          <SyncedLyricPlayer
            audioSrc="/audio/if-you-dont-know.mp3"
            lrcSrc="/audio/if-you-dont-know.lrc"
            title="If You Don't Know Me By Now"
            artist="Simply Red"
            tone="page"
            handoffAnchorId="donate-title"
          />
        </div>
      </div>

      <aside className="relative overflow-hidden">
        <LightboxImage
          src="/images/IMG_1478.jpg"
          alt={t("imageAlt")}
          className="aspect-[4/5] min-h-[18rem] w-full sm:min-h-[22rem]"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-8"
          style={{
            background:
              "linear-gradient(to top, rgba(15,40,36,0.88) 0%, rgba(15,40,36,0.35) 55%, transparent 100%)",
          }}
        >
          <p className="font-display text-xl leading-snug text-white md:text-2xl">
            {t("asideQuote")}
          </p>
          <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-gold uppercase">
            {t("asideCredit")}
          </p>
        </div>
      </aside>
    </div>
    </>
  );
}
