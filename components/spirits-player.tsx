"use client";

import { SyncedLyricPlayer } from "@/components/synced-lyric-player";

export function SpiritsPlayer({
  handoffAnchorId,
}: {
  handoffAnchorId?: string;
}) {
  return (
    <SyncedLyricPlayer
      audioSrc="/audio/spirits.mp3"
      lrcSrc="/audio/spirits.lrc"
      title="Spirits In The Material World"
      artist="The Police"
      tone="page"
      handoffAnchorId={handoffAnchorId}
    />
  );
}
