"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { markChatRead, timestampToMs } from "@/lib/chat";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { ClubActivity, ClubSection, MemberProfile } from "@/lib/types";

const empty: ClubActivity = {
  seminars: 0,
  vlogs: 0,
  quotes: 0,
  messages: 0,
  teachings: 0,
  chat: 0,
  total: 0,
};

type ClubActivityContextValue = {
  activity: ClubActivity;
  markSectionSeen: (section: ClubSection) => Promise<void>;
};

const ClubActivityContext = createContext<ClubActivityContextValue | null>(
  null,
);

function countNewer(dates: string[], seenIso?: string): number {
  const seenMs = seenIso ? timestampToMs(seenIso) : 0;
  return dates.filter((d) => timestampToMs(d) > seenMs).length;
}

export function ClubActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [latest, setLatest] = useState({
    seminars: [] as string[],
    vlogs: [] as string[],
    quotes: [] as string[],
    unreadMessages: 0,
    teachings: [] as string[],
    chatUnread: 0,
  });

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const db = getClientDb();
    const silent = () => {
      /* permission / offline */
    };
    const unsubs = [
      onSnapshot(collection(db, "videos"), (snap) => {
        const seminars: string[] = [];
        const vlogs: string[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          const publishedAt = String(data.publishedAt ?? "");
          if (data.kind === "seminar") seminars.push(publishedAt);
          if (data.kind === "vlog") vlogs.push(publishedAt);
        });
        setLatest((prev) => ({ ...prev, seminars, vlogs }));
      }, silent),
      onSnapshot(collection(db, "quotes"), (snap) => {
        setLatest((prev) => ({
          ...prev,
          quotes: snap.docs.map((d) => String(d.data().publishedAt ?? "")),
        }));
      }, silent),
      onSnapshot(collection(db, "posts"), (snap) => {
        setLatest((prev) => ({
          ...prev,
          teachings: snap.docs
            .filter((d) => Boolean(d.data().membersOnly))
            .map((d) => String(d.data().publishedAt ?? "")),
        }));
      }, silent),
      onSnapshot(
        query(
          collection(db, "personalMessages"),
          where("toUserId", "==", user.uid),
        ),
        (snap) => {
          const unread = snap.docs.filter((d) => !d.data().read).length;
          setLatest((prev) => ({ ...prev, unreadMessages: unread }));
        },
        silent,
      ),
      onSnapshot(
        doc(db, "chats", user.uid),
        (snap) => {
          if (!snap.exists()) {
            setLatest((prev) => ({ ...prev, chatUnread: 0 }));
            return;
          }
          const data = snap.data();
          const lastAt = timestampToMs(data.lastMessageAt);
          const readAt = timestampToMs(data.memberLastReadAt);
          const fromHenk = data.lastSenderRole === "admin";
          setLatest((prev) => ({
            ...prev,
            chatUnread: fromHenk && lastAt > readAt ? 1 : 0,
          }));
        },
        silent,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // First club visit: seed seen timestamps so existing catalog isn't all "new"
  useEffect(() => {
    if (!user || !profile || profile.isAdmin) return;
    if (profile.activitySeen) return;
    if (!isFirebaseConfigured) return;
    const now = new Date().toISOString();
    void setDoc(
      doc(getClientDb(), "members", user.uid),
      {
        activitySeen: {
          seminars: now,
          vlogs: now,
          quotes: now,
          messages: now,
          teachings: now,
          chat: now,
        },
      },
      { merge: true },
    ).then(() => refreshProfile());
  }, [user, profile, refreshProfile]);

  const activity = useMemo<ClubActivity>(() => {
    // Until first seed lands, don't flood the UI with "everything is new"
    if (!profile?.activitySeen) {
      return {
        ...empty,
        messages: latest.unreadMessages,
        chat: latest.chatUnread,
        total: latest.unreadMessages + latest.chatUnread,
      };
    }
    const seen = profile?.activitySeen;
    const seminars = countNewer(latest.seminars, seen?.seminars);
    const vlogs = countNewer(latest.vlogs, seen?.vlogs);
    const quotes = countNewer(latest.quotes, seen?.quotes);
    const teachings = countNewer(latest.teachings, seen?.teachings);
    const messages = latest.unreadMessages;
    const chat = latest.chatUnread;
    return {
      seminars,
      vlogs,
      quotes,
      messages,
      teachings,
      chat,
      total: seminars + vlogs + quotes + messages + teachings + chat,
    };
  }, [latest, profile?.activitySeen]);

  const markSectionSeen = useCallback(
    async (section: ClubSection) => {
      if (!user || !isFirebaseConfigured) return;
      const db = getClientDb();
      const now = new Date().toISOString();
      const nextSeen: NonNullable<MemberProfile["activitySeen"]> = {
        ...(profile?.activitySeen ?? {}),
        [section]: now,
      };

      try {
        if (section === "chat") {
          await markChatRead(db, user.uid, "member");
        }

        if (section === "messages") {
          const email = (user.email ?? "").toLowerCase();
          const byUid = await getDocs(
            query(
              collection(db, "personalMessages"),
              where("toUserId", "==", user.uid),
            ),
          );
          const byEmail = user.email
            ? await getDocs(
                query(
                  collection(db, "personalMessages"),
                  where("toEmail", "==", user.email),
                ),
              )
            : null;
          const seenIds = new Set<string>();
          const unread = [...byUid.docs, ...(byEmail?.docs ?? [])].filter(
            (d) => {
              if (seenIds.has(d.id)) return false;
              seenIds.add(d.id);
              const data = d.data();
              return (
                !data.read &&
                (data.toUserId === user.uid ||
                  String(data.toEmail ?? "").toLowerCase() === email)
              );
            },
          );
          await Promise.all(
            unread.map((d) =>
              setDoc(
                doc(db, "personalMessages", d.id),
                { read: true },
                { merge: true },
              ),
            ),
          );
        }

        await setDoc(
          doc(db, "members", user.uid),
          { activitySeen: nextSeen },
          { merge: true },
        );
        await refreshProfile();
      } catch {
        /* permission / offline — avoid unhandledRejection */
      }
    },
    [user, profile?.activitySeen, refreshProfile],
  );

  useEffect(() => {
    if (!user) return;
    const map: { match: string; section: ClubSection }[] = [
      { match: "/members/chat", section: "chat" },
      { match: "/members/vlogs", section: "vlogs" },
      { match: "/members/seminars", section: "seminars" },
      { match: "/members/quotes", section: "quotes" },
      { match: "/members/messages", section: "messages" },
      { match: "/members/teachings", section: "teachings" },
    ];
    const hit = map.find((m) => pathname.startsWith(m.match));
    if (!hit) return;
    void markSectionSeen(hit.section).catch(() => undefined);
  }, [pathname, user, markSectionSeen]);

  const value = useMemo(
    () => ({ activity, markSectionSeen }),
    [activity, markSectionSeen],
  );

  return (
    <ClubActivityContext.Provider value={value}>
      {children}
    </ClubActivityContext.Provider>
  );
}

export function useClubActivity() {
  const ctx = useContext(ClubActivityContext);
  if (!ctx) {
    return {
      activity: empty,
      markSectionSeen: async () => undefined,
    };
  }
  return ctx;
}
