"use client";

import { useEffect, useRef, useState } from "react";
import {
  activeLyricIndex,
  parseLrc,
  type LyricLine,
} from "@/lib/microchip-lyrics";

const VISIBLE_LINES = 4;

type PlayerEntry = {
  root: HTMLElement;
  audio: HTMLAudioElement;
};

/** All mounted lyric players — hand off when a widget reaches the top of the viewport. */
const players = new Map<HTMLAudioElement, PlayerEntry>();
let handoffTimer: ReturnType<typeof setTimeout> | null = null;
let activeFocus: HTMLAudioElement | null = null;
/** Set after the user taps play once — required for iOS programmatic play. */
let mediaUnlocked = false;
/** Cleared when the user pauses — scroll handoff stays off until they press play again. */
let scrollHandoffEnabled = true;
let scrollListening = false;
let returnResumeListening = false;
/** Audio to resume after the user returns from another tab (e.g. YouTube). */
let resumeOnReturnAudio: HTMLAudioElement | null = null;

function anyPlaying(): HTMLAudioElement | null {
  for (const audio of players.keys()) {
    if (!audio.paused) return audio;
  }
  return null;
}

/** Line from viewport top where a widget counts as “at the top” (below sticky header). */
function handoffLine() {
  return Math.min(140, Math.max(88, window.innerHeight * 0.12));
}

/**
 * Player whose widget currently owns the top of the viewport.
 */
function pickTopWidget(): HTMLAudioElement | null {
  const line = handoffLine();
  let best: HTMLAudioElement | null = null;
  let bestTop = Infinity;

  for (const [audio, entry] of players) {
    const rect = entry.root.getBoundingClientRect();
    // Widget still below the handoff line.
    if (rect.top > line) continue;
    // Widget scrolled well past the top.
    if (rect.bottom < line * 0.35) continue;

    if (rect.top < bestTop) {
      bestTop = rect.top;
      best = audio;
    }
  }
  return best;
}

async function playWithUnlock(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play();
    mediaUnlocked = true;
    return true;
  } catch {
    // iOS often blocks unmuted programmatic play; muted→unmute unlocks it.
    try {
      audio.muted = true;
      await audio.play();
      audio.muted = false;
      mediaUnlocked = true;
      return true;
    } catch {
      try {
        audio.muted = false;
      } catch {
        /* ignore */
      }
      return false;
    }
  }
}

function scheduleHandoff() {
  if (handoffTimer) clearTimeout(handoffTimer);
  handoffTimer = setTimeout(() => {
    handoffTimer = null;
    void runHandoff();
  }, 60);
}

async function runHandoff() {
  // Never autoplay until the user has pressed play, and not while they have paused.
  if (!mediaUnlocked || !scrollHandoffEnabled) {
    return;
  }

  const playing = anyPlaying();
  const focus = pickTopWidget();

  if (!focus) {
    if (!playing) activeFocus = null;
    return;
  }

  if (focus === playing) {
    activeFocus = focus;
    return;
  }

  if (activeFocus === focus && playing) return;

  const ok = await playWithUnlock(focus);
  if (!ok) {
    activeFocus = playing;
    return;
  }
  activeFocus = focus;
  if (playing && playing !== focus) playing.pause();
  for (const other of players.keys()) {
    if (other !== focus && !other.paused) other.pause();
  }
}

function ensureScrollListening() {
  if (scrollListening || typeof window === "undefined") return;
  scrollListening = true;
  const onScroll = () => scheduleHandoff();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

function captureResumeCandidate() {
  if (!scrollHandoffEnabled) {
    resumeOnReturnAudio = null;
    return;
  }
  const playing = anyPlaying();
  if (playing) {
    resumeOnReturnAudio = playing;
    return;
  }
  if (activeFocus && activeFocus.currentTime > 0 && !activeFocus.ended) {
    resumeOnReturnAudio = activeFocus;
  }
}

async function tryResumeAfterReturn() {
  if (!scrollHandoffEnabled || !resumeOnReturnAudio) {
    resumeOnReturnAudio = null;
    return;
  }
  const audio = resumeOnReturnAudio;
  resumeOnReturnAudio = null;
  if (audio.paused && !audio.ended) {
    await playWithUnlock(audio);
  }
}

function ensureReturnResumeListening() {
  if (returnResumeListening || typeof window === "undefined") return;
  returnResumeListening = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      captureResumeCandidate();
    } else {
      void tryResumeAfterReturn();
    }
  });

  window.addEventListener("blur", () => {
    captureResumeCandidate();
  });

  window.addEventListener("focus", () => {
    void tryResumeAfterReturn();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void tryResumeAfterReturn();
  });
}

/** Call before navigating away (e.g. YouTube) so playback resumes on return. */
export function markAudioForResumeOnReturn() {
  captureResumeCandidate();
}

type Tone = "hero" | "page";

