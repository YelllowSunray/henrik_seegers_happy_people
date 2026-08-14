/** Shared Stripe/membership constants safe for client + server. */
export const TRIAL_DAYS = 7;

export const DONATION_PRESETS_EUR = [5, 10, 25, 50] as const;
export const DONATION_DEFAULT_EUR = 10;
export const DONATION_MIN_CENTS = 200;
export const DONATION_MAX_CENTS = 50_000;

/** Live seminar ticket (one-time). */
export const SEMINAR_TICKET_EUR = 1500;
export const SEMINAR_TICKET_CENTS = SEMINAR_TICKET_EUR * 100;
