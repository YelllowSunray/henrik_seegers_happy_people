import { youtubeIdFromUrl } from "@/components/youtube-embed";

export function isYoutubeUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return Boolean(youtubeIdFromUrl(url));
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeIdFromUrl(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** Firebase Storage / direct file — play with <video>, not an iframe. */
export function isDirectMediaUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  if (isYoutubeUrl(url)) return false;
  return (
    /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) ||
    /firebasestorage\.googleapis\.com/i.test(url) ||
    /storage\.googleapis\.com/i.test(url) ||
    /\.firebasestorage\.app/i.test(url)
  );
}

export function isPlayableVideoUrl(url: string | undefined): boolean {
  return Boolean(url?.trim()) && (isYoutubeUrl(url) || isDirectMediaUrl(url) || Boolean(url?.trim()));
}
