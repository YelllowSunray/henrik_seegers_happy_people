import {
  youtubeEmbedSrc,
  youtubeIdFromUrl,
} from "@/lib/youtube";

export {
  youtubeEmbedSrc,
  youtubeIdFromUrl,
  youtubeThumbSrc,
  youtubeThumbnailFromUrl,
  youtubeWatchUrl,
} from "@/lib/youtube";

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
