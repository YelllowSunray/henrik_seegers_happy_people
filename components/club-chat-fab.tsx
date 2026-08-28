"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AskHenkChat } from "@/components/ask-henk-chat";

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.5 18.5 4 21l3.2-1.1A8.8 8.8 0 0 0 12 21c4.7 0 8.5-3.4 8.5-7.5S16.7 6 12 6 3.5 9.4 3.5 13.5c0 1.6.6 3.1 1.6 4.3l.4.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.5h7M8.5 15h4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClubChatFab() {
  const t = useTranslations("askHenk");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const hideOnPage =
    pathname.startsWith("/members/ask") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hideOnPage) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 md:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl shadow-ink/25"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
              <div>
                <p
                  id={titleId}
                  className="font-display text-lg leading-tight"
                >
                  {t("title")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label={t("closeChat")}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <AskHenkChat compact />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("closeChat") : t("openChat")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-ink/25 transition hover:bg-accent"
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <ChatBubbleIcon className="h-7 w-7" />
          )}
        </button>
      </div>
    </div>
  );
}
