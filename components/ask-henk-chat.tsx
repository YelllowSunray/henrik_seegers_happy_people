"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";

type Turn = { role: "user" | "assistant"; content: string };

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-ink-soft" aria-hidden>
      <span className="henk-typing-dot" />
      <span className="henk-typing-dot" />
      <span className="henk-typing-dot" />
    </span>
  );
}

export function AskHenkChat({
  compact = false,
  fill = false,
  keyboardOpen = false,
}: {
  compact?: boolean;
  /** Fill parent height (mobile full-screen sheet). */
  fill?: boolean;
  /** When true, drop safe-area bottom padding (keyboard already insets the sheet). */
  keyboardOpen?: boolean;
}) {
  const t = useTranslations("askHenk");
  const locale = useLocale();
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [henkTyping, setHenkTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);

  function scrollMessagesToEnd(behavior: ScrollBehavior = "auto") {
    const list = listRef.current;
    if (!list) return;
    if (behavior === "smooth") {
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }

  useEffect(() => {
    if (!stickToBottom.current) return;
    scrollMessagesToEnd(busy ? "auto" : "smooth");
  }, [turns, henkTyping, busy, keyboardOpen]);

  // Re-stick to bottom when the keyboard opens / viewport resizes
  useEffect(() => {
    if (!fill) return;
    const vv = window.visualViewport;
    const onResize = () => {
      if (stickToBottom.current) scrollMessagesToEnd("auto");
    };
    vv?.addEventListener("resize", onResize);
    return () => vv?.removeEventListener("resize", onResize);
  }, [fill]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    const message = text.trim();
    setText("");
    setError(null);
    setBusy(true);
    setHenkTyping(true);
    stickToBottom.current = true;

    const history = turns.slice(-8);
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    requestAnimationFrame(() => scrollMessagesToEnd("auto"));

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await sleep(700 + Math.random() * 500, ac.signal);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      const res = await fetch("/api/ask-henk", {
        method: "POST",
        headers,
        body: JSON.stringify({ message, locale, history }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || t("sendFailed"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let shown = 0;
      let assistantStarted = false;
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const ensureAssistantTurn = () => {
        if (assistantStarted) return;
        assistantStarted = true;
        setTurns((prev) => [...prev, { role: "assistant", content: "" }]);
      };

      const revealUpTo = (target: number) => {
        ensureAssistantTurn();
        shown = target;
        const snapshot = full.slice(0, shown);
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      };

      const drainVisible = async (forceAll = false) => {
        while (shown < full.length) {
          if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (reduceMotion || forceAll) {
            revealUpTo(full.length);
            break;
          }
          const nextChar = full[shown] ?? "";
          const chunkSize =
            nextChar === "\n"
              ? 1
              : /[.!?…]/.test(nextChar)
                ? 1
                : /[,;:]/.test(nextChar)
                  ? 1
                  : 2 + Math.floor(Math.random() * 3);
          revealUpTo(Math.min(full.length, shown + chunkSize));
          const delay =
            nextChar === "\n"
              ? 180 + Math.random() * 120
              : /[.!?…]/.test(nextChar)
                ? 140 + Math.random() * 160
                : /[,;:]/.test(nextChar)
                  ? 70 + Math.random() * 70
                  : 18 + Math.random() * 28;
          await sleep(delay, ac.signal);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (!assistantStarted && full.trim()) {
          await sleep(350 + Math.random() * 250, ac.signal);
          setHenkTyping(false);
        }
        await drainVisible(false);
      }
      full += decoder.decode();
      await drainVisible(true);
      setHenkTyping(false);

      if (!full.trim()) {
        throw new Error(t("sendFailed"));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || t("sendFailed"));
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.content.trim()) next.pop();
        if (next[next.length - 1]?.role === "user") next.pop();
        return next;
      });
      setText(message);
      setHenkTyping(false);
    } finally {
      setBusy(false);
      setHenkTyping(false);
    }
  }

  const last = turns[turns.length - 1];
  const showCaret =
    busy &&
    !henkTyping &&
    last?.role === "assistant" &&
    last.content.length > 0;

  function onListScroll() {
    const list = listRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    stickToBottom.current = distance < 80;
  }

  return (
    <div
      className={`flex min-h-0 flex-col bg-bg ${
        fill
          ? "h-full"
          : compact
            ? ""
            : "overflow-hidden rounded-2xl border border-line"
      }`}
    >
      <div
        ref={listRef}
        onScroll={onListScroll}
        className={`flex flex-col gap-3 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] ${
          fill
            ? "min-h-0 flex-1"
            : compact
              ? "h-[min(24rem,55vh)]"
              : "max-h-[min(28rem,60vh)] min-h-[16rem]"
        }`}
      >
        {turns.length === 0 && !henkTyping && (
          <div className="my-auto space-y-3 text-center">
            <p className="text-ink-soft">{t("empty")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[t("prompt1"), t("prompt2"), t("prompt3")].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setText(prompt);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-line bg-bg-deep px-3 py-1.5 text-left text-sm text-ink-soft transition hover:border-accent hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-accent text-white"
                  : "bg-bg-deep text-ink"
              }`}
            >
              {turn.role === "assistant" && (
                <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
                  {t("fromHenk")}
                </p>
              )}
              {turn.content}
              {showCaret && i === turns.length - 1 ? (
                <span className="henk-caret" aria-hidden />
              ) : null}
            </div>
          </div>
        ))}

        {henkTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-bg-deep px-3.5 py-2.5 text-sm text-ink">
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
                {t("fromHenk")}
              </p>
              <div className="flex items-center gap-2">
                <TypingDots />
                <span className="text-xs text-ink-soft">{t("typing")}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-px w-full shrink-0" />
      </div>

      {error && (
        <p className="shrink-0 border-t border-line px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={onSend}
        className={`flex shrink-0 gap-2 border-t border-line bg-bg p-3 ${
          fill && !keyboardOpen
            ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : ""
        }`}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            stickToBottom.current = true;
            // After keyboard animates, pin messages to the bottom of the sheet
            window.setTimeout(() => scrollMessagesToEnd("auto"), 50);
            window.setTimeout(() => scrollMessagesToEnd("auto"), 300);
          }}
          placeholder={t("placeholder")}
          disabled={busy}
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-line bg-bg-deep px-4 py-2.5 text-base outline-none focus:border-accent md:text-sm"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? t("thinking") : t("send")}
        </button>
      </form>
    </div>
  );
}
