"use client";

import { useEffect, useRef, useState } from "react";

const POSTER = "/videos/hendrik-bio-v1.webp";

export function SeminarHeroVideo({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  }, [active]);

  return (
    <div
      className={`relative aspect-[4/5] min-h-[16rem] w-full overflow-hidden bg-ink/5 ${className}`}
    >
      {active ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-top"
          poster={POSTER}
          muted
          loop
          playsInline
          preload="none"
          aria-label="Hendrik Seegers"
        >
          <source src="/videos/hendrik-bio-v1.mp4" type="video/mp4" />
        </video>
      ) : (
        <button
          type="button"
          className="absolute inset-0 block h-full w-full"
          onClick={() => setActive(true)}
          aria-label="Hendrik Seegers — afspelen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={POSTER}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
