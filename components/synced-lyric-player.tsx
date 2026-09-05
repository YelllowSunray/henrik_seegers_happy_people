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
/**
 * After a direct Play tap, ignore scroll handoff until the user actually scrolls.
 * Prevents a raced handoff (or unlock listener) from stealing the first click.
 */
let holdHandoffUntilScroll = false;
let scrollListening = false;
let returnResumeListening = false;
let unlockListening = false;
let handoffRunId = 0;
/** Bumps whenever a new play request starts — stale awaits must not win. */
let playGeneration = 0;
/** True after user leaves while music was playing — keep going until they pause. */
let routePersistPlaying = false;
/** Set when page/app backgrounds while music should resume on return. */
let resumeAfterBackground = false;
const RESUME_STORAGE_KEY = "hssc-audio-resume";
const RESUME_MAX_AGE_MS = 30 * 60 * 1000;
/** One burst of handoff retries after first widget mounts (page-load autoplay). */
let initialAutoplayBurst = false;
let initialAutoplayTimers: number[] = [];
const preloadedSrc = new Set<string>();
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
      routePersistPlaying = true;
      writeResumeSnapshot();
      for (const fn of playListeners) fn(true);
    });
    sharedAudio.addEventListener("pause", () => {
      for (const fn of playListeners) fn(false);
    });
    sharedAudio.addEventListener("ended", () => {
      routePersistPlaying = false;
      resumeAfterBackground = false;
      clearResumeSnapshot();
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
  return Math.min(215, Math.max(128, window.innerHeight * 0.22));
}

function visibleRatio(rect: DOMRect): number {
  const vh = window.innerHeight;
  const top = Math.max(0, rect.top);
  const bottom = Math.min(vh, rect.bottom);
  const visible = Math.max(0, bottom - top);
  return visible / Math.max(rect.height, 1);
}

/**
 * Widget whose top has crossed the handoff line most recently (closest to the
 * line from above). Avoids clinging to Microchip until it’s fully off-screen,
 * which used to skip Spirits entirely.
 */
function pickAtHandoffLine(): PlayerEntry | null {
  const line = handoffLine();
  let best: PlayerEntry | null = null;
  let bestTop = -Infinity;

  for (const entry of players.values()) {
    const rect = entry.root.getBoundingClientRect();
    if (rect.top > line) continue;
    if (rect.bottom <= 0) continue;

    if (rect.top >= bestTop) {
      bestTop = rect.top;
      best = entry;
    }
  }
  return best;
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

function preloadAudio(src: string) {
  if (typeof window === "undefined") return;
  const abs = absoluteSrc(src);
  if (preloadedSrc.has(abs)) return;
  preloadedSrc.add(abs);
  const probe = new Audio();
  probe.preload = "auto";
  probe.src = abs;
  try {
    probe.load();
  } catch {
    /* ignore */
  }
}

function clearInitialAutoplayTimers() {
  for (const id of initialAutoplayTimers) window.clearTimeout(id);
  initialAutoplayTimers = [];
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onReady);
      window.clearTimeout(timer);
      resolve();
    };
    const onReady = () => finish();
    const timer = window.setTimeout(finish, 4000);
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("error", onReady);
    try {
      audio.load();
    } catch {
      finish();
    }
  });
}

async function playWithUnlock(
  audio: HTMLAudioElement,
  autoplay = false,
): Promise<boolean> {
  // Muted-first is more reliable for page-load autoplay (Chrome, Vercel CDN lag).
  if (autoplay) {
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
    }
  }

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

async function playSrc(
  src: string,
  playerId: string,
  opts?: { fromUser?: boolean; autoplay?: boolean },
): Promise<boolean> {
  const generation = ++playGeneration;
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

  // iOS Safari: play() must run in the same user-gesture turn — never wait on
  // canplay first when the visitor tapped play.
  if (opts?.fromUser) {
    let ok =
      (await playWithUnlock(audio)) || (await playWithUnlock(audio, true));
    if (!ok) {
      await waitForCanPlay(audio);
      if (generation !== playGeneration) return false;
      ok =
        (await playWithUnlock(audio)) || (await playWithUnlock(audio, true));
    }
    if (generation !== playGeneration) return false;
    if (ok) {
      clearInitialAutoplayTimers();
      activePlayerId = playerId;
      routePersistPlaying = true;
      scrollHandoffEnabled = true;
      holdHandoffUntilScroll = true;
    }
    return ok;
  }

  if (
    opts?.autoplay &&
    audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
  ) {
    const quick = await playWithUnlock(audio, true);
    if (generation !== playGeneration) return false;
    if (quick) {
      clearInitialAutoplayTimers();
      activePlayerId = playerId;
      routePersistPlaying = true;
      scrollHandoffEnabled = true;
      return true;
    }
  }

  await waitForCanPlay(audio);
  if (generation !== playGeneration) return false;

  const ok = await playWithUnlock(audio, Boolean(opts?.autoplay));
  if (generation !== playGeneration) return false;

  if (ok) {
    clearInitialAutoplayTimers();
    activePlayerId = playerId;
    routePersistPlaying = true;
    scrollHandoffEnabled = true;
  }
  return ok;
}

