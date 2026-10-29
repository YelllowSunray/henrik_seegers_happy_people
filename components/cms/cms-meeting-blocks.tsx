"use client";

import { useEffect, useRef, useState } from "react";
import { CmsField } from "@/components/cms/cms-field";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { MeetingYoutubeLink } from "@/components/meeting-youtube-link";
import type { MeetingBlockContent } from "@/lib/homepage-content";

function reorderBlocks(
  list: MeetingBlockContent[],
  from: number,
  to: number,
): MeetingBlockContent[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function DragHandle({
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-white text-accent active:bg-accent/10 md:h-9 md:w-9 md:cursor-grab md:active:cursor-grabbing"
      title={label}
      aria-label={label}
      style={{ touchAction: "none" }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <circle cx="9" cy="7" r="1.4" />
        <circle cx="15" cy="7" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="15" cy="12" r="1.4" />
        <circle cx="9" cy="17" r="1.4" />
        <circle cx="15" cy="17" r="1.4" />
      </svg>
    </button>
  );
}

export function CmsMeetingBlocks({
  blocks,
  bridge,
}: {
  blocks: MeetingBlockContent[];
  bridge: string;
}) {
  const cms = useCmsOptional();
  const enabled = Boolean(cms?.enabled);
  const live = enabled
    ? (() => {
        const raw = cms!.content.meeting.blocks;
        return Array.isArray(raw) && raw.length > 0 ? raw : blocks;
      })()
    : blocks;
  const liveBridge = enabled ? cms!.content.meeting.bridge : bridge;
  const lastIndex = live.length - 1;

  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;
  const dragFrom = useRef<number | null>(null);
  const startY = useRef(0);
  const activated = useRef(false);
  const overRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function setBlocks(next: MeetingBlockContent[]) {
    cms?.setPath("meeting.blocks", next);
  }

  function move(from: number, to: number) {
    setBlocks(reorderBlocks(liveRef.current, from, to));
  }

  function indexUnderPointer(clientY: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const dist = Math.abs(mid - clientY);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    return best;
  }

  function endDrag(commit: boolean) {
    const from = dragFrom.current;
    const to = overRef.current;
    dragFrom.current = null;
    activated.current = false;
    overRef.current = null;
    setDragging(null);
    setOverIndex(null);
    if (commit && from != null && to != null && from !== to) {
      move(from, to);
    }
  }

  // Window listeners while dragging — required on iPhone once the finger leaves the handle.
  useEffect(() => {
    if (dragging == null) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onMove(e: PointerEvent) {
      e.preventDefault();
      const nextOver = indexUnderPointer(e.clientY);
      if (nextOver != null && nextOver !== overRef.current) {
        overRef.current = nextOver;
        setOverIndex(nextOver);
      }
    }

    function onUp() {
      endDrag(true);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only rebind when drag starts/ends
  }, [dragging]);

  function onHandlePointerDown(index: number, e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragFrom.current = index;
    startY.current = e.clientY;
    activated.current = false;
    overRef.current = index;
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (dragFrom.current == null) return;
    const dy = Math.abs(e.clientY - startY.current);
    if (!activated.current) {
      if (dy < 8) return;
      activated.current = true;
      setDragging(dragFrom.current);
      setOverIndex(dragFrom.current);
    }
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    // If we never activated (tiny tap), just cancel.
    if (!activated.current) {
      endDrag(false);
      return;
    }
    // Window listener also handles up; this covers capture-release on the button.
    if (dragging != null) endDrag(true);
  }

  if (!enabled) {
    return (
      <div className="mt-10 space-y-12">
        {live.map((block, i) => (
          <article key={`meeting-block-${i}`} className="space-y-4">
            <h3 className="font-display text-xl md:text-2xl">
              <MeetingYoutubeLink href={block.youtube} song={block.song} />
            </h3>
            <CmsField
              path={`meeting.blocks.${i}.text`}
              value={block.text}
              as="p"
              className="max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg"
            />
            {i === lastIndex - 1 ? (
              <CmsField
                path="meeting.bridge"
                value={liveBridge}
                as="p"
                className="font-display pt-2 text-xl leading-snug text-ink md:text-2xl"
              />
            ) : null}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 min-w-0 max-w-full space-y-4">
      <p className="text-[11px] leading-snug text-ink-soft">
        Sleep ⋮⋮ om te herordenen · of ↑↓ · liedtitel + link bewerken
      </p>

      {live.map((block, i) => (
        <article
          key={`meeting-cms-${i}-${block.song.slice(0, 12)}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={`min-w-0 max-w-full space-y-3 overflow-hidden rounded-xl border border-dashed p-3 sm:p-4 transition ${
            dragging === i
              ? "border-accent bg-accent/15 opacity-80 shadow-md"
              : overIndex === i && dragging != null
                ? "border-accent bg-accent/10"
                : "border-accent/40 bg-accent/[0.04]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <DragHandle
              label="Slepen om te herordenen"
              onPointerDown={(e) => onHandlePointerDown(i, e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <p className="min-w-0 flex-1 truncate text-[10px] font-semibold tracking-wide text-accent uppercase">
              Passage {i + 1}
              {dragging === i ? " · slepen…" : null}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-base text-ink disabled:opacity-30 md:h-8 md:w-8 md:text-sm"
                aria-label="Omhoog"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === live.length - 1}
                onClick={() => move(i, i + 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-base text-ink disabled:opacity-30 md:h-8 md:w-8 md:text-sm"
                aria-label="Omlaag"
              >
                ↓
              </button>
              {live.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-red-700/90 md:h-8 md:px-2 md:text-[11px]"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Passage “${block.song || i + 1}” verwijderen?`,
                      )
                    ) {
                      return;
                    }
                    setBlocks(live.filter((_, idx) => idx !== i));
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <CmsField
            path={`meeting.blocks.${i}.song`}
            value={block.song}
            as="h3"
            multiline={false}
            placeholder="Liedtitel"
            className="font-display text-lg text-accent underline decoration-accent/70 underline-offset-4 sm:text-xl md:text-2xl"
          />

          <div className="-mt-1 flex min-w-0 max-w-full items-center gap-1.5 text-ink-soft">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
              <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
            </svg>
            <div className="min-w-0 flex-1">
              <CmsField
                path={`meeting.blocks.${i}.youtube`}
                value={block.youtube}
                multiline={false}
                nowrap
                placeholder="YouTube-link plakken…"
                className="w-full text-base text-ink-soft md:text-xs"
              />
            </div>
            {block.youtube.trim() ? (
              <a
                href={block.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-accent/10 md:h-7 md:w-7"
                title="Link openen"
                aria-label="Link openen"
              >
                ↗
              </a>
            ) : null}
          </div>

          <CmsField
            path={`meeting.blocks.${i}.text`}
            value={block.text}
            as="p"
            placeholder="Tekst bij deze passage…"
            className="w-full text-base leading-relaxed text-ink-soft md:text-lg"
          />

          {i === lastIndex - 1 ? (
            <CmsField
              path="meeting.bridge"
              value={liveBridge}
              as="p"
              label="Brugtekst (tussen passages)"
              className="font-display pt-1 text-xl leading-snug text-ink md:text-2xl"
            />
          ) : null}
        </article>
      ))}

      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/55 bg-accent/5 px-4 py-3.5 text-sm font-semibold text-accent hover:bg-accent/10"
        onClick={() => {
          setBlocks([...live, { song: "", youtube: "", text: "" }]);
        }}
      >
        <span aria-hidden>+</span>
        Nieuwe ontmoeting-passage
      </button>
    </div>
  );
}
