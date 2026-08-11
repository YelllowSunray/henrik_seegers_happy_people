"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";
import { MembershipPlans } from "@/components/membership-plans";
import {
  hasMembershipAccess,
  hasStripeSubscription,
  isAppTrialActive,
  isAppTrialExpired,
  isActiveSubscription,
  membershipPlanLabel,
  trialDaysLeft,
} from "@/lib/membership";
import { signInHref } from "@/lib/auth-href";

export function SubscriptionPanel() {
  const tr = useTranslations("subscription");
  const tMem = useTranslations("membership");
  const locale = useLocale();
  const search = useSearchParams();
  const { user, profile, isAdmin, refreshProfile, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const status = profile?.subscriptionStatus ?? "none";
  const plan = membershipPlanLabel(profile);
  const stripeSub = hasStripeSubscription(profile);
  const appTrial = isAppTrialActive(profile);
  const trialExpired = isAppTrialExpired(profile);
  const daysLeft = trialDaysLeft(profile);
  const paidActive = stripeSub && isActiveSubscription(status);
  const clubAccess = hasMembershipAccess(profile);

  useEffect(() => {
    if (!user || search.get("checkout") !== "success") return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      setNotice(tr("checkoutSuccess"));
      try {
        const token = await user.getIdToken();
        await fetch("/api/stripe/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) await refreshProfile();
      } catch {
        /* webhook may still catch up */
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, search, refreshProfile, tr]);

  async function openPortal() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || tr("portalError"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("portalError"));
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-ink-soft">…</p>;
  }

  if (!user) {
    return (
      <div className="py-10 text-center">
        <p className="font-display text-3xl">{tr("title")}</p>
        <p className="mt-3 text-ink-soft">{tr("signInHint")}</p>
        <Link
          href={signInHref("/members/subscription")}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          {tr("signIn")}
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {tr("adminEyebrow")}
        </p>
        <h1 className="font-display mt-2 text-4xl md:text-5xl">
          {tr("adminTitle")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          {tr("adminBody")}
        </p>
        <p className="mt-3 text-sm text-ink-soft">{tr("adminNote")}</p>
        <Link
          href="/members"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          {tMem("openClub")}
        </Link>
      </div>
    );
  }

  const statusLabel =
    appTrial && !stripeSub
      ? tr("statusAppTrial", { days: daysLeft ?? 0 })
      : trialExpired
        ? tr("statusTrialEnded")
        : status === "trialing"
          ? tr("statusTrialing")
          : status === "active"
            ? tr("statusActive")
            : status === "past_due"
              ? tr("statusPastDue")
              : status === "canceled"
                ? tr("statusCanceled")
                : tr("statusNone");

  const planLabel =
    plan === "yearly"
      ? tMem("yearlyLabel")
      : plan === "monthly"
        ? tMem("monthlyLabel")
        : null;

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("eyebrow")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{tr("title")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        {appTrial && !stripeSub
          ? tr("leadTrial")
          : trialExpired
            ? tr("leadTrialEnded")
            : tr("lead")}
      </p>

      {notice && (
        <p className="mt-6 border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">
          {syncing ? tr("syncing") : notice}
        </p>
      )}

      <div className="mt-10 border border-line bg-bg-deep/40 p-6 md:p-8">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              {tr("statusLabel")}
            </dt>
            <dd className="font-display mt-2 text-2xl text-ink">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              {tr("planLabel")}
            </dt>
            <dd className="font-display mt-2 text-2xl text-ink">
              {planLabel ?? tr("planNone")}
            </dd>
          </div>
        </dl>

        {paidActive && profile?.email && (
          <p className="mt-6 text-sm text-ink-soft">
            {tr("billedTo", { email: profile.email })}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {stripeSub ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void openPortal()}
              className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
            >
              {busy ? "…" : tr("openPortal")}
            </button>
          ) : null}
          {clubAccess ? (
            <Link
              href="/members"
              className="inline-flex rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:bg-bg"
            >
              {tMem("openClub")}
            </Link>
          ) : null}
        </div>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>

      {!stripeSub && (
        <div className="mt-12">
          <h2 className="font-display text-3xl">{tr("choosePlan")}</h2>
          {appTrial && (
            <p className="mt-2 text-ink-soft">{tr("choosePlanTrialHint")}</p>
          )}
          {trialExpired && (
            <p className="mt-2 text-ink-soft">{tr("choosePlanExpiredHint")}</p>
          )}
          <MembershipPlans className="mt-6" />
        </div>
      )}

      {stripeSub && (
        <p className="mt-8 text-sm text-ink-soft">{tr("portalHint")}</p>
      )}
    </div>
  );
}
