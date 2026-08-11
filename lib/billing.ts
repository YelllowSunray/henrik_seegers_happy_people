export const BILLING_LIMIT_EUR = 100;

export const BILLING_CONTACT = {
  name: "Samir Iyer",
  email: "samir@samirdev.com",
  phone: "+31 687343078",
  phoneDisplay: "+31 6 8734 3078",
} as const;

export type BillingState = {
  overBudget: boolean;
  limitEur: number;
  /** Latest known spend from GCP budget alerts (may lag). */
  spentEur: number | null;
  /** 0–100+ from alerts when available. */
  percentUsed: number | null;
  updatedAt?: string;
};

export const DEFAULT_BILLING_STATE: BillingState = {
  overBudget: false,
  limitEur: BILLING_LIMIT_EUR,
  spentEur: null,
  percentUsed: null,
};

export function billingContactMessage() {
  return `Firebase spend limit (€${BILLING_LIMIT_EUR}) reached. Contact ${BILLING_CONTACT.name} at ${BILLING_CONTACT.email} or ${BILLING_CONTACT.phone} to increase spend.`;
}

export function parseBillingDoc(
  data: Record<string, unknown> | undefined | null,
): BillingState {
  if (!data) return { ...DEFAULT_BILLING_STATE };

  const limitEur =
    typeof data.limitEur === "number" && data.limitEur > 0
      ? data.limitEur
      : BILLING_LIMIT_EUR;

  let spentEur: number | null =
    typeof data.spentEur === "number" && Number.isFinite(data.spentEur)
      ? data.spentEur
      : null;

  const lastAlert =
    data.lastAlert && typeof data.lastAlert === "object"
      ? (data.lastAlert as Record<string, unknown>)
      : null;
  if (
    spentEur == null &&
    lastAlert &&
    typeof lastAlert.costAmount === "number" &&
    Number.isFinite(lastAlert.costAmount)
  ) {
    spentEur = lastAlert.costAmount;
  }

  let percentUsed: number | null =
    typeof data.percentUsed === "number" && Number.isFinite(data.percentUsed)
      ? data.percentUsed
      : null;
  if (percentUsed == null && spentEur != null) {
    percentUsed = Math.round((spentEur / limitEur) * 1000) / 10;
  }
  if (
    percentUsed == null &&
    lastAlert &&
    typeof lastAlert.costAmount === "number" &&
    typeof lastAlert.budgetAmount === "number" &&
    lastAlert.budgetAmount > 0
  ) {
    percentUsed =
      Math.round((lastAlert.costAmount / lastAlert.budgetAmount) * 1000) / 10;
  }

  return {
    overBudget: Boolean(data.overBudget),
    limitEur,
    spentEur,
    percentUsed,
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}
