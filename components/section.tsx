type Tone = "default" | "deep" | "transparent";

export function Section({
  eyebrow,
  title,
  children,
  className = "",
  id,
  tone = "default",
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: Tone;
}) {
  const toneClass =
    tone === "deep"
      ? "bg-bg-deep"
      : tone === "transparent"
        ? "bg-transparent"
        : "bg-bg";

  return (
    <section id={id} className={`${toneClass} ${className}`}>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16 md:px-8 md:py-24">
        {eyebrow && (
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="font-display mt-3 max-w-2xl text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
            {title}
          </h2>
        )}
        <div className={title || eyebrow ? "mt-6 sm:mt-8" : undefined}>{children}</div>
      </div>
    </section>
  );
}
