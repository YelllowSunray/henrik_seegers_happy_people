"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  BILLING_CONTACT,
  BILLING_LIMIT_EUR,
  DEFAULT_BILLING_STATE,
  billingContactMessage,
  parseBillingDoc,
  type BillingState,
} from "@/lib/billing";

export function useBillingState(): BillingState {
  const [state, setState] = useState<BillingState>(DEFAULT_BILLING_STATE);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onSnapshot(
      doc(getClientDb(), "system", "billing"),
      (snap) => {
        setState(parseBillingDoc(snap.data() as Record<string, unknown>));
      },
      () => setState(DEFAULT_BILLING_STATE),
    );
    return () => unsub();
  }, []);

  return state;
}

export function useBillingOverBudget() {
  return useBillingState().overBudget;
}

export function BillingBanner({ force }: { force?: boolean }) {
  const live = useBillingOverBudget();
  const overBudget = force ?? live;
  if (!overBudget) return null;

  return (
    <div className="border-b border-red-900/20 bg-red-50 px-5 py-3 text-sm text-red-950">
      <p className="font-semibold">
        Firebase budget (€{BILLING_LIMIT_EUR}) reached
      </p>
      <p className="mt-1">
        {billingContactMessage()} Reach{" "}
        <a className="underline" href={`mailto:${BILLING_CONTACT.email}`}>
          {BILLING_CONTACT.email}
        </a>{" "}
        or{" "}
        <a className="underline" href={`tel:${BILLING_CONTACT.phone}`}>
          {BILLING_CONTACT.phoneDisplay}
        </a>
        .
      </p>
    </div>
  );
}

/** Compact spend meter for the admin portal. */
export function AdminBillingUsage() {
  const billing = useBillingState();
  const limit = billing.limitEur || BILLING_LIMIT_EUR;
  const percent =
    billing.percentUsed ??
    (billing.spentEur != null
      ? Math.round((billing.spentEur / limit) * 1000) / 10
      : null);
  const bar = Math.min(100, Math.max(0, percent ?? 0));
  const spentLabel =
    billing.spentEur != null
      ? `€${billing.spentEur.toFixed(billing.spentEur % 1 === 0 ? 0 : 2)}`
      : "—";
  const tone = billing.overBudget
    ? "border-red-900/25 bg-red-50 text-red-950"
    : percent != null && percent >= 80
      ? "border-gold/50 bg-gold/10 text-ink"
      : "border-line bg-bg-deep/50 text-ink";

  return (
    <div className={`mt-5 border px-4 py-4 sm:px-5 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-80">
            Firebase usage
          </p>
          <p className="font-display mt-1 text-2xl">
            {spentLabel}{" "}
            <span className="text-base font-sans font-normal opacity-70">
              / €{limit}
            </span>
          </p>
          <p className="mt-1 text-sm opacity-80">
            {billing.overBudget
              ? "Budget reached — writes are blocked. Contact Samir to raise the limit."
              : percent == null
                ? "Spend updates when Google Cloud budget alerts fire (50% / 90% / 100%)."
                : `${percent}% of the €${limit} monthly Firebase budget used.`}
          </p>
        </div>
        {percent != null && (
          <p className="text-sm font-semibold tabular-nums">{percent}%</p>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full transition-all ${
            billing.overBudget
              ? "bg-red-700"
              : percent != null && percent >= 80
                ? "bg-amber-700"
                : "bg-accent"
          }`}
          style={{ width: `${percent == null ? 0 : bar}%` }}
        />
      </div>
      {billing.updatedAt && (
        <p className="mt-2 text-xs opacity-60">
          Updated {new Date(billing.updatedAt).toLocaleString()}
        </p>
      )}
      <p className="mt-2 text-xs opacity-70">
        Contact{" "}
        <a className="underline" href={`mailto:${BILLING_CONTACT.email}`}>
          {BILLING_CONTACT.name}
        </a>{" "}
        ({BILLING_CONTACT.email} / {BILLING_CONTACT.phoneDisplay}) to change the
        limit.
      </p>
    </div>
  );
}
