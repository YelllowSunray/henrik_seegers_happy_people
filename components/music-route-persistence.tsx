"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  markAudioForResumeOnReturn,
  reconcileMusicResumeState,
  resumeMusicAfterNavigation,
  resumeMusicIfNeeded,
  resumeMusicOnPageVisible,
} from "@/components/synced-lyric-player";

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

/** Keep shared music playing across in-app navigation (mobile + desktop). */
export function MusicRoutePersistence() {
  const pathname = usePathname();

  useEffect(() => {
    reconcileMusicResumeState();
    resumeMusicIfNeeded();
  }, []);

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
    reconcileMusicResumeState();
    resumeMusicIfNeeded();
  }, [pathname]);

  return null;
}
