"use client";

import { useLayoutEffect, useRef } from "react";
import { useCmsOptional } from "@/components/cms/cms-provider";

type Props = {
  path: string;
  value: string;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "blockquote" | "figcaption";
  multiline?: boolean;
  label?: string;
  /** Only render while CMS edit mode is on (e.g. button labels). */
  cmsOnly?: boolean;
  /** Hide empty public output (still editable in CMS). */
  hideWhenEmpty?: boolean;
  id?: string;
  inline?: boolean;
  /** Keep on one line (banner, chips) — matches visitor nowrap. */
  nowrap?: boolean;
  placeholder?: string;
};

function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (Array.isArray(acc) && /^\d+$/.test(key)) return acc[Number(key)];
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Fit textarea height to content. Never expands past parent width (mobile-safe).
 */
export function useAutosizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  deps: unknown[],
  enabled: boolean,
) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    function fit() {
      const node = ref.current;
      if (!node) return;
      const cs = getComputedStyle(node);
      const fontSize = parseFloat(cs.fontSize) || 16;
      const lineHeight =
        cs.lineHeight === "normal"
          ? fontSize * 1.25
          : parseFloat(cs.lineHeight) || fontSize * 1.25;
      const padY =
        (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const slack = Math.max(4, Math.ceil(fontSize * 0.12));

      // Always stay within the parent — never grow the page horizontally.
      node.style.width = "100%";
      node.style.maxWidth = "100%";
      node.style.boxSizing = "border-box";

      node.style.height = "0px";
      const next = Math.max(
        node.scrollHeight + slack,
        Math.ceil(lineHeight + padY + slack),
      );
      node.style.height = `${next}px`;
    }

    fit();
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit deps list
  }, [enabled, ...deps]);
}

/** Shared chrome: live-site look, contained on mobile. */
const CMS_TEXTAREA =
  "m-0 box-border max-w-full appearance-none border border-dashed border-accent/40 bg-transparent px-1.5 py-0.5 leading-[inherit] text-inherit outline-none transition " +
  "hover:border-accent/70 hover:bg-accent/[0.04] focus:border-accent focus:bg-accent/[0.06] focus:ring-1 focus:ring-accent/25 " +
  "resize-none rounded-sm [overflow-wrap:anywhere]";

export function CmsField({
  path,
  value,
  className,
  as = "p",
  multiline = true,
  label,
  cmsOnly = false,
  hideWhenEmpty = false,
  id,
  inline = false,
  nowrap = false,
  placeholder,
}: Props) {
  const cms = useCmsOptional();
  const ref = useRef<HTMLTextAreaElement>(null);
  const Tag = as;

  const enabled = Boolean(cms?.enabled);
  const live = enabled ? readPath(cms!.content, path) : value;
  const text = typeof live === "string" ? live : value;

  // Banner/chips: single visual line with horizontal scroll if needed.
  // Titles/body: wrap so large type never clips the viewport.
  const keepOneLine = nowrap;

  useAutosizeTextarea(ref, [text, className, multiline, keepOneLine], enabled);

  if (!enabled) {
    if (cmsOnly) return null;
    if (hideWhenEmpty && !text.trim()) return null;
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }

  return (
    <span
      className={
        inline
          ? "relative inline-block max-w-full min-w-0 align-baseline"
          : "relative block w-full min-w-0 max-w-full"
      }
    >
      {label ? (
        <span className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
          {label}
        </span>
      ) : null}
      <textarea
        ref={ref}
        id={id}
        value={text}
        rows={1}
        placeholder={placeholder}
        wrap={keepOneLine ? "off" : "soft"}
        onChange={(e) => cms?.setPath(path, e.target.value)}
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") e.preventDefault();
        }}
        aria-label={label || path}
        className={`${CMS_TEXTAREA} ${
          inline ? "inline-block w-full max-w-full align-baseline" : "block w-full"
        } ${className ?? ""} ${
          keepOneLine
            ? "!whitespace-nowrap overflow-x-auto overflow-y-hidden"
            : "!whitespace-pre-wrap overflow-x-hidden"
        }`}
      />
    </span>
  );
}

export function CmsParagraphs({
  path,
  values,
  className,
  itemClassName,
  asList = false,
}: {
  path: string;
  values: string[];
  className?: string;
  itemClassName?: string;
  /** @deprecated No longer used — long copy is one field. */
  addLabel?: string;
  /** Render public view as a bullet list. */
  asList?: boolean;
}) {
  const cms = useCmsOptional();
  const ref = useRef<HTMLTextAreaElement>(null);
  const enabled = Boolean(cms?.enabled);
  const live = enabled
    ? (() => {
        const raw = readPath(cms!.content, path);
        return Array.isArray(raw) ? (raw as string[]) : values;
      })()
    : values;

  const joined = asList ? live.join("\n") : live.join("\n\n");

  useAutosizeTextarea(ref, [joined, itemClassName], enabled);

  if (!enabled) {
    if (asList) {
      return (
        <ul className={className}>
          {live.map((item, i) => (
            <li key={i} className={itemClassName}>
              {item}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className={className}>
        {live.map((paragraph, i) => (
          <p key={i} className={itemClassName}>
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={`min-w-0 max-w-full ${className ?? ""}`}>
      <textarea
        ref={ref}
        value={joined}
        rows={1}
        onChange={(e) => {
          const raw = e.target.value;
          const next = asList
            ? raw
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : raw
                .split(/\n\s*\n/)
                .map((p) => p.trim())
                .filter(Boolean);
          cms?.setPath(path, next);
        }}
        aria-label={path}
        className={`${CMS_TEXTAREA} block w-full min-w-0 max-w-full !whitespace-pre-wrap overflow-x-hidden ${itemClassName ?? ""}`}
      />
      <p className="mt-1.5 text-[11px] text-ink-soft/80">
        {asList
          ? "Eén voordeel per regel"
          : "Lege regel tussen alinea’s"}
      </p>
    </div>
  );
}
