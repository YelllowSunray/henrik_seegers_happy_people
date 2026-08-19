"use client";

import { useEffect, useRef, useState } from "react";
import {
  activeLyricIndex,
  parseLrc,
  type LyricLine,
} from "@/lib/microchip-lyrics";

const VISIBLE_LINES = 4;

/** All mounted lyric players — pause peers when one starts, or when scrolled away. */
const mountedAudio = new Set<HTMLAudioElement>();

type Tone = "hero" | "page";

export function SyncedLyricPlayer({
  audioSrc,
  lrcSrc,
  title,
  artist,
  tone = "hero",
  className = "",
}: {
  audioSrc: string;
  lrcSrc: string;
  title: string;
  artist?: string;
  tone?: Tone;
  className?: string;
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
    if (!audio) return;

    mountedAudio.add(audio);

    const onTime = () => setTime(audio.currentTime);
    const onPlay = () => {
      setPlaying(true);
      for (const other of mountedAudio) {
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

    return () => {
      mountedAudio.delete(audio);
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Pause when this player scrolls out of the viewport (up or down).
  useEffect(() => {
    const root = rootRef.current;
    const audio = audioRef.current;
    if (!root || !audio) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
          if (!audio.paused) audio.pause();
        }
      },
      { threshold: [0, 0.2, 0.5, 1] },
    );

    observer.observe(root);
    return () => observer.disconnect();
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
      await audio.play();
    } else {
      audio.pause();
    }
  }

  const isHero = tone === "hero";

  return (
    <div ref={rootRef} className={`w-full ${className}`}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

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
              <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 leading-tight">
                <span className="font-display text-[1.05rem] text-white sm:text-lg">
                  {title}
                </span>
                <span className="text-xs text-white/65 sm:text-[13px]">
                  by {artist}
                </span>
              </span>
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
                    // Hero on mobile: current + next only. Elsewhere: keep 3 on mobile / 4 on sm+.
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
