/** Extract a YouTube id from watch, shorts, live, embed, youtu.be, and m.youtube.com. */
export function youtubeIdFromUrl(url: string): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^(www|m)\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return isYoutubeId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && isYoutubeId(fromQuery)) return fromQuery;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parts[0] &&
        ["embed", "shorts", "live", "v"].includes(parts[0]) &&
        parts[1] &&
        isYoutubeId(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    /* fall through to regex */
  }
  const match = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  );
  return match?.[1] && isYoutubeId(match[1]) ? match[1] : null;
}

function isYoutubeId(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,15}$/.test(value);
}

/** iPhone Safari needs playsinline=1 or the embed stays black / opens the app. */
export function youtubeEmbedSrc(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeThumbSrc(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeThumbnailFromUrl(url: string): string | null {
  const id = youtubeIdFromUrl(url);
  return id ? youtubeThumbSrc(id) : null;
}
