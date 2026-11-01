"use client";

import { useTranslations } from "next-intl";
import { youtubeEmbedSrc, youtubeIdFromUrl } from "@/components/youtube-embed";
import { isDirectMediaUrl } from "@/lib/video-media";

export function VlogPlayer({
  url,
  title,
  poster,
}: {
  url?: string;
  title: string;
  poster?: string;
}) {
  const tr = useTranslations("journal");
  const src = url?.trim();

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center bg-ink/5 text-sm text-ink-soft">
        {tr("comingSoon")}
      </div>
    );
  }

  const youtubeId = youtubeIdFromUrl(src);
  if (youtubeId) {
    return (
      <div className="aspect-video bg-ink/20">
        <iframe
          src={youtubeEmbedSrc(youtubeId)}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (isDirectMediaUrl(src) || !src.includes("youtube.")) {
    return (
      <div className="aspect-video bg-ink">
        {/* iPhone: playsInline + controls — webkit-playsinline via attribute */}
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
