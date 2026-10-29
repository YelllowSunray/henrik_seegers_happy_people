"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { CmsField, useAutosizeTextarea } from "@/components/cms/cms-field";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { cmsAdminFetch } from "@/lib/cms-admin-fetch";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { formatEventDate } from "@/lib/seminar-content";

type Draft = {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  dateUncertain: boolean;
};

const empty: Draft = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  time: "14:00–17:00",
  location: "Van der Valk Hotel Amersfoort",
  address: "Ruimtevaart 22-24, 3824 MX Amersfoort",
  dateUncertain: false,
};

const DEBOUNCE_MS = 900;

const INLINE_CHROME =
  "m-0 box-border w-full min-w-0 max-w-full appearance-none border border-dashed border-accent/40 bg-transparent px-1.5 py-0.5 leading-[inherit] outline-none transition " +
  "hover:border-accent/70 hover:bg-accent/[0.04] focus:border-accent focus:bg-accent/[0.06] focus:ring-1 focus:ring-accent/25 " +
  "resize-none overflow-x-hidden rounded-sm !whitespace-pre-wrap [overflow-wrap:anywhere]";

function InlineField({
  value,
  onChange,
  className,
  placeholder,
  multiline = false,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, [value, className, multiline], type !== "date");

  if (type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INLINE_CHROME} max-w-full ${className ?? ""}`}
      />
    );
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") e.preventDefault();
      }}
      className={`${INLINE_CHROME} ${className ?? ""}`}
    />
  );
}

/**
 * Renders the “Volgend seminar” card. In CMS mode the card itself is editable
 * (no separate form above/below). Outside CMS, renders `children`.
 */
export function CmsNextEventCard({
  nextLabel,
  laterThisYearLabel,
  ticketSlot,
  children,
}: {
  nextLabel: string;
  laterThisYearLabel: string;
  ticketSlot?: ReactNode;
  children: ReactNode;
}) {
  const cms = useCmsOptional();
  const [draft, setDraft] = useState<Draft>(empty);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(draft);

  useEffect(() => {
    if (!cms?.enabled || !isFirebaseConfigured) {
      setReady(true);
      return;
    }
    const q = query(collection(getClientDb(), "events"), orderBy("date", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        if (dirty.current || saveTimer.current) return;
        const first = snap.docs[0];
        if (!first) {
          latest.current = empty;
          setDraft(empty);
          setReady(true);
          return;
        }
        const data = first.data();
        const next: Draft = {
          id: first.id,
          title: String((data.title as { nl?: string })?.nl ?? ""),
          description: String((data.description as { nl?: string })?.nl ?? ""),
          date: String(data.date ?? empty.date),
          time: String(data.time ?? empty.time),
          location: String(data.location ?? empty.location),
          address: String(data.address ?? empty.address),
          dateUncertain: Boolean(data.dateUncertain),
        };
        latest.current = next;
        setDraft(next);
        setReady(true);
      },
      () => setReady(true),
    );
  }, [cms?.enabled]);

  const persist = useEffectEvent(async (next: Draft) => {
    if (!next.title.trim()) {
      setStatus("Titel invullen…");
      return;
    }
    setStatus("Opslaan…");
    try {
      const res = await cmsAdminFetch("/api/admin/events", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      if (data.id && data.id !== next.id) {
        const withId = { ...next, id: data.id };
        latest.current = withId;
        setDraft(withId);
      }
      if (latest.current === next || latest.current.id === (data.id ?? next.id)) {
        dirty.current = false;
      }
      setStatus("Opgeslagen");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Opslaan mislukt");
    }
  });

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      latest.current = next;
      dirty.current = true;
      if (!ready) return next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus("Opslaan…");
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void persist(latest.current);
      }, DEBOUNCE_MS);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!cms?.enabled) return <>{children}</>;

  const datePreview = draft.dateUncertain
    ? laterThisYearLabel
    : draft.date
      ? formatEventDate(draft.date, "nl")
      : "";

  return (
    <div className="border-y border-ink/15 bg-bg-deep px-6 py-10 sm:px-8 md:py-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CmsField
          path="seminars.next"
          value={nextLabel}
          multiline={false}
          className="text-xs font-semibold tracking-[0.18em] text-gold uppercase"
        />
        <span className="text-[11px] text-ink-soft" aria-live="polite">
          {status ?? "Auto-save"}
        </span>
      </div>

      <InlineField
        value={draft.title}
        onChange={(title) => updateDraft({ title })}
        placeholder="Titel van het seminar"
        className="font-display mt-1 text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl"
      />

      <div className="mt-6 space-y-2">
        {draft.dateUncertain ? (
          <p className="font-display text-2xl leading-snug text-ink md:text-3xl">
            {datePreview}
          </p>
        ) : (
          <InlineField
            type="date"
            value={draft.date}
            onChange={(date) => updateDraft({ date })}
            className="font-display text-2xl leading-snug text-ink md:text-3xl"
          />
        )}
        {!draft.dateUncertain ? (
          <p className="text-sm text-ink-soft">{datePreview}</p>
        ) : null}
        <InlineField
          value={draft.time}
          onChange={(time) => updateDraft({ time })}
          placeholder="Tijd, bijv. 14:00–17:00"
          className="mt-1 text-base text-ink-soft md:text-lg"
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.dateUncertain}
            onChange={(e) =>
              updateDraft({ dateUncertain: e.target.checked })
            }
          />
          Datum nog onzeker (“{laterThisYearLabel}”)
        </label>
      </div>

      <div className="mt-8 border-l-2 border-gold pl-5">
        <InlineField
          value={draft.location}
          onChange={(location) => updateDraft({ location })}
          placeholder="Locatie"
          className="text-base font-medium text-ink md:text-lg"
        />
        <InlineField
          value={draft.address}
          onChange={(address) => updateDraft({ address })}
          placeholder="Adres"
          className="mt-2 text-sm text-ink-soft md:text-base"
        />
      </div>

      <InlineField
        value={draft.description}
        onChange={(description) => updateDraft({ description })}
        multiline
        placeholder="Korte beschrijving (optioneel)"
        className="mt-6 text-sm text-ink-soft"
      />

      {ticketSlot}
    </div>
  );
}

/** @deprecated Use CmsNextEventCard */
export function CmsEventEditor() {
  return null;
}
