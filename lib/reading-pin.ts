const PIN_KEY = "hp.readingPin";

export type ReadingPin = {
  id: string;
  /** Character offset inside the pinned text block. */
  offset: number;
  /** A few characters at that offset, so the same words can be found again. */
  snippet: string;
  /** Distance from the header's bottom edge to that line. */
  belowHeader: number;
};

function quoteAttr(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function headerBottom() {
  return document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
}

function caretRange(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

function pinFromPoint(x: number, y: number): ReadingPin | null {
  const range = caretRange(x, y);
  let pinEl: HTMLElement | null = null;
  let offset = 0;
  let lineTop = y;

  if (range) {
    const node = range.startContainer;
    const base =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node.parentElement;
    const found = base?.closest("[data-cms-pin]");
    if (found instanceof HTMLElement) {
      pinEl = found;
      const pre = document.createRange();
      try {
        pre.selectNodeContents(pinEl);
        pre.setEnd(range.startContainer, range.startOffset);
        offset = pre.toString().length;
      } catch {
        offset = 0;
      }
      const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
      if (rect && (rect.height > 0 || rect.top !== 0)) lineTop = rect.top;
    }
  }

  if (!pinEl) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest("header")) continue;
      const found = el.closest("[data-cms-pin]");
      if (found instanceof HTMLElement) {
        pinEl = found;
        offset = 0;
        lineTop = found.getBoundingClientRect().top;
        break;
      }
    }
  }

  if (!pinEl) return null;
  const id = pinEl.getAttribute("data-cms-pin");
  if (!id) return null;
  const text = pinEl.innerText.replace(/\s+/g, " ").trim();
  const raw = pinEl.textContent ?? "";
  const snippet = raw.slice(offset, offset + 48);
  if (!snippet.trim() && !text) return null;
  return {
    id,
    offset,
    snippet: snippet || text.slice(0, 48),
    belowHeader: lineTop - headerBottom(),
  };
}

/** The line of text the reader is looking at, without moving the page. */
export function peekReadingPin(): ReadingPin | null {
  const top = headerBottom();
  const view = window.visualViewport;
  const viewHeight = view?.height ?? window.innerHeight;
  const viewTop = view?.offsetTop ?? 0;
  const band = Math.max(48, viewHeight - top);
  const ys = [0.34, 0.5, 0.22, 0.66].map((part) => viewTop + top + band * part);
  const xs = [32, 56, Math.min(window.innerWidth * 0.42, 220)];
  for (const y of ys) {
    if (y < top + 4 || y > viewTop + viewHeight - 8) continue;
    for (const x of xs) {
      const pin = pinFromPoint(x, y);
      if (pin) return pin;
    }
  }
  return null;
}

export function commitReadingPin(pin: ReadingPin | null) {
  if (!pin) return;
  try {
    sessionStorage.setItem(PIN_KEY, JSON.stringify(pin));
  } catch {
    /* private mode */
  }
  document.documentElement.classList.add("cms-pinning");
}

export function hasReadingPin() {
  if (document.documentElement.classList.contains("cms-pinning")) return true;
  try {
    return sessionStorage.getItem(PIN_KEY) != null;
  } catch {
    return false;
  }
}

