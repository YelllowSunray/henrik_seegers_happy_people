import { defineRouting } from "next-intl/routing";
import { locales } from "./locales";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "nl",
  localePrefix: "always",
});

export type { Locale } from "./locales";
