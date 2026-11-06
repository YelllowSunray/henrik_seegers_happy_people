"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { locales } from "@/i18n/locales";
import {
  kickAutoplayForCurrentView,
  markAudioForResumeOnReturn,
  reconcileMusicResumeState,
  resumeMusicAfterNavigation,
  resumeMusicIfNeeded,
  resumeMusicOnPageVisible,
  setAutomaticMusicEnabled,
} from "@/components/synced-lyric-player";

const NAV_PATHS = [
  "/video-bell",
  "/seminars",
  "/vlogs",
  "/blog",
  "/community",
] as const;

function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (maybeLocale && (locales as readonly string[]).includes(maybeLocale)) {
    const rest = `/${parts.slice(2).join("/")}`.replace(/\/$/, "");
    return rest || "/";
  }
  return pathname;
}

/** Pages opened from the main nav. Automatic music stays off here. */
function isNavContentPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  return NAV_PATHS.some((nav) => path === nav || path.startsWith(`${nav}/`));
}

function syncMusicToPath(pathname: string) {
  if (isNavContentPath(pathname)) {
    setAutomaticMusicEnabled(false);
    return;
  }
  setAutomaticMusicEnabled(true);
  reconcileMusicResumeState();
  resumeMusicIfNeeded();
  kickAutoplayForCurrentView();
}

function isInternalLink(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return false;
  if (href.startsWith("tel:")) return false;
  try {
    return new URL(href, window.location.href).origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

function isLeavingSiteLink(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank") return true;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function shouldMarkResumeForLink(anchor: HTMLAnchorElement): boolean {
  return isInternalLink(anchor) || isLeavingSiteLink(anchor);
}

/** Homepage music keeps playing across the site, except on main nav pages. */
export function MusicRoutePersistence() {
  const pathname = usePathname();

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resumeMusicOnPageVisible();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  useEffect(() => {
    const onNavigateIntent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (href) {
        try {
          if (isNavContentPath(new URL(href, window.location.href).pathname)) {
            setAutomaticMusicEnabled(false);
            return;
          }
        } catch {
          /* ignore bad hrefs */
        }
      }
      if (!shouldMarkResumeForLink(anchor)) return;
      markAudioForResumeOnReturn();
    };

    document.addEventListener("click", onNavigateIntent, true);
    document.addEventListener("pointerdown", onNavigateIntent, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchstart", onNavigateIntent, {
      capture: true,
      passive: true,
    });

    const onPopState = () => {
      if (isNavContentPath(window.location.pathname)) {
        setAutomaticMusicEnabled(false);
        return;
      }
      setAutomaticMusicEnabled(true);
      markAudioForResumeOnReturn();
      resumeMusicAfterNavigation();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onNavigateIntent, true);
      document.removeEventListener("pointerdown", onNavigateIntent, true);
      document.removeEventListener("touchstart", onNavigateIntent, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    syncMusicToPath(pathname);
  }, [pathname]);

  return null;
}
