"use client";

import { ExpandableParagraphs } from "@/components/expandable-paragraphs";
import { CmsParagraphs } from "@/components/cms/cms-field";
import { useCmsOptional } from "@/components/cms/cms-provider";

export function CmsOrExpandable({
  path,
  paragraphs,
  readMoreLabel,
  emphasizeFirst,
  className,
  itemClassName,
}: {
  path: string;
  paragraphs: string[];
  readMoreLabel: string;
  emphasizeFirst?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  const cms = useCmsOptional();
  if (cms?.enabled) {
    return (
      <CmsParagraphs
        path={path}
        values={paragraphs}
        className={className ?? "mt-8 max-w-2xl space-y-5"}
        itemClassName={
          itemClassName ??
          "text-base leading-relaxed text-ink-soft md:text-lg"
        }
      />
    );
  }
  return (
    <ExpandableParagraphs
      paragraphs={paragraphs}
      readMoreLabel={readMoreLabel}
      emphasizeFirst={emphasizeFirst}
    />
  );
}
