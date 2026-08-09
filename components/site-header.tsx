"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={
        onHero
          ? "absolute inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]"
          : "sticky top-0 z-40 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:gap-5 sm:py-6 md:px-8">
        <Link
          href="/"
          className={`font-display shrink-0 text-xl tracking-tight sm:text-2xl md:text-3xl ${
            onHero ? "text-white drop-shadow" : "text-ink"
          }`}
        >
          Happy People
        </Link>

        <nav
          className={`hidden items-center gap-7 text-base font-medium lg:flex ${
            onHero ? "text-white drop-shadow-sm" : "text-ink"
          }`}
        >
          {navKeys.map(([key, href]) => (
            <Link
              key={key}
              href={href}
              className="opacity-95 transition hover:opacity-100"
            >
              {t(key)}
            </Link>
          ))}
          {isMember && (
            <Link href="/members" className="transition hover:opacity-100">
              {t("members")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3.5">
          <LanguageSwitcher variant={variant} />

          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className={`hidden rounded-full px-4 py-2 text-sm font-medium lg:inline ${
                  onHero
                    ? "border border-white/35 text-white"
                    : "border border-line text-ink"
                }`}
              >
                {t("signOut")}
              </button>
            ) : (
              <Link
                href="/auth"
                className={`hidden rounded-full px-4 py-2 text-sm font-medium lg:inline ${
                  onHero
                    ? "border border-white/35 text-white"
                    : "border border-line text-ink"
                }`}
              >
                {t("signIn")}
              </Link>
            ))}

          <Link
            href="/happy-people"
            className="hidden rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-soft sm:inline-flex sm:px-4.5 sm:py-2.5"
          >
            {t("join")}
          </Link>

          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden ${
              onHero
                ? "border-white/35 text-white"
                : "border-line text-ink"
            }`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(100%,22rem)] flex-col bg-bg pt-[env(safe-area-inset-top)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="font-display text-xl text-ink">Happy People</p>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {navKeys.map(([key, href]) => (
                <Link
                  key={key}
                  href={href}
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-ink transition hover:bg-bg-deep"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(key)}
                </Link>
              ))}
              {isMember && (
                <Link
                  href="/members"
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-ink transition hover:bg-bg-deep"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("members")}
                </Link>
              )}
            </nav>

            <div className="flex flex-col gap-3 border-t border-line px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {!loading &&
                (user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="rounded-full border border-line px-4 py-3 text-center text-base font-medium text-ink"
                  >
                    {t("signOut")}
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="rounded-full border border-line px-4 py-3 text-center text-base font-medium text-ink"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("signIn")}
                  </Link>
                ))}
              <Link
                href="/happy-people"
                className="rounded-full bg-accent px-4 py-3 text-center text-base font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                {t("join")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
