import { defineRouting } from "next-intl/routing";
import { locales } from "./locales";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "nl",
  localePrefix: "always",
  // Always open in Dutch unless the URL already has another locale (/en, …).
  localeDetection: false,
});

export type { Locale } from "./locales";
