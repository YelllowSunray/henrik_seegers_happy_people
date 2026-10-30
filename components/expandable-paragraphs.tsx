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
    <div className="mt-8 max-w-2xl space-y-6">
      {visible.map((paragraph, i) => (
        <p
          key={i}
          className={`reading-copy ${
            emphasizeFirst && i === 0 ? "reading-copy-ink" : ""
          }`}
        >
          {paragraph}
        </p>
      ))}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex rounded-full border border-line bg-bg-deep px-5 py-2.5 text-base font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          {readMoreLabel}
        </button>
      )}
    </div>
  );
}
