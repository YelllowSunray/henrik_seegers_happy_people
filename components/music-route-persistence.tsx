"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  markAudioForResumeOnReturn,
  resumeMusicAfterNavigation,
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

/** Keep shared music playing across in-app navigation (mobile + desktop). */
export function MusicRoutePersistence() {
  const pathname = usePathname();

  useEffect(() => {
    const onNavigateIntent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalLink(anchor)) return;
      markAudioForResumeOnReturn();
    };

    document.addEventListener("click", onNavigateIntent, true);
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
      document.removeEventListener("touchstart", onNavigateIntent, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    resumeMusicAfterNavigation();
  }, [pathname]);

  return null;
}
