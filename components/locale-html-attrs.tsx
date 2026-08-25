"use client";

import { useEffect } from "react";
import { rtlLocales, type Locale } from "@/i18n/locales";

/** Keep <html lang/dir> in sync with the active locale (root layout is shared). */
export function LocaleHtmlAttrs({ locale }: { locale: string }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = rtlLocales.has(locale as Locale) ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
