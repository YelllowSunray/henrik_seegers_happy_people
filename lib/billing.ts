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
  updatedAt?: string;
};

export const DEFAULT_BILLING_STATE: BillingState = {
  overBudget: false,
  limitEur: BILLING_LIMIT_EUR,
};

export function billingContactMessage() {
  return `Firebase spend limit (€${BILLING_LIMIT_EUR}) reached. Contact ${BILLING_CONTACT.name} at ${BILLING_CONTACT.email} or ${BILLING_CONTACT.phone} to increase spend.`;
}
