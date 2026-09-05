"use client";

import { markAudioForResumeOnReturn } from "@/components/synced-lyric-player";

export function MeetingYoutubeLink({
  href,
  song,
}: {
  href: string;
  song: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-2 text-accent underline decoration-accent/70 underline-offset-4 transition hover:decoration-accent"
      onPointerDown={() => markAudioForResumeOnReturn()}
      onTouchStart={() => markAudioForResumeOnReturn()}
      onClick={() => markAudioForResumeOnReturn()}
    >
      <span>{song}</span>
      <span
        aria-hidden
        className="text-sm font-semibold tracking-wide no-underline"
      >
        ↗
      </span>
    </a>
  );
}
