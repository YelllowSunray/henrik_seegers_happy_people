"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SEMINAR_TICKET_EUR } from "@/lib/stripe-constants";

export function SeminarTicketButton({
  eventId,
  eventTitle,
  eventMeta,
  returnPath = "/seminars",
  /** When true, skip repeating title/date (already shown above). */
  compact = false,
  className = "",
}: {
  eventId?: string;
  eventTitle: string;
  /** e.g. "2026-08-13 · 14:00-17:00 · Almere" */
  eventMeta?: string;
  returnPath?: string;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("seminars");
  const locale = useLocale();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyTicket() {
    setBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const res = await fetch("/api/stripe/seminar-ticket", {
        method: "POST",
        headers,
        body: JSON.stringify({
          locale,
          returnPath,
          eventId,
          eventTitle,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || t("ticketFailed"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ticketFailed"));
      setBusy(false);
    }
  }

  return (
    <div
      className={`border border-accent/25 bg-accent/[0.06] px-4 py-4 sm:px-5 sm:py-5 ${className}`}
    >
      {!compact && (
        <>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            {t("ticketForThis")}
          </p>
          <p className="font-display mt-2 text-xl leading-snug text-ink sm:text-2xl">
            {eventTitle}
          </p>
          {eventMeta ? (
            <p className="mt-1 text-sm text-ink-soft">{eventMeta}</p>
          ) : null}
        </>
      )}
      {compact && (
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          {t("ticketForThis")}
        </p>
      )}
      <p
        className={`font-display text-ink ${
          compact ? "mt-2 text-2xl" : "mt-4 text-3xl"
        }`}
      >
        €{SEMINAR_TICKET_EUR}
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        {t("ticketNote")}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void buyTicket()}
        className={`inline-flex rounded-full bg-accent text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60 ${
          compact ? "mt-4 px-4 py-2.5" : "mt-5 px-6 py-3"
        }`}
      >
        {busy
          ? "…"
          : compact
            ? t("buyTicket")
            : t("buyTicketFor", { title: eventTitle })}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
