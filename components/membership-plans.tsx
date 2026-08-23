"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { useBillingOverBudget } from "@/components/billing-banner";
import { billingContactMessage } from "@/lib/billing";
import { Link } from "@/i18n/navigation";
import {
  hasStripeSubscription,
  isAppTrialExpired,
} from "@/lib/membership";
import type { MembershipPlan } from "@/lib/stripe";

export function MembershipPlans({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("membership");
  const locale = useLocale();
  const { user, profile } = useAuth();
  const overBudget = useBillingOverBudget();
  const [busy, setBusy] = useState<MembershipPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trialExpired = isAppTrialExpired(profile);

  // Paid / Stripe trial — manage in portal, not a new checkout.
  if (hasStripeSubscription(profile)) {
    return (
      <div className={className}>
        <Link
          href="/members/subscription"
          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          {t("manageSubscription")}
        </Link>
      </div>
    );
  }

  async function startCheckout(plan: MembershipPlan) {
    if (!user) return;
    if (overBudget) {
      setError(billingContactMessage());
      return;
    }
    setBusy(plan);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, locale }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  }

  const registerHref = "/join?next=/members/onboarding";

  return (
    <div className={className}>
      {trialExpired ? (
        <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">
          {t("trialEnded")}
        </p>
      ) : t.has("trialTitle") ? (
        <>
          <p className="font-display text-2xl text-ink">{t("trialTitle")}</p>
          {t.has("trialIntro") ? (
            <p className="mt-2 text-base text-ink-soft">{t("trialIntro")}</p>
          ) : null}
          <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-gold uppercase">
            {t("trial")}
          </p>
          {t.has("trialSteps") ? (
            <ul className="mt-3 max-w-xl space-y-1 text-base text-ink-soft">
              {(t.raw("trialSteps") as string[]).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">
          {t("trial")}
        </p>
      )}
      <p className="mt-3 max-w-xl text-ink-soft">
        {trialExpired ? t("trialEndedLead") : t("noObligation")}
      </p>

      <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
        <PlanCard
          eyebrow={t("monthlyLabel")}
          price={t("priceMonthly")}
          detail={trialExpired ? t("monthlyDetailNow") : t("monthlyDetail")}
          cta={user ? t("ctaMonthly") : t("cta")}
          href={user ? undefined : registerHref}
          busy={busy === "monthly"}
          onClick={user ? () => void startCheckout("monthly") : undefined}
          featured={false}
        />
        <PlanCard
          eyebrow={t("yearlyLabel")}
          price={t("priceYearly")}
          detail={trialExpired ? t("yearlyDetailNow") : t("yearlyDetail")}
          badge={t("yearlySave")}
          cta={user ? t("ctaYearly") : t("cta")}
          href={user ? undefined : registerHref}
          busy={busy === "yearly"}
          onClick={user ? () => void startCheckout("yearly") : undefined}
          featured
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function PlanCard({
  eyebrow,
  price,
  detail,
  badge,
  cta,
  href,
  busy,
  onClick,
  featured,
}: {
  eyebrow: string;
  price: string;
  detail: string;
  badge?: string;
  cta: string;
  href?: string;
  busy?: boolean;
  onClick?: () => void;
  featured: boolean;
}) {
  const shell = featured
    ? "border-accent bg-accent/5 shadow-sm"
    : "border-line bg-bg/80";

  return (
    <div className={`flex h-full flex-col border p-6 ${shell}`}>
      <div className="flex min-h-[1.75rem] flex-wrap items-center gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          {eyebrow}
        </p>
        {badge && (
          <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink uppercase">
            {badge}
          </span>
        )}
      </div>
      <p className="font-display mt-3 text-3xl text-ink">{price}</p>
      <p className="mt-2 text-sm text-ink-soft">{detail}</p>
      <div className="mt-auto pt-8">
        {href ? (
          <Link
            href={href}
            className="inline-flex w-full justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
          >
            {cta}
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onClick}
            className="inline-flex w-full justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
          >
            {busy ? "…" : cta}
          </button>
        )}
      </div>
    </div>
  );
}
