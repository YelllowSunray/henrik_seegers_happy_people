type Tone = "default" | "deep" | "transparent";

export function Section({
  eyebrow,
  title,
  titleId,
  children,
  className = "",
  id,
  tone = "default",
  compact = false,
}: {
  eyebrow?: string;
  title?: string;
  titleId?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: Tone;
  compact?: boolean;
}) {
  const toneClass =
    tone === "deep"
      ? "bg-bg-deep"
      : tone === "transparent"
        ? "bg-transparent"
        : "bg-bg";
  const padClass = compact
    ? "mx-auto max-w-6xl px-5 py-8 sm:py-12 md:px-8 md:py-16"
    : "mx-auto max-w-6xl px-5 py-12 sm:py-16 md:px-8 md:py-24";

  return (
    <section id={id} className={`${toneClass} ${className}`}>
      <div className={padClass}>
        {eyebrow && (
          <p className="text-sm font-semibold tracking-[0.16em] text-accent uppercase md:text-base">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2
            id={titleId}
            className="font-display mt-3 max-w-2xl text-3xl leading-snug text-ink sm:text-4xl md:text-5xl"
          >
            {title}
          </h2>
        )}
        <div className={title || eyebrow ? "mt-7 sm:mt-9" : undefined}>{children}</div>
      </div>
    </section>
  );
}
