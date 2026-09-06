import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { locales, type Locale } from "@/i18n/locales";

export const SITE_NAME = "Happy People";
export const DEFAULT_OG_IMAGE = "/images/boodschap.jpg";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3002";
}

/** Path without locale prefix, e.g. `/blog/my-post` or `/`. */
export function localizedUrl(locale: string, pathname = "/"): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return `${getSiteUrl()}/${locale}`;
  return `${getSiteUrl()}/${locale}${path}`;
}

export function buildLanguageAlternates(pathname = "/") {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = localizedUrl(locale, pathname);
  }
  languages["x-default"] = localizedUrl(routing.defaultLocale, pathname);
  return languages;
}

type PageSeoOptions = {
  locale: Locale;
  pathname?: string;
  title: string;
  description: string;
  noIndex?: boolean;
  ogImage?: string;
  type?: "website" | "article";
};

export function buildPageMetadata({
  locale,
  pathname = "/",
  title,
  description,
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE,
  type = "website",
}: PageSeoOptions): Metadata {
  const canonical = localizedUrl(locale, pathname);
  const imageUrl = ogImage.startsWith("http")
    ? ogImage
    : `${getSiteUrl()}${ogImage}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: buildLanguageAlternates(pathname),
    },
    openGraph: {
      type,
      locale,
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export const PUBLIC_ROUTES = [
  "/",
  "/over-henk",
  "/ontmoeting",
  "/boodschap",
  "/seminars",
  "/blog",
  "/happy-people",
  "/join",
] as const;
