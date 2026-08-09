"use client";

import { useEffect, useRef, useState } from "react";
import {
  activeLyricIndex,
  parseLrc,
  type LyricLine,
} from "@/lib/microchip-lyrics";

const VISIBLE_LINES = 4;

export function MicrochipPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/audio/microchip.lrc")
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setLines(parseLrc(text));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setTime(audio.currentTime);
    const onPlay = () => setPlaying(true);
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
      await audio.play();
    } else {
      audio.pause();
    }
  }

  return (
    <div className="w-full max-w-[41rem]">
      <audio ref={audioRef} src="/audio/microchip.mp3" preload="metadata" />

      <div
        className={`flex min-h-0 flex-col items-stretch gap-3 border border-white/30 px-3.5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.28)] transition-[border-color] duration-300 sm:min-h-[7.5rem] sm:flex-row sm:gap-4 sm:px-[1.1rem] sm:py-4 ${
          playing ? "border-white/40" : "hover:border-white/45"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 40%, rgba(12,28,26,0.58) 100%)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        }}
      >
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={
            playing
              ? 'Pause "Micro Chip" by Tarrus Riley'
              : 'Play "Micro Chip" by Tarrus Riley'
          }
          className="flex w-full shrink-0 items-center gap-2.5 text-left sm:w-[11rem]"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${
              playing
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-white/40 bg-white/10 text-white hover:bg-white/15"
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
            <span className="block text-[11px] font-semibold tracking-[0.22em] text-gold/90 uppercase">
              Listen
            </span>
            <span className="font-display mt-0.5 block text-[1.05rem] leading-none text-white sm:text-lg">
              Micro Chip
            </span>
            <span className="mt-1 block text-xs text-white/65 sm:text-[13px]">
              by Tarrus Riley
            </span>
          </span>
        </button>

        <div className="min-w-0 flex-1 border-t border-white/25 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <div className="flex h-full min-h-0 flex-col justify-center gap-1 sm:min-h-[5.2rem] sm:gap-1.5">
            {visibleLines.length === 0 ? (
              <p className="text-[13px] text-white/70 drop-shadow">
                Tap play for synced lyrics
              </p>
            ) : (
              visibleLines.map((line, i) => (
                <p
                  key={`${line.t}-${active}-${i}`}
                  className={`leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition duration-300 ${
                    i >= 3 ? "hidden sm:block" : ""
                  } ${
                    i === 0
                      ? "font-display text-sm text-white sm:text-base"
                      : i === 1
                        ? "text-[13px] text-white/80 sm:text-sm"
                        : "text-[13px] text-white/60 sm:text-sm"
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
