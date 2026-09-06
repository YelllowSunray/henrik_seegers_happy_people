"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  resumeMusicFromUserGesture,
  resumeMusicOnPageVisible,
  subscribeResumePrompt,
} from "@/components/synced-lyric-player";

/** Shown when iOS pauses music after opening YouTube — one tap resumes. */
export function MusicResumePrompt() {
  const t = useTranslations("music");
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeResumePrompt(setVisible), []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resumeMusicOnPageVisible();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        resumeMusicFromUserGesture();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        resumeMusicFromUserGesture();
      }}
      className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[9998] flex max-w-[min(92vw,22rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-accent/50 bg-bg px-4 py-3 text-sm font-semibold text-ink shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-accent/70 hover:bg-bg active:scale-[0.98]"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-current">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </span>
      <span className="text-left leading-snug">{t("resumePrompt")}</span>
    </button>
  );
}
