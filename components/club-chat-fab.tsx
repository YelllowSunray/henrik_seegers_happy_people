"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClubChatFab() {
  const t = useTranslations("askHenk");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [vvStyle, setVvStyle] = useState<CSSProperties | undefined>();
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

  // Lock page scroll while the sheet is open (mobile keyboard-friendly)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the mobile sheet inside the visual viewport when the keyboard opens (iOS Safari)
  useEffect(() => {
    if (!open) {
      setVvStyle(undefined);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (!isMobile) {
        setVvStyle(undefined);
        return;
      }
      setVvStyle({
        position: "fixed",
        top: vv.offsetTop,
        left: vv.offsetLeft,
        width: vv.width,
        height: vv.height,
        right: "auto",
        bottom: "auto",
      });
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  if (hideOnPage) return null;

  return (
    <>
      {open && (
        <>
          {/* Mobile: full-screen sheet pinned to the visual viewport */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={vvStyle}
            className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
              <p id={titleId} className="font-display text-lg leading-tight">
                {t("title")}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label={t("closeChat")}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <AskHenkChat fill />
            </div>
          </div>

          {/* Desktop: floating card above the FAB */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 hidden justify-end p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] md:flex">
            <div className="pointer-events-auto flex w-[min(100vw-4rem,24rem)] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl shadow-ink/25">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
                <p className="font-display text-lg leading-tight">{t("title")}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label={t("closeChat")}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <AskHenkChat compact />
            </div>
          </div>
        </>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 md:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("closeChat") : t("openChat")}
          className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-ink/25 transition hover:bg-accent ${
            open ? "hidden md:flex" : "flex"
          }`}
        >
          {open ? (
            <CloseIcon className="h-6 w-6" />
          ) : (
            <ChatBubbleIcon className="h-7 w-7" />
          )}
        </button>
      </div>
    </>
  );
}
