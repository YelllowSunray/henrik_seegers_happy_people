import type { VideoItem } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when publishedAt is today or earlier (empty date = not visible to members). */
export function isVideoPublished(
  video: Pick<VideoItem, "publishedAt">,
  onDate = todayIso(),
): boolean {
  const publishedAt = video.publishedAt?.trim();
  if (!publishedAt) return false;
  return publishedAt <= onDate;
}

function hasPlayableMedia(video: VideoItem): boolean {
  if (video.mediaType === "audio" || video.audioUrl?.trim()) {
    return Boolean(video.audioUrl?.trim());
  }
  return Boolean(video.videoUrl?.trim());
}

/** Club-facing catalog: published and actually watchable. */
export function isMemberVisibleVideo(video: VideoItem, onDate = todayIso()): boolean {
  if (video.kind === "sample") return false;
  if (!isVideoPublished(video, onDate)) return false;
  return hasPlayableMedia(video);
}
