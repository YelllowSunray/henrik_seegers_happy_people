"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { ChatWindow } from "@/components/chat-window";
import {
  MemberIdentity,
  MemberStatusBadge,
} from "@/components/member-status-badge";
import { ensureChatThread, formatChatTime, markChatRead } from "@/lib/chat";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { memberDisplayName } from "@/lib/member-status";
import type { ChatThread, MemberProfile } from "@/lib/types";

type Subscriber = MemberProfile & { id: string };

export function AdminChatPanel({
  focusMemberUid,
  subscribers,
}: {
  focusMemberUid?: string | null;
  subscribers: Subscriber[];
}) {
  const t = useTranslations("chat");
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const byUid = useMemo(() => {
    const map = new Map<string, Subscriber>();
    for (const s of subscribers) map.set(s.uid, s);
    return map;
  }, [subscribers]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const q = query(
      collection(getClientDb(), "chats"),
      orderBy("updatedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            memberUid: String(data.memberUid ?? d.id),
            memberEmail: String(data.memberEmail ?? ""),
            memberName: data.memberName as string | undefined,
            memberPhotoURL: data.memberPhotoURL as string | undefined,
            lastMessage: data.lastMessage as string | undefined,
            lastMessageAt: formatChatTime(data.lastMessageAt),
            lastSenderRole:
              data.lastSenderRole === "admin" || data.lastSenderRole === "member"
                ? data.lastSenderRole
                : undefined,
            updatedAt: formatChatTime(data.updatedAt),
          } satisfies ChatThread;
        });
        setThreads(rows);
      },
      () => setThreads([]),
    );
  }, [user]);

  useEffect(() => {
    if (!focusMemberUid) return;
    setActiveId(focusMemberUid);
  }, [focusMemberUid]);

  useEffect(() => {
    if (!activeId || !isFirebaseConfigured) return;
    void markChatRead(getClientDb(), activeId, "admin");
  }, [activeId]);

  useEffect(() => {
    if (activeId) return;
    if (threads[0]) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const membersWithoutThread = useMemo(() => {
    const ids = new Set(threads.map((th) => th.memberUid));
    return subscribers.filter((s) => !s.isAdmin && s.email && !ids.has(s.uid));
  }, [subscribers, threads]);

  const active = threads.find((th) => th.id === activeId) ?? null;
  const focusedMember =
    (activeId ? byUid.get(activeId) : undefined) ??
    (focusMemberUid ? byUid.get(focusMemberUid) : undefined) ??
    null;

  async function startChat(member: Subscriber) {
    if (!user || starting) return;
    setStarting(true);
    try {
      await ensureChatThread(getClientDb(), {
        uid: member.uid,
        email: member.email,
        displayName: member.displayName,
        photoURL: member.photoURL,
      });
      setActiveId(member.uid);
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!focusMemberUid || !focusedMember) return;
    if (threads.some((th) => th.memberUid === focusMemberUid)) return;
    void startChat(focusedMember);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMemberUid, focusedMember?.uid]);

  function resolveMember(th: ChatThread): Subscriber | null {
    return byUid.get(th.memberUid) ?? null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <aside className="overflow-hidden border border-line bg-white/70">
        <p className="border-b border-line px-3 py-2.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {t("inbox")}
        </p>
        {threads.length === 0 && membersWithoutThread.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">{t("inboxEmpty")}</p>
        ) : (
          <ul className="max-h-[min(70vh,36rem)] divide-y divide-line overflow-y-auto">
            {threads.map((th) => {
              const member = resolveMember(th);
              const title =
                memberDisplayName(
                  member ?? {
                    displayName: th.memberName,
                    email: th.memberEmail,
                  },
                ) || th.memberUid;
              return (
                <li key={th.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(th.id)}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                      activeId === th.id ? "bg-accent/10" : "hover:bg-bg-deep"
                    }`}
                  >
                    <Avatar
                      url={member?.photoURL || th.memberPhotoURL}
                      label={title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">
                          {title}
                        </span>
                        {member && <MemberStatusBadge profile={member} />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        {th.lastMessage || "—"}
                      </span>
                      {member?.email && title !== member.email && (
                        <span className="mt-0.5 block truncate text-[11px] text-ink-soft/80">
                          {member.email}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {membersWithoutThread.map((s) => (
              <li key={`new-${s.id}`}>
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => void startChat(s)}
                  className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-bg-deep"
                >
                  <Avatar url={s.photoURL} label={memberDisplayName(s)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-ink">
                        {memberDisplayName(s)}
                      </span>
                      <MemberStatusBadge profile={s} />
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {t("startChat")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div>
        {activeId ? (
          <>
            <div className="mb-4 border border-line bg-white/70 px-4 py-3">
              <MemberIdentity
                profile={focusedMember}
                emailFallback={active?.memberEmail}
                photoURL={active?.memberPhotoURL}
              />
              {focusedMember?.phone && (
                <p className="mt-2 text-xs text-ink-soft">
                  {focusedMember.phone}
                </p>
              )}
            </div>
            <ChatWindow
              memberUid={activeId}
              viewerRole="admin"
              emptyHint={t("emptyAdmin")}
            />
          </>
        ) : (
          <p className="py-16 text-center text-sm text-ink-soft">
            {t("pickThread")}
          </p>
        )}
      </div>
    </div>
  );
}

function Avatar({ url, label }: { url?: string; label?: string }) {
  return (
    <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-bg">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-soft">
          {(label || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
