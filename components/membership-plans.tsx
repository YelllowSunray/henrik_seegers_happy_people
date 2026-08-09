"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { useBillingOverBudget } from "@/components/billing-banner";
import { billingContactMessage } from "@/lib/billing";
import { Link } from "@/i18n/navigation";
import type { MembershipPlan } from "@/lib/stripe";

export function MembershipPlans({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("membership");
  const locale = useLocale();
  const { user, isMember } = useAuth();
  const overBudget = useBillingOverBudget();
  const [busy, setBusy] = useState<MembershipPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isMember) {
    return (
      <div className={className}>
        <Link
          href="/members"
          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          {t("openClub")}
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

  const authHref = "/auth?next=/happy-people";

  return (
    <div className={className}>
      <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">
        {t("trial")}
      </p>
      <p className="mt-2 max-w-xl text-ink-soft">{t("noObligation")}</p>

      <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
        <PlanCard
          eyebrow={t("monthlyLabel")}
          price={t("priceMonthly")}
          detail={t("monthlyDetail")}
          cta={user ? t("ctaMonthly") : t("cta")}
          href={user ? undefined : authHref}
          busy={busy === "monthly"}
          onClick={user ? () => void startCheckout("monthly") : undefined}
          featured={false}
        />
        <PlanCard
          eyebrow={t("yearlyLabel")}
          price={t("priceYearly")}
          detail={t("yearlyDetail")}
          badge={t("yearlySave")}
          cta={user ? t("ctaYearly") : t("cta")}
          href={user ? undefined : authHref}
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
