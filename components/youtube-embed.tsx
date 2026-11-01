/** Extract a YouTube id from watch, shorts, live, embed, youtu.be, and m.youtube.com. */
export function youtubeIdFromUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
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
  const match = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
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

export function YoutubeEmbed({
  url,
  title,
}: {
  url: string;
  title?: string;
}) {
  const id = youtubeIdFromUrl(url);

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex aspect-video w-full items-center justify-center border border-line bg-ink/5 text-sm font-semibold text-accent underline-offset-4 hover:bg-ink/10 hover:underline"
      >
        {title ? `Watch “${title}” on YouTube ↗` : "Watch on YouTube ↗"}
      </a>
    );
  }

  return (
    <div className="overflow-hidden border border-line bg-ink/5">
      <div className="relative aspect-video w-full">
        <iframe
          title={title || "YouTube video"}
          src={youtubeEmbedSrc(id)}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
