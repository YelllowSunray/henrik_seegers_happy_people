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
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { timestampToMs } from "@/lib/chat";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { isVideoPublished } from "@/lib/video-visibility";
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
    teachings: [] as string[],
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
          const kind = String(data.kind ?? "");
          const videoUrl =
            typeof data.videoUrl === "string" ? data.videoUrl : undefined;
          const audioUrl =
            typeof data.audioUrl === "string" ? data.audioUrl : undefined;
          const mediaType =
            data.mediaType === "audio" || data.mediaType === "video"
              ? data.mediaType
              : audioUrl
                ? "audio"
                : "video";
          const item = {
            publishedAt,
            kind,
            videoUrl,
            audioUrl,
            mediaType,
          } as const;
          if (!isVideoPublished(item)) return;
          if (kind === "seminar" && !videoUrl?.trim()) return;
          if (kind === "vlog" && !videoUrl?.trim() && !audioUrl?.trim()) return;
          if (kind === "seminar") seminars.push(publishedAt);
          if (kind === "vlog") vlogs.push(publishedAt);
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
          teachings: now,
        },
      },
      { merge: true },
    ).then(() => refreshProfile());
  }, [user, profile, refreshProfile]);

  const activity = useMemo<ClubActivity>(() => {
    if (!profile?.activitySeen) {
      return empty;
    }
    const seen = profile?.activitySeen;
    const seminars = countNewer(latest.seminars, seen?.seminars);
    const vlogs = countNewer(latest.vlogs, seen?.vlogs);
    const quotes = countNewer(latest.quotes, seen?.quotes);
    const teachings = countNewer(latest.teachings, seen?.teachings);
    return {
      seminars,
      vlogs,
      quotes,
      messages: 0,
      teachings,
      chat: 0,
      total: seminars + vlogs + quotes + teachings,
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
      { match: "/members/vlogs", section: "vlogs" },
      { match: "/members/seminars", section: "seminars" },
      { match: "/members/quotes", section: "quotes" },
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