function scheduleHandoff() {
  if (holdHandoffUntilScroll) return;
  if (handoffTimer) clearTimeout(handoffTimer);
  handoffTimer = setTimeout(() => {
    handoffTimer = null;
    void runHandoff();
  }, 60);
}

function scheduleInitialAutoplayBurst() {
  if (initialAutoplayBurst || typeof window === "undefined") return;
  initialAutoplayBurst = true;
  const delays = [0, 200, 500, 1000, 1800, 3000, 4500];
  for (const ms of delays) {
    const id = window.setTimeout(() => {
      if (anyPlaying()) {
        clearInitialAutoplayTimers();
        return;
      }
      scheduleHandoff();
    }, ms);
    initialAutoplayTimers.push(id);
  }
}

async function runHandoff() {
  if (!scrollHandoffEnabled || holdHandoffUntilScroll) return;

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
    }
  }

  if (!focus) {
    if (!playing && !routePersistPlaying) activePlayerId = null;
    return;
  }

  if (
    playing &&
    activePlayerId === focus.id &&
    sameSrc(audio.src || "", focus.src)
  ) {
    return;
  }

  if (playing && sameSrc(audio.src || "", focus.src)) {
    activePlayerId = focus.id;
    return;
  }

  const ok = await playSrc(focus.src, focus.id, {
    autoplay: !anyPlaying(),
  });
  if (runId !== handoffRunId || holdHandoffUntilScroll) return;
  if (!ok) {
    ensureUnlockListener();
  }
}

function ensureScrollListening() {
  if (scrollListening || typeof window === "undefined") return;
  scrollListening = true;
  const onScroll = () => {
    if (holdHandoffUntilScroll) {
      holdHandoffUntilScroll = false;
    }
    scheduleHandoff();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  ensureGestureListening();
  scheduleInitialAutoplayBurst();
}

function ensureUnlockListener() {
  if (unlockListening || typeof window === "undefined") return;
  unlockListening = true;

  const onGesture = () => {
    mediaUnlocked = true;
    if (shouldAttemptResume() && !anyPlaying()) {
      void tryResumeAfterReturn();
    } else if (!anyPlaying()) {
      scheduleHandoff();
    }
    if (anyPlaying()) {
      document.removeEventListener("touchstart", onGesture, true);
      document.removeEventListener("pointerdown", onGesture, true);
      unlockListening = false;
    }
  };

  document.addEventListener("touchstart", onGesture, {
    capture: true,
    passive: true,
  });
  document.addEventListener("pointerdown", onGesture, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", onGesture, { once: true });
}

// Always listen for the first mobile touch so scroll-handoff can start.
function ensureGestureListening() {
  if (typeof window === "undefined") return;
  ensureUnlockListener();
}

function captureResumeCandidate() {
  snapshotForResume();
}

type ResumeSnapshot = {
  src: string;
  time: number;
  at: number;
};

function writeResumeSnapshot() {
  if (typeof window === "undefined") return;
  const audio = getSharedAudio();
  if (!audio.src || audio.ended) return;
  const snap: ResumeSnapshot = {
    src: audio.src,
    time: audio.currentTime,
    at: Date.now(),
  };
  try {
    sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota / private mode */
  }
}

function readResumeSnapshot(): ResumeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as ResumeSnapshot;
    if (!snap.src || Date.now() - snap.at > RESUME_MAX_AGE_MS) return null;
    return snap;
  } catch {
    return null;
  }
}

function clearResumeSnapshot() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Remember playback before iOS pauses audio or Safari evicts the page. */
function snapshotForResume() {
  const audio = getSharedAudio();
  if (audio.ended || !audio.src) return;
  if (!anyPlaying() && !routePersistPlaying) return;

  routePersistPlaying = true;
  resumeAfterBackground = true;
  writeResumeSnapshot();
}

function applyResumeSnapshot(audio: HTMLAudioElement) {
  const snap = readResumeSnapshot();
  if (!snap) return false;
  if (!audio.src || audio.ended) {
    audio.src = snap.src;
    try {
      audio.load();
    } catch {
      /* ignore */
    }
  }
  if (sameSrc(audio.src || "", snap.src)) {
    try {
      if (Math.abs(audio.currentTime - snap.time) > 0.25) {
        audio.currentTime = snap.time;
      }
    } catch {
      /* ignore seek errors */
    }
    routePersistPlaying = true;
    resumeAfterBackground = true;
    return true;
  }
  return false;
}

function shouldAttemptResume(): boolean {
  if (resumeAfterBackground) return true;
  const snap = readResumeSnapshot();
  if (snap) return true;
  const audio = sharedAudio;
  return Boolean(
    routePersistPlaying && audio?.src && !audio.ended && audio.paused,
  );
}

function notifyPlayState(playing: boolean) {
  for (const fn of playListeners) fn(playing);
}

