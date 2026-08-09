export const locales = ["nl", "en", "de", "es", "it", "fr", "ko"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<
  Locale,
  { short: string; native: string }
> = {
  nl: { short: "NL", native: "Nederlands" },
  en: { short: "EN", native: "English" },
  de: { short: "DE", native: "Deutsch" },
  es: { short: "ES", native: "Español" },
  it: { short: "IT", native: "Italiano" },
  fr: { short: "FR", native: "Français" },
  ko: { short: "KO", native: "한국어" },
};
