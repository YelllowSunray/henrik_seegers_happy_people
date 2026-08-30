"use client";

import { useState } from "react";

export function ExpandableParagraphs({
  paragraphs,
  readMoreLabel,
  emphasizeFirst = false,
}: {
  paragraphs: string[];
  readMoreLabel: string;
  emphasizeFirst?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? paragraphs : paragraphs.slice(0, 2);
  const canExpand = !expanded && paragraphs.length > 2;

  return (
    <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
      {visible.map((paragraph, i) => (
        <p key={i} className={emphasizeFirst && i === 0 ? "text-ink" : undefined}>
          {paragraph}
        </p>
      ))}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex rounded-full border border-line bg-bg-deep px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          {readMoreLabel}
        </button>
      )}
    </div>
  );
}
