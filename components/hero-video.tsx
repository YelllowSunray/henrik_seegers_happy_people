"use client";

import { useEffect, useRef } from "react";

const POSTER = "/videos/seminar-hero-v1.webp";
const DESKTOP = "/videos/seminar-hero-v1.mp4";
const MOBILE = "/videos/seminar-hero-v1-720.mp4";

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const next = mobile ? MOBILE : DESKTOP;
    if (!video.currentSrc.endsWith(next)) {
      video.src = next;
    }
    void video.play().catch(() => undefined);
  }, []);

  return (
    <video
      ref={ref}
      id="hero-video"
      className="absolute inset-0 h-full w-full object-cover object-[center_28%] sm:object-center"
      poster={POSTER}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
    />
  );
}