async function tryResumeAfterReturn(): Promise<boolean> {
  if (!shouldAttemptResume()) return false;

  const audio = getSharedAudio();
  applyResumeSnapshot(audio);

  if (!audio.src || audio.ended) return false;
  if (!audio.paused) {
    resumeAfterBackground = false;
    clearResumeSnapshot();
    notifyPlayState(true);
    return true;
  }

  const ok =
    (await playWithUnlock(audio)) || (await playWithUnlock(audio, true));
  if (ok) {
    resumeAfterBackground = false;
    routePersistPlaying = true;
    clearResumeSnapshot();
    notifyPlayState(true);
    for (const fn of timeListeners) fn(audio.currentTime);
    return true;
  }
  return false;
}

function ensureReturnResumeListening() {
  if (returnResumeListening || typeof window === "undefined") return;
  returnResumeListening = true;
  ensureGestureListening();

  const snap = readResumeSnapshot();
  if (snap) {
    routePersistPlaying = true;
    resumeAfterBackground = true;
    void tryResumeAfterReturn();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      snapshotForResume();
    } else {
      resumeMusicIfNeeded();
    }
  });

  window.addEventListener("blur", () => {
    snapshotForResume();
  });

  window.addEventListener("focus", () => {
    resumeMusicIfNeeded();
  });

  window.addEventListener("pageshow", () => {
    resumeMusicIfNeeded();
  });

  window.addEventListener("pagehide", () => {
    snapshotForResume();
  });
}

/** Resume with short retries — mobile often pauses audio during backgrounding. */
export function resumeMusicAfterNavigation() {
  if (typeof window === "undefined") return;
  ensureReturnResumeListening();
  void tryResumeAfterReturn();
  for (const ms of [50, 150, 350, 700, 1200, 2000, 3500, 5000]) {
    window.setTimeout(() => void tryResumeAfterReturn(), ms);
  }
}

/** Only resume when we actually left with music playing. */
export function resumeMusicIfNeeded() {
  if (!shouldAttemptResume()) return;
  resumeMusicAfterNavigation();
}

/** Call before navigating away (e.g. YouTube) so playback resumes on return. */
export function markAudioForResumeOnReturn() {
  snapshotForResume();
}

/** Chat overlay paused the shared track — restore when the chat closes. */
let chatPauseDepth = 0;
let playingBeforeChatOverlay = false;
let handoffBeforeChatOverlay = true;

/** Force-pause site music without changing the chat pause refcount. */
export function ensureMusicPausedForChat() {
  if (typeof window === "undefined") return;
  const audio = getSharedAudio();
  scrollHandoffEnabled = false;
  holdHandoffUntilScroll = false;
  playGeneration += 1;
  handoffRunId += 1;
  try {
    audio.pause();
  } catch {
    /* ignore */
  }
}

/** Pause site music while the Henk chatbot is open (mobile + desktop). */
export function pauseMusicForChat() {
  if (typeof window === "undefined") return;

  const audio = getSharedAudio();
  const wasPlaying = Boolean(audio.src && !audio.paused);

  if (chatPauseDepth === 0) {
    playingBeforeChatOverlay = wasPlaying;
    handoffBeforeChatOverlay = scrollHandoffEnabled;
  } else if (wasPlaying) {
    // Nested/re-entrant pause (e.g. Gespreksmodus) — keep resume intent
    playingBeforeChatOverlay = true;
  }
  chatPauseDepth += 1;

  // Stop scroll handoff from starting another track under the chat.
  scrollHandoffEnabled = false;
  holdHandoffUntilScroll = false;
  playGeneration += 1;
  handoffRunId += 1;

  // Always force-pause — even on re-entry (Strict Mode / Gespreksmodus).
  try {
    audio.pause();
  } catch {
    /* ignore */
  }
}

/** Resume music that was playing before the chatbot opened. */
export function resumeMusicAfterChat() {
  if (typeof window === "undefined") return;
  if (chatPauseDepth <= 0) return;

  chatPauseDepth -= 1;
  if (chatPauseDepth > 0) return;

  scrollHandoffEnabled = handoffBeforeChatOverlay;

  if (playingBeforeChatOverlay) {
    playingBeforeChatOverlay = false;
    routePersistPlaying = true;
    void tryResumeAfterReturn();
  } else {
    playingBeforeChatOverlay = false;
  }
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
    preloadAudio(audioSrc);
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
      // Cancel any in-flight handoff/play so it can't restart after pause.
      playGeneration += 1;
      handoffRunId += 1;
      holdHandoffUntilScroll = false;
      scrollHandoffEnabled = false;
      routePersistPlaying = false;
      resumeAfterBackground = false;
      clearResumeSnapshot();
      audio.pause();
      setPlaying(false);
      return;
    }

    // Optimistic UI + claim this gesture before any raced handoff runs.
    holdHandoffUntilScroll = true;
    scrollHandoffEnabled = true;
    setPlaying(true);
    setTime(sameSrc(audio.src || "", audioSrc) ? audio.currentTime : 0);

    const ok = await playSrc(audioSrc, idRef.current, { fromUser: true });
    if (!ok) {
      setPlaying(false);
      holdHandoffUntilScroll = false;
      ensureUnlockListener();
    }
  }

  const isHero = tone === "hero";

  return (
    <div ref={rootRef} data-lyric-player className={`w-full ${className}`}>
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