export function clearReadingPin() {
  try {
    sessionStorage.removeItem(PIN_KEY);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.remove("cms-pinning");
}

function readPin(): ReadingPin | null {
  try {
    const raw = sessionStorage.getItem(PIN_KEY);
    if (!raw) return null;
    const pin = JSON.parse(raw) as ReadingPin;
    if (!pin?.id || typeof pin.belowHeader !== "number") return null;
    return pin;
  } catch {
    return null;
  }
}

function fieldFor(
  pin: ReadingPin,
): { el: HTMLTextAreaElement | HTMLElement; offset: number } | null {
  const path = pin.id.split("#")[0] ?? pin.id;
  const needle = pin.snippet.trim();
  const area = document.querySelector<HTMLTextAreaElement>(
    `textarea[data-cms-pin="${quoteAttr(path)}"]`,
  );
  if (area) {
    return {
      el: area,
      offset: absoluteOffset(pin.id, pin.offset ?? 0, area.value, pin.snippet ?? ""),
    };
  }

  const exact = document.querySelector<HTMLElement>(
    `[data-cms-pin="${quoteAttr(pin.id)}"]`,
  );
  if (exact) {
    const text = exact.textContent ?? "";
    const at = needle ? text.indexOf(needle) : -1;
    return { el: exact, offset: at >= 0 ? at : Math.min(pin.offset ?? 0, text.length) };
  }

  if (!needle) return null;
  const parts = document.querySelectorAll<HTMLElement>(
    `[data-cms-pin^="${quoteAttr(path)}#"]`,
  );
  for (const el of parts) {
    const text = el.textContent ?? "";
    const at = text.indexOf(needle);
    if (at >= 0) return { el, offset: at };
  }
  return null;
}

function absoluteOffset(id: string, offset: number, value: string, snippet: string) {
  let computed = offset;
  if (id.includes("#")) {
    const index = Number(id.split("#")[1]);
    if (Number.isFinite(index) && index > 0) {
      const parts = value.split(/\n\s*\n/);
      let acc = 0;
      for (let i = 0; i < index && i < parts.length; i++) {
        acc += parts[i]!.length + 2;
      }
      computed = acc + offset;
    }
  }
  const needle = snippet.trim();
  if (needle) {
    const at = value.indexOf(needle);
    if (at >= 0 && Math.abs(at - computed) < 80) return at;
  }
  return computed;
}

/** Screen Y of a character inside a field, matching that field's wrapping. */
function lineScreenY(
  field: HTMLTextAreaElement | HTMLElement,
  absOffset: number,
): number | null {
  const value =
    field instanceof HTMLTextAreaElement ? field.value : (field.textContent ?? "");
  if (field.clientWidth < 8) return null;
  const i = Math.max(0, Math.min(absOffset, value.length));
  const cs = getComputedStyle(field);
  const mirror = document.createElement("div");
  mirror.style.position = "fixed";
  mirror.style.left = "0";
  mirror.style.top = "0";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.boxSizing = "border-box";
  mirror.style.width = `${field.getBoundingClientRect().width}px`;
  mirror.style.font = cs.font;
  mirror.style.fontSize = cs.fontSize;
  mirror.style.fontFamily = cs.fontFamily;
  mirror.style.fontWeight = cs.fontWeight;
  mirror.style.lineHeight = cs.lineHeight;
  mirror.style.letterSpacing = cs.letterSpacing;
  mirror.style.padding = cs.padding;
  mirror.style.border = cs.border;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "anywhere";
  const before = document.createTextNode(value.slice(0, i));
  const mark = document.createElement("span");
  mark.textContent = value.slice(i, i + 1) || "\u200b";
  mirror.append(before, mark);
  document.body.appendChild(mirror);
  const y =
    field.getBoundingClientRect().top +
    (mark.getBoundingClientRect().top - mirror.getBoundingClientRect().top);
  mirror.remove();
  return y;
}

/** Scroll so the pinned line sits where it did before Admin opened. */
export function restoreReadingPin() {
  const pin = readPin();
  if (!pin) return false;
  const field = fieldFor(pin);
  if (!field) return false;
  const value =
    field.el instanceof HTMLTextAreaElement
      ? field.el.value
      : (field.el.textContent ?? "");
  if (field.el instanceof HTMLTextAreaElement && !value) return false;
  const y = lineScreenY(field.el, field.offset);
  if (y == null) return false;
  const desired = headerBottom() + pin.belowHeader;
  const delta = y - desired;
  if (Math.abs(delta) > 1) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + delta),
      left: 0,
      behavior: "auto",
    });
  }
  return true;
}
