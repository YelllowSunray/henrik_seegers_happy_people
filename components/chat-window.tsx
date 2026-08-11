"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { formatChatTime, sendChatMessage } from "@/lib/chat";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { ChatMessage, ChatSenderRole } from "@/lib/types";

export function ChatWindow({
  memberUid,
  viewerRole,
  emptyHint,
}: {
  memberUid: string;
  viewerRole: ChatSenderRole;
  emptyHint?: string;
}) {
  const t = useTranslations("chat");
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !memberUid) return;
    const q = query(
      collection(getClientDb(), "chats", memberUid, "messages"),
      orderBy("createdAt", "asc"),
      limit(200),
    );
    return onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              text: String(data.text ?? ""),
              senderId: String(data.senderId ?? ""),
              senderRole: (data.senderRole === "admin"
                ? "admin"
                : "member") as ChatSenderRole,
              createdAt: formatChatTime(data.createdAt),
            };
          }),
        );
      },
      (err) => setError(err.message),
    );
  }, [memberUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendChatMessage(getClientDb(), memberUid, {
        text,
        senderId: user.uid,
        senderRole: viewerRole,
        member:
          viewerRole === "member"
            ? {
                uid: user.uid,
                email: user.email ?? profile?.email ?? "",
                displayName: profile?.displayName,
                photoURL: profile?.photoURL,
              }
            : undefined,
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[min(70vh,36rem)] flex-col border border-line bg-bg">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            {emptyHint ?? t("empty")}
          </p>
        ) : (
          messages.map((m) => {
            const mine =
              (viewerRole === "admin" && m.senderRole === "admin") ||
              (viewerRole === "member" && m.senderRole === "member");
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? "bg-accent text-white"
                      : "bg-bg-deep text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-ink-soft"
                    }`}
                  >
                    {m.senderRole === "admin" ? t("fromHenk") : t("fromYou")}
                    {m.createdAt ? ` · ${m.createdAt}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void onSend(e)}
        className="flex gap-2 border-t border-line p-3 sm:p-4"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          maxLength={3500}
          className="min-w-0 flex-1 border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-50"
        >
          {busy ? "…" : t("send")}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
