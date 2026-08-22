"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { events as seedEvents } from "@/lib/content";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { LocalizedString, SeminarEvent } from "@/lib/types";

function mapEventDoc(id: string, data: Record<string, unknown>): SeminarEvent {
  return {
    id,
    title: (data.title as LocalizedString) ?? { nl: "" },
    description: (data.description as LocalizedString) ?? { nl: "" },
    date: String(data.date ?? ""),
    time: String(data.time ?? ""),
    location: String(data.location ?? ""),
    address:
      typeof data.address === "string" && data.address.trim()
        ? data.address.trim()
        : undefined,
    priceLabel:
      typeof data.priceLabel === "string" ? data.priceLabel : undefined,
  };
}

export function isUpcomingEventDate(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const eventDay = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDay >= today;
}

export function useUpcomingEvent(): SeminarEvent | null {
  const [events, setEvents] = useState<SeminarEvent[]>(seedEvents);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsub = onSnapshot(
      collection(getClientDb(), "events"),
      (snap) => {
        if (snap.empty) {
          setEvents(seedEvents);
          return;
        }
        setEvents(
          snap.docs
            .map((doc) => mapEventDoc(doc.id, doc.data() as Record<string, unknown>))
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
      },
      () => setEvents(seedEvents),
    );

    return () => unsub();
  }, []);

  return (
    events.filter((event) => isUpcomingEventDate(event.date))[0] ?? null
  );
}
