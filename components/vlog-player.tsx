"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  youtubeEmbedSrc,
  youtubeIdFromUrl,
  youtubeThumbSrc,
} from "@/components/youtube-embed";
import { isDirectMediaUrl } from "@/lib/video-media";

function PlayGlyph() {
  return (
    <span
      aria-hidden
      className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
        <path d="M8 5.5v13l11-6.5-11-6.5Z" />
      </svg>
    </span>
  );
}

function YoutubeFrame({ id, title }: { id: string; title: string }) {
  return (
    <div className="relative aspect-video w-full bg-ink/20">
      <iframe
        src={youtubeEmbedSrc(id)}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function VlogPlayer({
  url,
  title,
  poster,
  eager = false,
}: {
  url?: string;
  title: string;
  poster?: string;
  /** Load the YouTube iframe immediately (detail page). Cards start from a thumb. */
  eager?: boolean;
}) {
  const tr = useTranslations("journal");
  const src = url?.trim();
  const youtubeId = src ? youtubeIdFromUrl(src) : null;
  const [playing, setPlaying] = useState(eager);

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center bg-ink/5 text-sm text-ink-soft">
        {tr("comingSoon")}
      </div>
    );
  }

  if (youtubeId) {
    if (playing) {
      return <YoutubeFrame id={youtubeId} title={title} />;
    }
    const thumb = poster?.trim() || youtubeThumbSrc(youtubeId);
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full overflow-hidden bg-ink text-left"
        aria-label={`${title} — afspelen`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 bg-ink/25" />
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayGlyph />
        </span>
      </button>
    );
  }

  if (isDirectMediaUrl(src) || !src.includes("youtube.")) {
    return (
      <div className="aspect-video bg-ink">
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          src={src}
          className="h-full w-full"
        >
          {tr("videoUnsupported")}
        </video>
      </div>
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-ink/5 px-4 text-center text-sm text-ink-soft">
      {tr("comingSoon")}
    </div>
  );
}
