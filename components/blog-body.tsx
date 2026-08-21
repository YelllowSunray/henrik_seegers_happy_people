import type { ReactNode } from "react";

const URL_RE =
  /https?:\/\/[^\s<]+[^\s<.,;:!?)\]>'"]/gi;

const YT_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;

function youtubeId(url: string): string | null {
  const match = url.match(YT_RE);
  return match?.[1] ?? null;
}

function YoutubeEmbed({ id }: { id: string }) {
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-ink/5">
      <div className="relative aspect-video w-full">
        <iframe
          title="YouTube video"
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

function splitParagraphs(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split(/\n{2,}/);
}

/** Turn a paragraph into text + inline links + YouTube embeds. */
function renderParagraph(paragraph: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, "gi");
  let inlineBuf = "";

  const flushInline = (key: string) => {
    if (!inlineBuf) return;
    nodes.push(
      <p key={key} className="whitespace-pre-wrap">
        {inlineBuf}
      </p>,
    );
    inlineBuf = "";
  };

  // Build mixed content: text runs become paragraphs; YT becomes embeds;
  // other URLs become accent links inside the text run.
  type Piece =
    | { type: "text"; value: string }
    | { type: "link"; url: string }
    | { type: "youtube"; id: string; url: string };

  const pieces: Piece[] = [];
  while ((match = re.exec(paragraph)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > last) {
      pieces.push({ type: "text", value: paragraph.slice(last, start) });
    }
    const id = youtubeId(url);
    if (id) {
      pieces.push({ type: "youtube", id, url });
    } else {
      pieces.push({ type: "link", url });
    }
    last = start + url.length;
  }
  if (last < paragraph.length) {
    pieces.push({ type: "text", value: paragraph.slice(last) });
  }
  if (pieces.length === 0) {
    pieces.push({ type: "text", value: paragraph });
  }

  let inlineNodes: ReactNode[] = [];
  let pieceIdx = 0;

  const flushInlineNodes = () => {
    if (inlineNodes.length === 0) return;
    // Skip if only whitespace
    const hasContent = inlineNodes.some(
      (n) => typeof n !== "string" || n.trim().length > 0,
    );
    if (hasContent) {
      nodes.push(
        <p key={`${keyPrefix}-t-${pieceIdx}`} className="whitespace-pre-wrap">
          {inlineNodes}
        </p>,
      );
    }
    inlineNodes = [];
  };

  for (const piece of pieces) {
    pieceIdx += 1;
    if (piece.type === "youtube") {
      flushInlineNodes();
      nodes.push(
        <YoutubeEmbed key={`${keyPrefix}-yt-${pieceIdx}`} id={piece.id} />,
      );
      continue;
    }
    if (piece.type === "link") {
      inlineNodes.push(
        <a
          key={`${keyPrefix}-a-${pieceIdx}`}
          href={piece.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent underline-offset-2 hover:underline break-all"
        >
          {piece.url}
        </a>,
      );
      continue;
    }
    inlineNodes.push(piece.value);
  }
  flushInlineNodes();

  return nodes;
}

export function BlogBody({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = splitParagraphs(text);

  return (
    <div
      className={`max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft sm:text-lg ${className}`}
    >
      {paragraphs.flatMap((paragraph, i) =>
        renderParagraph(paragraph, `p-${i}`),
      )}
    </div>
  );
}
