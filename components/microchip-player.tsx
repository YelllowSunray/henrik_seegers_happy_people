"use client";

import { SyncedLyricPlayer } from "@/components/synced-lyric-player";

export function MicrochipPlayer({
  handoffAnchorId,
}: {
  handoffAnchorId?: string;
}) {
  return (
    <SyncedLyricPlayer
      audioSrc="/audio/microchip-v1.mp3"
      lrcSrc="/audio/microchip.lrc"
      title="Micro Chip"
      artist="Tarrus Riley"
      tone="hero"
      className="max-w-[41rem]"
      handoffAnchorId={handoffAnchorId}
    />
  );
}
