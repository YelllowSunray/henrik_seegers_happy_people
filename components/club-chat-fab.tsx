"use client";

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AskHenkChat } from "@/components/ask-henk-chat";
import { stopSpeaking } from "@/lib/henk-speech";
import {
  pauseMusicForChat,
  resumeMusicAfterChat,
} from "@/components/synced-lyric-player";

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

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);
  return mobile;
}

/** Full-screen mobile sheet sized to the visual viewport (keyboard-safe on iOS). */
function MobileChatSheet({
  titleId,
  title,
  closeLabel,
  onClose,
}: {
  titleId: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 10001,
  });
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const sync = () => {
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const offsetLeft = vv?.offsetLeft ?? 0;
      const width = vv?.width ?? window.innerWidth;
      const openKb = height < window.innerHeight * 0.85;
      setKeyboardOpen(openKb);
      // Keep the interactive panel inside the visual viewport only.
      // An opaque layout-viewport backdrop underneath prevents website flash
      // while iOS animates the keyboard.
      setPanelStyle({
        position: "fixed",
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${Math.round(height)}px`,
        transform: `translate3d(${Math.round(offsetLeft)}px, ${Math.round(offsetTop)}px, 0)`,
        zIndex: 10001,
      });
    };

    sync();
    // rAF keeps us in sync with Safari's keyboard animation frames
    let raf = 0;
    const onVvChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    vv?.addEventListener("resize", onVvChange);
    vv?.addEventListener("scroll", onVvChange);
    window.addEventListener("resize", onVvChange);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", onVvChange);
      vv?.removeEventListener("scroll", onVvChange);
      window.removeEventListener("resize", onVvChange);
    };
  }, []);

  // Block touch scrolling of the page behind the chat
  useEffect(() => {
    const block = (e: TouchEvent) => {
      // Allow scrolling inside the message list only
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-henk-chat-scroll]")) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  return (
    <>
      {/* Always covers the full layout viewport — never resizes with the keyboard */}
      <div
        aria-hidden
        className="fixed inset-0 min-h-full min-h-[100dvh] bg-[var(--bg,#f3efe6)]"
        style={{ zIndex: 10000 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={panelStyle}
        className="flex flex-col overflow-hidden bg-[var(--bg,#f3efe6)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
          <p id={titleId} className="font-display text-lg leading-tight">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={closeLabel}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <AskHenkChat fill keyboardOpen={keyboardOpen} />
        </div>
      </div>
    </>
  );
}

export function ClubChatFab() {
  const t = useTranslations("askHenk");
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  const hideOnPage =
    pathname.startsWith("/members/ask") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth");

  useEffect(() => setMounted(true), []);

  function closeChat() {
    stopSpeaking();
    resumeMusicAfterChat();
    setOpen(false);
  }

  function openChat() {
    pauseMusicForChat();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeChat();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Hard-lock background scroll (iOS-safe)
  useEffect(() => {
    if (!open || !isMobile) return;
    const scrollY = window.scrollY;
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;
    const prevBody = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      overflow: bodyStyle.overflow,
      width: bodyStyle.width,
    };
    const prevHtml = {
      overflow: htmlStyle.overflow,
      background: htmlStyle.background,
    };
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";
    htmlStyle.overflow = "hidden";
    // Match chat cream so any momentary gap never shows site content
    htmlStyle.background = "#f3efe6";
    return () => {
      bodyStyle.position = prevBody.position;
      bodyStyle.top = prevBody.top;
      bodyStyle.left = prevBody.left;
      bodyStyle.right = prevBody.right;
      bodyStyle.overflow = prevBody.overflow;
      bodyStyle.width = prevBody.width;
      htmlStyle.overflow = prevHtml.overflow;
      htmlStyle.background = prevHtml.background;
      window.scrollTo(0, scrollY);
    };
  }, [open, isMobile]);

  if (hideOnPage || !mounted) return null;

  const overlay =
    open && isMobile ? (
      <MobileChatSheet
        titleId={titleId}
        title={t("title")}
        closeLabel={t("closeChat")}
        onClose={closeChat}
      />
    ) : null;

  return (
    <>
      {overlay ? createPortal(overlay, document.body) : null}

      {open && !isMobile && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="pointer-events-auto flex w-[min(100vw-4rem,24rem)] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl shadow-ink/25"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 text-white">
              <p id={titleId} className="font-display text-lg leading-tight">
                {t("title")}
              </p>
              <button
                type="button"
                onClick={closeChat}
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label={t("closeChat")}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <AskHenkChat compact />
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 md:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            if (open) closeChat();
            else openChat();
          }}
          aria-expanded={open}
          aria-label={open ? t("closeChat") : t("openChat")}
          className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lg shadow-ink/25 transition hover:bg-accent ${
            open && isMobile ? "hidden" : open ? "flex" : "flex"
          }`}
        >
          {open && !isMobile ? (
            <CloseIcon className="h-6 w-6" />
          ) : (
            <ChatBubbleIcon className="h-7 w-7" />
          )}
        </button>
      </div>
    </>
  );
}
