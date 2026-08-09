"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { getVideosByKind, quotes, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function MembersHomePage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;
  const { user, profile } = useAuth();
  const latestSeminar = getVideosByKind("seminar")[0];
  const latestVlog = getVideosByKind("vlog")[0];
  const latestQuote = quotes[0];

  async function openPortal() {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">{tr("welcome")}</p>
      <h1 className="font-display mt-1 text-4xl">{tr("hub")}</h1>
      <p className="mt-2 text-sm text-ink-soft">{profile?.email}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {latestSeminar && (
          <Link
            href="/members/seminars"
            className="border border-line bg-bg/70 p-6 transition hover:border-accent"
          >
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {tr("continue")}
            </p>
            <h2 className="font-display mt-2 text-2xl">
              {t(latestSeminar.title, locale)}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {latestSeminar.durationLabel}
            </p>
          </Link>
        )}
        {latestVlog && (
          <Link
            href="/members/vlogs"
            className="border border-line bg-bg/70 p-6 transition hover:border-accent"
          >
            <p className="text-xs font-semibold tracking-wider text-gold uppercase">
              {tr("vlogs")}
            </p>
            <h2 className="font-display mt-2 text-2xl">
              {t(latestVlog.title, locale)}
            </h2>
          </Link>
        )}
        {latestQuote && (
          <Link
            href="/members/quotes"
            className="border border-line bg-bg/70 p-6 md:col-span-2"
          >
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {tr("quotes")}
            </p>
            <p className="font-display mt-3 text-2xl leading-snug">
              “{t(latestQuote.text, locale)}”
            </p>
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => void openPortal()}
        className="mt-10 text-sm text-accent underline-offset-4 hover:underline"
      >
        {tr("manageBilling")}
      </button>
    </div>
  );
}
