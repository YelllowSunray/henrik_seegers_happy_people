"use client";

import { useEffect, useRef, useState } from "react";
import {
  activeLyricIndex,
  parseLrc,
  type LyricLine,
} from "@/lib/microchip-lyrics";

const VISIBLE_LINES = 4;

type PlayerEntry = {
  id: string;
  root: HTMLElement;
  src: string;
};

/** Mounted lyric widgets — hand off when a widget reaches the top of the viewport. */
const players = new Map<string, PlayerEntry>();

/** Single audio element that survives route changes (homepage → blog → back). */
let sharedAudio: HTMLAudioElement | null = null;
let activePlayerId: string | null = null;
let handoffTimer: ReturnType<typeof setTimeout> | null = null;
/** Set after the user taps play once — required for iOS programmatic play. */
let mediaUnlocked = false;
/** Cleared when the user pauses — scroll handoff stays off until they press play again. */
let scrollHandoffEnabled = true;
let scrollListening = false;
let returnResumeListening = false;
let unlockListening = false;
let handoffRunId = 0;
/** True after user leaves while music was playing — keep going until they pause. */
let routePersistPlaying = false;
let timeListeners = new Set<(t: number) => void>();
let playListeners = new Set<(playing: boolean) => void>();

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    sharedAudio.setAttribute("playsinline", "true");
    sharedAudio.setAttribute("webkit-playsinline", "true");
    sharedAudio.addEventListener("timeupdate", () => {
      const t = sharedAudio?.currentTime ?? 0;
      for (const fn of timeListeners) fn(t);
    });
    sharedAudio.addEventListener("play", () => {
      mediaUnlocked = true;
      for (const fn of playListeners) fn(true);
    });
    sharedAudio.addEventListener("pause", () => {
      for (const fn of playListeners) fn(false);
    });
    sharedAudio.addEventListener("ended", () => {
      routePersistPlaying = false;
      activePlayerId = null;
      for (const fn of playListeners) fn(false);
      for (const fn of timeListeners) fn(0);
    });
  }
  return sharedAudio;
}

function absoluteSrc(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function sameSrc(a: string, b: string): boolean {
  return absoluteSrc(a) === absoluteSrc(b);
}

function anyPlaying(): boolean {
  return Boolean(sharedAudio && !sharedAudio.paused);
}

/** Line from viewport top where a widget counts as “at the top” (below sticky header). */
function handoffLine() {
  return Math.min(175, Math.max(108, window.innerHeight * 0.17));
}

function visibleRatio(rect: DOMRect): number {
  const vh = window.innerHeight;
  const top = Math.max(0, rect.top);
  const bottom = Math.min(vh, rect.bottom);
  const visible = Math.max(0, bottom - top);
  return visible / Math.max(rect.height, 1);
}

/**
 * Player that should be playing: first the widget at the handoff line while
 * scrolling, otherwise the most visible widget in the viewport (page load).
 */
function pickAtHandoffLine(): PlayerEntry | null {
  const line = handoffLine();
  let bestAtLine: PlayerEntry | null = null;
  let bestTop = Infinity;

  for (const entry of players.values()) {
    const rect = entry.root.getBoundingClientRect();
    if (rect.top > line) continue;
    if (rect.bottom < line * 0.35) continue;

    if (rect.top < bestTop) {
      bestTop = rect.top;
      bestAtLine = entry;
    }
  }
  return bestAtLine;
}

function pickFocusWidget(): PlayerEntry | null {
  const atLine = pickAtHandoffLine();
  if (atLine) return atLine;

  let best: PlayerEntry | null = null;
  let bestRatio = 0;

  for (const entry of players.values()) {
    const ratio = visibleRatio(entry.root.getBoundingClientRect());
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = entry;
    }
  }

  return bestRatio >= 0.15 ? best : null;
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onReady);
      resolve();
    };
    const onReady = () => finish();
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("error", onReady);
    try {
      audio.load();
    } catch {
      finish();
    }
  });
}

async function playWithUnlock(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play();
    mediaUnlocked = true;
    return true;
  } catch {
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

async function playSrc(src: string, playerId: string): Promise<boolean> {
  const audio = getSharedAudio();
  const abs = absoluteSrc(src);
  if (!sameSrc(audio.src || "", abs)) {
    audio.src = abs;
    try {
      audio.load();
    } catch {
      /* ignore */
    }
  }
  await waitForCanPlay(audio);
  const ok = await playWithUnlock(audio);
  if (ok) {
    activePlayerId = playerId;
    routePersistPlaying = true;
    scrollHandoffEnabled = true;
  }
  return ok;
}

function scheduleHandoff() {
  if (handoffTimer) clearTimeout(handoffTimer);
  handoffTimer = setTimeout(() => {
    handoffTimer = null;
    void runHandoff();
  }, 60);
}

async function runHandoff() {
  if (!scrollHandoffEnabled) return;

  // No lyric widgets on this page (e.g. blog post) — keep whatever is playing.
  if (players.size === 0) return;

  const runId = ++handoffRunId;
  const audio = getSharedAudio();
  const playing = anyPlaying();
  const focus = pickFocusWidget();

  // Coming back from another page with music still going: don't steal to a
  // different track via "most visible" fallback — only switch when a widget
  // is clearly at the scroll handoff line.
  if (playing && routePersistPlaying && audio.src) {
    const matching = [...players.values()].find((p) =>
      sameSrc(p.src, audio.src),
    );
    if (matching) {
      activePlayerId = matching.id;
      const atLine = pickAtHandoffLine();
      if (!atLine || sameSrc(atLine.src, audio.src)) return;
      // Different widget at the handoff line → allow normal handoff below.
    }
  }

  if (!focus) {
    if (!playing && !routePersistPlaying) activePlayerId = null;
    return;
  }

  const alreadyThis =
    playing &&
    activePlayerId === focus.id &&
    sameSrc(audio.src || "", focus.src);

  if (alreadyThis) {
    activePlayerId = focus.id;
    return;
  }

  if (activePlayerId === focus.id && playing) return;

  const ok = await playSrc(focus.src, focus.id);
  if (runId !== handoffRunId) return;
  if (!ok) {
    ensureUnlockListener();
    return;
  }
  if (pickFocusWidget()?.id !== focus.id) return;
}

function ensureScrollListening() {
  if (scrollListening || typeof window === "undefined") return;
  scrollListening = true;
  const onScroll = () => scheduleHandoff();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  scheduleHandoff();
}

function ensureUnlockListener() {
  if (unlockListening || typeof window === "undefined") return;
  unlockListening = true;
  const unlock = () => {
    mediaUnlocked = true;
    scrollHandoffEnabled = true;
    scheduleHandoff();
  };
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true });
}

