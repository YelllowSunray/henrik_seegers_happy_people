"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeaderBackButton } from "@/components/smart-back-button";
import { SeminarPromoBar } from "@/components/seminar-promo";

const navKeys = [
  ["about", "/over-henk"],
  ["meeting", "/ontmoeting"],
  ["seminars", "/seminars"],
  ["blog", "/blog"],
] as const;

export function SiteHeader({ variant = "hero" }: { variant?: "hero" | "solid" }) {
  const t = useTranslations("nav");
  const { user, isMember, isAdmin, signOut, loading } = useAuth();
  const onHero = variant === "hero";
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const showJoin = !isMember;

  // Light-on-dark chrome: hero at top, or after scroll on any page.
  const darkChrome = onHero || scrolled || menuOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const linkTone = darkChrome
    ? "text-white/90 hover:text-white"
    : "text-ink-soft hover:text-ink";

  const mobileMenu =
    menuOpen && mounted
      ? createPortal(
          <div
            id="mobile-nav"
            className="fixed inset-0 z-[200] flex flex-col bg-black text-white lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <p className="font-display text-xl text-white">Happy People</p>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-white"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
              {navKeys.map(([key, href]) => (
                <Link
                  key={key}
                  href={href}
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(key)}
                </Link>
              ))}
              {!isMember && (
                <Link
                  href="/happy-people"
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("membership")}
                </Link>
              )}
              {isMember && (
                <Link
                  href="/members"
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("members")}
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-3.5 text-lg font-medium text-gold transition hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("admin")}
                </Link>
              )}
            </nav>

            <div className="flex flex-col gap-3 border-t border-white/15 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {!loading &&
                (user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="rounded-full border border-white/35 px-4 py-3 text-center text-base font-medium text-white"
                  >
                    {t("signOut")}
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="rounded-full border border-white/35 px-4 py-3 text-center text-base font-medium text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("signIn")}
                  </Link>
                ))}
              {showJoin && (
                <Link
                  href="/join?next=/members/onboarding"
                  className="rounded-full bg-accent px-4 py-3 text-center text-base font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("join")}
                </Link>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled || menuOpen
            ? "border-b border-white/10 bg-black/95 backdrop-blur-md"
            : onHero
              ? "border-b border-transparent bg-transparent"
              : "border-b border-line bg-bg/90 backdrop-blur"
        }`}
      >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-4 md:gap-4 md:px-8 lg:gap-6">
        <HeaderBackButton dark={darkChrome} />
        <Link
          href="/"
          className={`font-display shrink-0 text-xl tracking-tight sm:text-2xl ${
            darkChrome ? "text-white drop-shadow" : "text-ink"
          }`}
        >
          Happy People
        </Link>

          <nav
            className={`hidden min-w-0 flex-1 items-center justify-center gap-5 text-sm font-medium whitespace-nowrap xl:gap-6 xl:text-[0.95rem] lg:flex ${
              darkChrome ? "text-white drop-shadow-sm" : "text-ink"
            }`}
          >
            {navKeys.map(([key, href]) => (
              <Link key={key} href={href} className={`transition ${linkTone}`}>
                {t(key)}
              </Link>
            ))}
            {!isMember && (
              <Link href="/happy-people" className={`transition ${linkTone}`}>
                {t("membership")}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {isMember && (
              <Link
                href="/members"
                className={`hidden text-sm font-medium transition lg:inline ${linkTone}`}
              >
                {t("members")}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`hidden text-sm font-semibold transition lg:inline ${
                  darkChrome
                    ? "text-gold hover:text-white"
                    : "text-accent hover:text-accent-soft"
                }`}
              >
                {t("admin")}
              </Link>
            )}

            <LanguageSwitcher variant={darkChrome ? "hero" : "solid"} />

            {!loading &&
              (user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className={`hidden text-sm font-medium transition lg:inline ${linkTone}`}
                >
                  {t("signOut")}
                </button>
              ) : (
                <Link
                  href="/auth"
                  className={`hidden text-sm font-medium transition lg:inline ${linkTone}`}
                >
                  {t("signIn")}
                </Link>
              ))}

            {showJoin && (
              <Link
                href="/join?next=/members/onboarding"
                className="hidden rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-soft sm:inline-flex"
              >
                {t("join")}
              </Link>
            )}

            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border lg:hidden ${
                darkChrome
                  ? "border-white/35 text-white"
                  : "border-line text-ink"
              }`}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <SeminarPromoBar onHero={onHero} scrolled={scrolled || menuOpen} />
      </header>

      {mobileMenu}

      {!onHero && (
        <div
          className="shrink-0 pt-[env(safe-area-inset-top)]"
          aria-hidden
        >
          <div className="h-[calc(4.25rem+var(--seminar-promo-h,0px))]" />
        </div>
      )}
    </>
  );
}
