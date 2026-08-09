"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  BILLING_CONTACT,
  BILLING_LIMIT_EUR,
  billingContactMessage,
} from "@/lib/billing";

export function useBillingOverBudget() {
  const [overBudget, setOverBudget] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onSnapshot(
      doc(getClientDb(), "system", "billing"),
      (snap) => {
        setOverBudget(Boolean(snap.data()?.overBudget));
      },
      () => setOverBudget(false),
    );
    return () => unsub();
  }, []);

  return overBudget;
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
