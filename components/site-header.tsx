"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

const navKeys = [
  ["about", "/over-henk"],
  ["seminars", "/seminars"],
  ["blog", "/blog"],
  ["membership", "/happy-people"],
  ["contact", "/contact"],
] as const;

export function SiteHeader({ variant = "hero" }: { variant?: "hero" | "solid" }) {
  const t = useTranslations("nav");
  const { user, isMember, signOut, loading } = useAuth();
  const onHero = variant === "hero";

  return (
    <header
      className={
        onHero
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link
          href="/"
          className={`font-display text-xl tracking-tight md:text-2xl ${
            onHero ? "text-white drop-shadow" : "text-ink"
          }`}
        >
          Happy People
        </Link>

        <nav
          className={`hidden items-center gap-6 text-sm lg:flex ${
            onHero ? "text-white/90" : "text-ink-soft"
          }`}
        >
          {navKeys.map(([key, href]) => (
            <Link key={key} href={href} className="opacity-90 transition hover:opacity-100">
              {t(key)}
            </Link>
          ))}
          {isMember && (
            <Link href="/members" className="transition hover:opacity-100">
              {t("members")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher variant={variant} />

          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className={`hidden rounded-full px-3 py-1.5 text-xs sm:inline ${
                  onHero
                    ? "border border-white/30 text-white"
                    : "border border-line text-ink"
                }`}
              >
                {t("signOut")}
              </button>
            ) : (
              <Link
                href="/auth"
                className={`hidden rounded-full px-3 py-1.5 text-xs sm:inline ${
                  onHero
                    ? "border border-white/30 text-white"
                    : "border border-line text-ink"
                }`}
              >
                {t("signIn")}
              </Link>
            ))}

          <Link
            href="/happy-people"
            className="rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-soft"
          >
            {t("join")}
          </Link>
        </div>
      </div>
    </header>
  );
}