function captureResumeCandidate() {
  if (!scrollHandoffEnabled) return;
  if (anyPlaying()) {
    routePersistPlaying = true;
  }
}

async function tryResumeAfterReturn() {
  if (!scrollHandoffEnabled || !routePersistPlaying) return;
  const audio = getSharedAudio();
  if (audio.paused && !audio.ended && audio.src) {
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
  if (anyPlaying()) routePersistPlaying = true;
}

type Tone = "hero" | "page";

export function SyncedLyricPlayer({
  audioSrc,
  lrcSrc,
  title,
  artist,
  tone = "hero",
  compact = false,
  className = "",
  handoffAnchorId: _handoffAnchorId,
}: {
  audioSrc: string;
  lrcSrc: string;
  title: string;
  artist?: string;
  tone?: Tone;
  compact?: boolean;
  className?: string;
  /** @deprecated Handoff is based on widget position, not section titles. */
  handoffAnchorId?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(
    `player-${Math.random().toString(36).slice(2, 10)}`,
  );
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
    const root = rootRef.current;
    if (!root) return;

    const id = idRef.current;
    const audio = getSharedAudio();
    players.set(id, { id, root, src: audioSrc });
    ensureScrollListening();
    ensureReturnResumeListening();

    const onTime = (t: number) => {
      if (sameSrc(audio.src || "", audioSrc)) setTime(t);
    };
    const onPlayState = (isPlaying: boolean) => {
      setPlaying(isPlaying && sameSrc(audio.src || "", audioSrc));
    };
    timeListeners.add(onTime);
    playListeners.add(onPlayState);

    // Re-attach UI to already-playing track after navigating back home.
    if (sameSrc(audio.src || "", audioSrc) && !audio.paused) {
      activePlayerId = id;
      setPlaying(true);
      setTime(audio.currentTime);
      routePersistPlaying = true;
    } else if (
      routePersistPlaying &&
      sameSrc(audio.src || "", audioSrc) &&
      audio.paused &&
      !audio.ended
    ) {
      void playWithUnlock(audio).then((ok) => {
        if (ok) {
          activePlayerId = id;
          setPlaying(true);
          setTime(audio.currentTime);
        }
      });
    }

    const observer = new IntersectionObserver(() => scheduleHandoff(), {
      threshold: [0, 0.15, 0.35, 0.6, 1],
    });
    observer.observe(root);
    scheduleHandoff();

    return () => {
      observer.disconnect();
      players.delete(id);
      timeListeners.delete(onTime);
      playListeners.delete(onPlayState);
      if (activePlayerId === id) {
        // Keep audio playing across routes; just clear the widget id.
        activePlayerId = null;
      }
      // Do NOT pause shared audio on unmount — blog posts should keep hearing it.
    };
  }, [audioSrc]);

  const active = activeLyricIndex(lines, time);
  const visibleLines =
    active < 0
      ? lines.slice(0, VISIBLE_LINES)
      : lines.slice(active, active + VISIBLE_LINES);

  async function toggle() {
    const audio = getSharedAudio();
    const isThis =
      sameSrc(audio.src || "", audioSrc) && !audio.paused;

    if (isThis) {
      scrollHandoffEnabled = false;
      routePersistPlaying = false;
      audio.pause();
      return;
    }

    scrollHandoffEnabled = true;
    const ok = await playSrc(audioSrc, idRef.current);
    if (!ok) ensureUnlockListener();
  }

  const isHero = tone === "hero";

  return (
    <div ref={rootRef} className={`w-full ${className}`}>
      <div
        className={`flex min-h-0 flex-col items-stretch gap-3 px-3.5 py-3 transition-[border-color] duration-300 sm:flex-row sm:gap-3 ${
          compact
            ? "sm:min-h-[6.75rem] sm:px-3 sm:py-3"
            : "sm:min-h-[7.5rem] sm:gap-4 sm:px-[1.1rem] sm:py-4"
        } ${
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
          className={`flex w-full shrink-0 items-center gap-2.5 text-left ${
            compact ? "sm:w-[10.75rem]" : "sm:w-[13.5rem]"
          }`}
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
          className={`min-w-0 flex-1 pt-3 sm:border-t-0 sm:pt-0 ${
            compact ? "sm:pl-3" : "sm:pl-4"
          } ${
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
