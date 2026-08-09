"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useBillingOverBudget } from "@/components/billing-banner";
import { billingContactMessage } from "@/lib/billing";
import { Link } from "@/i18n/navigation";
import type { MembershipPlan } from "@/lib/stripe";

/** Compact CTA — defaults to monthly plan; full picker is MembershipPlans. */
export function JoinButton({
  label,
  className = "",
  plan = "monthly",
}: {
  label?: string;
  className?: string;
  plan?: MembershipPlan;
}) {
  const t = useTranslations("membership");
  const locale = useLocale();
  const { user, isMember } = useAuth();
  const overBudget = useBillingOverBudget();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cta = label || t("cta");

  if (isMember) {
    return (
      <Link
        href="/members"
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        }
      >
        {t("openClub")}
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth?next=/happy-people"
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        }
      >
        {cta}
      </Link>
    );
  }

  async function startCheckout() {
    if (overBudget) {
      setError(billingContactMessage());
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await user!.getIdToken();
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
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void startCheckout()}
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
        }
      >
        {busy ? "…" : cta}
      </button>
      {error && <p className="max-w-xs text-xs text-red-700">{error}</p>}
    </div>
  );
}
