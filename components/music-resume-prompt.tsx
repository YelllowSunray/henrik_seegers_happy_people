"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  resumeMusicFromUserGesture,
  subscribeResumePrompt,
} from "@/components/synced-lyric-player";

/** Shown when iOS pauses music after opening YouTube — one tap resumes. */
export function MusicResumePrompt() {
  const t = useTranslations("music");
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeResumePrompt(setVisible), []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onPointerDown={() => resumeMusicFromUserGesture()}
      onClick={() => resumeMusicFromUserGesture()}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/40 bg-bg/95 px-4 py-2.5 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition hover:border-accent/60 hover:bg-bg"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-current">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </span>
      {t("resumePrompt")}
    </button>
  );
}
