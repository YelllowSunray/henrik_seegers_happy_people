"use client";

import { type ReactNode } from "react";

const PRAYER = "\u{1F64F}"; // 🙏
const HEART = "\u{2764}\u{FE0F}"; // ❤️
const SUFFIX = `${PRAYER}${HEART}`;

type Props = {
  text: string;
  className?: string;
  as?: "p" | "span";
  children?: (body: ReactNode, tail: ReactNode) => ReactNode;
};

/**
 * When copy ends with 🙏❤️, show those emojis with a gentle “hand kiss” style motion.
 */
export function EmojiTailText({
  text,
  className,
  as: Tag = "p",
  children,
}: Props) {
  const trimmed = text.trimEnd();
  const hasPrayerHeart =
    trimmed.endsWith(SUFFIX) || trimmed.endsWith(`${PRAYER}\u{2764}`);

  if (!hasPrayerHeart) {
    return <Tag className={className}>{text}</Tag>;
  }

  const withoutSuffix = trimmed.endsWith(SUFFIX)
    ? trimmed.slice(0, -SUFFIX.length)
    : trimmed.slice(0, -(PRAYER.length + 1));

  const body = withoutSuffix.trimEnd();
  const needsEllipsis = body.length > 0 && !/[.!?…]$/.test(body);

  const tail = (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap align-middle">
      <span className="inline-block origin-bottom animate-hand-kiss-prayer" aria-hidden>
        {PRAYER}
      </span>
      <span className="inline-block animate-heart-soft-pulse" aria-hidden>
        {HEART}
      </span>
    </span>
  );

  if (children) {
    return <>{children(body, tail)}</>;
  }

  return (
    <Tag className={className}>
      {body}
      {needsEllipsis ? "…\u00A0" : body ? "\u00A0" : null}
      {tail}
    </Tag>
  );
}