export function SyncedLyricPlayer({
  audioSrc,
  lrcSrc,
  title,
  artist,
  tone = "hero",
  className = "",
  handoffAnchorId: _handoffAnchorId,
}: {
  audioSrc: string;
  lrcSrc: string;
  title: string;
  artist?: string;
  tone?: Tone;
  className?: string;
  /** @deprecated Handoff is based on widget position, not section titles. */
  handoffAnchorId?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(lrcSrc)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setLines(parseLrc(text));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lrcSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    const root = rootRef.current;
    if (!audio || !root) return;

    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    players.set(audio, { root, audio });
    ensureScrollListening();
    ensureReturnResumeListening();

    const onTime = () => setTime(audio.currentTime);
    const onPlay = () => {
      setPlaying(true);
      mediaUnlocked = true;
      activeFocus = audio;
      for (const other of players.keys()) {
        if (other !== audio && !other.paused) other.pause();
      }
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    const observer = new IntersectionObserver(() => scheduleHandoff(), {
      threshold: [0, 0.15, 0.35, 0.6, 1],
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      players.delete(audio);
      if (activeFocus === audio) activeFocus = null;
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const active = activeLyricIndex(lines, time);
  const visibleLines =
    active < 0
      ? lines.slice(0, VISIBLE_LINES)
      : lines.slice(active, active + VISIBLE_LINES);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      scrollHandoffEnabled = true;
      await playWithUnlock(audio);
    } else {
      scrollHandoffEnabled = false;
      audio.pause();
    }
  }

  const isHero = tone === "hero";

  return (
    <div ref={rootRef} className={`w-full ${className}`}>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="auto"
        playsInline
      />

      <div
        className={`flex min-h-0 flex-col items-stretch gap-3 px-3.5 py-3 transition-[border-color] duration-300 sm:min-h-[7.5rem] sm:flex-row sm:gap-4 sm:px-[1.1rem] sm:py-4 ${
          isHero
            ? `border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.28)] ${
                playing ? "border-white/40" : "hover:border-white/45"
              }`
            : `border border-line bg-bg-deep/60 ${
                playing ? "border-accent/40" : "hover:border-accent/30"
              }`
        }`}
        style={
          isHero
            ? {
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 40%, rgba(12,28,26,0.58) 100%)",
                backdropFilter: "blur(24px) saturate(1.5)",
                WebkitBackdropFilter: "blur(24px) saturate(1.5)",
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={
            playing
              ? `Pause "${title}"${artist ? ` by ${artist}` : ""}`
              : `Play "${title}"${artist ? ` by ${artist}` : ""}`
          }
          className="flex w-full shrink-0 items-center gap-2.5 text-left sm:w-[13.5rem]"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${
              isHero
                ? playing
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/15"
                : playing
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-line bg-bg text-ink hover:border-accent/40"
            }`}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <rect x="6" y="5" width="3.5" height="14" rx="0.8" />
                <rect x="14.5" y="5" width="3.5" height="14" rx="0.8" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="ml-0.5 h-3.5 w-3.5 fill-current"
                aria-hidden
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </span>

          <span className="min-w-0">
            <span
              className={`block text-[11px] font-semibold tracking-[0.22em] uppercase ${
                isHero ? "text-gold/90" : "text-accent"
              }`}
            >
              Listen
            </span>
            {isHero && artist ? (
              <>
                <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 leading-tight sm:hidden">
                  <span className="font-display text-[1.05rem] text-white">
                    {title}
                  </span>
                  <span className="text-xs text-white/65">by {artist}</span>
                </span>
                <span className="mt-0.5 hidden leading-tight sm:block">
                  <span className="font-display block text-lg text-white">
                    {title}
                  </span>
                  <span className="mt-1 block text-[13px] text-white/65">
                    by {artist}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span
                  className={`font-display mt-0.5 block text-[1.05rem] leading-tight sm:text-lg ${
                    isHero ? "text-white" : "text-ink"
                  }`}
                >
                  {title}
                </span>
                {artist ? (
                  <span
                    className={`mt-1 block text-xs sm:text-[13px] ${
                      isHero ? "text-white/65" : "text-ink-soft"
                    }`}
                  >
                    by {artist}
                  </span>
                ) : null}
              </>
            )}
          </span>
        </button>

        <div
          className={`min-w-0 flex-1 pt-3 sm:border-t-0 sm:pt-0 sm:pl-4 ${
            isHero
              ? "border-t border-white/25 sm:border-l"
              : "border-t border-line sm:border-l"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col justify-center gap-1 sm:min-h-[5.2rem] sm:gap-1.5">
            {visibleLines.length === 0 ? (
              <p
                className={`text-[13px] ${
                  isHero ? "text-white/70 drop-shadow" : "text-ink-soft"
                }`}
              >
                Tap play for synced lyrics
              </p>
            ) : (
              visibleLines.map((line, i) => (
                <p
                  key={`${line.t}-${active}-${i}`}
                  className={`leading-snug transition duration-300 ${
                    isHero
                      ? i >= 2
                        ? "hidden sm:block"
                        : ""
                      : i >= 3
                        ? "hidden sm:block"
                        : ""
                  } ${
                    isHero
                      ? `drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] ${
                          i === 0
                            ? "font-display text-sm text-white sm:text-base"
                            : i === 1
                              ? "text-[13px] text-white/80 sm:text-sm"
                              : "text-[13px] text-white/60 sm:text-sm"
                        }`
                      : i === 0
                        ? "font-display text-sm text-ink sm:text-base"
                        : i === 1
                          ? "text-[13px] text-ink-soft sm:text-sm"
                          : "text-[13px] text-ink-soft/70 sm:text-sm"
                  }`}
                >
                  {line.text}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
