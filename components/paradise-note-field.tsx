"use client";

import { CmsField } from "@/components/cms/cms-field";
import { EmojiTailText } from "@/components/emoji-tail-text";
import { useCmsOptional } from "@/components/cms/cms-provider";

export function ParadiseNoteField({
  path,
  value,
  className,
}: {
  path: string;
  value: string;
  className?: string;
}) {
  const cms = useCmsOptional();
  if (cms?.enabled) {
    return (
      <CmsField path={path} value={value} as="p" className={className} />
    );
  }
  return <EmojiTailText text={value} as="p" className={className} />;
}
