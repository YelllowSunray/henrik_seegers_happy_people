export function youtubeIdFromUrl(url: string): string | null {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  );
  return match?.[1] ?? null;
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
          src={`https://www.youtube.com/embed/${id}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
