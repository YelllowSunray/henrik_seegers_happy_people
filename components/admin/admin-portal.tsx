"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { SiteHeader } from "@/components/site-header";
import { useBillingOverBudget } from "@/components/billing-banner";
import { useAuth } from "@/components/auth-provider";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { Link } from "@/i18n/navigation";
import type {
  BlogPost,
  PersonalMessage,
  QuoteItem,
  SeminarEvent,
  VideoItem,
  VideoKind,
} from "@/lib/types";

type Tab = "posts" | "events" | "videos" | "quotes" | "messages";

const fieldClass =
  "w-full border border-line bg-white/70 px-3 py-2.5 text-base outline-none focus:border-accent";
const btnClass =
  "inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-50";
const btnGhost =
  "inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-bg-deep";

function nl(value: unknown) {
  if (value && typeof value === "object" && "nl" in (value as object)) {
    return String((value as { nl?: string }).nl ?? "");
  }
  return typeof value === "string" ? value : "";
}

export function AdminPortal() {
  const t = useTranslations("admin");
  const { user, isAdmin, loading } = useAuth();
  const overBudget = useBillingOverBudget();
  const [tab, setTab] = useState<Tab>("posts");
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [events, setEvents] = useState<SeminarEvent[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [messages, setMessages] = useState<PersonalMessage[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !isAdmin) return;
    const db = getClientDb();
    const unsubs = [
      onSnapshot(collection(db, "posts"), (snap) => {
        setPosts(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                slug: String(data.slug ?? ""),
                title: data.title ?? { nl: "" },
                excerpt: data.excerpt ?? { nl: "" },
                body: data.body ?? { nl: "" },
                publishedAt: String(data.publishedAt ?? ""),
                membersOnly: Boolean(data.membersOnly),
              } as BlogPost;
            })
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        );
      }),
      onSnapshot(collection(db, "events"), (snap) => {
        setEvents(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: data.title ?? { nl: "" },
                description: data.description ?? { nl: "" },
                date: String(data.date ?? ""),
                time: String(data.time ?? ""),
                location: String(data.location ?? ""),
              } as SeminarEvent;
            })
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
      }),
      onSnapshot(collection(db, "videos"), (snap) => {
        setVideos(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: data.title ?? { nl: "" },
                description: data.description ?? { nl: "" },
                kind: (data.kind ?? "seminar") as VideoKind,
                videoUrl: data.videoUrl,
                publishedAt: String(data.publishedAt ?? ""),
                durationLabel: data.durationLabel,
              } as VideoItem;
            })
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        );
      }),
      onSnapshot(collection(db, "quotes"), (snap) => {
        setQuotes(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                text: data.text ?? { nl: "" },
                publishedAt: String(data.publishedAt ?? ""),
              } as QuoteItem;
            })
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        );
      }),
      onSnapshot(collection(db, "personalMessages"), (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              toUserId: String(data.toUserId ?? ""),
              toEmail: data.toEmail,
              subject: data.subject ?? { nl: "" },
              body: data.body ?? { nl: "" },
              createdAt: String(data.createdAt ?? ""),
              read: Boolean(data.read),
            } as PersonalMessage;
          }),
        );
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  const guardWrite = useCallback(() => {
    if (overBudget) {
      setStatus(t("blocked"));
      return false;
    }
    if (!isFirebaseConfigured) {
      setStatus("Firebase not configured.");
      return false;
    }
    return true;
  }, [overBudget, t]);

  async function upsert(
    col: string,
    id: string | null,
    data: Record<string, unknown>,
  ) {
    if (!guardWrite()) return;
    setStatus("Saving…");
    try {
      const db = getClientDb();
      if (id) {
        await updateDoc(doc(db, col, id), data);
      } else {
        await addDoc(collection(db, col), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setEditingId(null);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(col: string, id: string) {
    if (!guardWrite()) return;
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(getClientDb(), col, id));
      setStatus("Deleted.");
      if (editingId === id) setEditingId(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader variant="solid" />
        <p className="p-16 text-center">…</p>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <SiteHeader variant="solid" />
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-display text-3xl">{t("denied")}</h1>
          <p className="mt-4 text-ink-soft">{t("signInHint")}</p>
          <Link
            href="/auth?next=/admin"
            className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </>
    );
  }

  const tabs: Tab[] = ["posts", "events", "videos", "quotes", "messages"];
  const editingPost = posts.find((p) => p.id === editingId);
  const editingEvent = events.find((e) => e.id === editingId);
  const editingVideo = videos.find((v) => v.id === editingId);
  const editingQuote = quotes.find((q) => q.id === editingId);
  const editingMessage = messages.find((m) => m.id === editingId);

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-12">
        <h1 className="font-display text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t("subtitle")} · {user.email}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setEditingId(null);
              }}
              className={`rounded-full px-3.5 py-2 text-sm ${
                tab === key
                  ? "bg-accent text-white"
                  : "border border-line text-ink-soft"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {status && <p className="mt-6 text-sm text-accent">{status}</p>}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl">{t(tab)}</h2>
              <button
                type="button"
                className={btnGhost}
                onClick={() => setEditingId(null)}
              >
                {t("newItem")}
              </button>
            </div>

            {tab === "posts" && (
              <ItemList
                empty={t("empty")}
                items={posts.map((p) => ({
                  id: p.id,
                  title: nl(p.title),
                  meta: `${p.publishedAt}${p.membersOnly ? " · members" : ""}`,
                }))}
                onEdit={setEditingId}
                onDelete={(id) => void remove("posts", id)}
                labels={{ edit: t("edit"), delete: t("delete") }}
              />
            )}
            {tab === "events" && (
              <ItemList
                empty={t("empty")}
                items={events.map((e) => ({
                  id: e.id,
                  title: nl(e.title),
                  meta: `${e.date} · ${e.location}`,
                }))}
                onEdit={setEditingId}
                onDelete={(id) => void remove("events", id)}
                labels={{ edit: t("edit"), delete: t("delete") }}
              />
            )}
            {tab === "videos" && (
              <ItemList
                empty={t("empty")}
                items={videos.map((v) => ({
                  id: v.id,
                  title: nl(v.title),
                  meta: `${v.kind} · ${v.publishedAt}`,
                }))}
                onEdit={setEditingId}
                onDelete={(id) => void remove("videos", id)}
                labels={{ edit: t("edit"), delete: t("delete") }}
              />
            )}
            {tab === "quotes" && (
              <ItemList
                empty={t("empty")}
                items={quotes.map((q) => ({
                  id: q.id,
                  title: nl(q.text).slice(0, 80),
                  meta: q.publishedAt,
                }))}
                onEdit={setEditingId}
                onDelete={(id) => void remove("quotes", id)}
                labels={{ edit: t("edit"), delete: t("delete") }}
              />
            )}
            {tab === "messages" && (
              <ItemList
                empty={t("empty")}
                items={messages.map((m) => ({
                  id: m.id,
                  title: nl(m.subject),
                  meta: m.toEmail ?? m.createdAt,
                }))}
                onEdit={setEditingId}
                onDelete={(id) => void remove("personalMessages", id)}
                labels={{ edit: t("edit"), delete: t("delete") }}
              />
            )}
          </div>

          <div className="border border-line bg-bg/80 p-5 sm:p-6">
            {tab === "posts" && (
              <PostForm
                key={editingPost?.id ?? "new-post"}
                initial={editingPost}
                disabled={overBudget}
                saveLabel={t("save")}
                cancelLabel={t("cancel")}
                membersOnlyLabel={t("membersOnly")}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) =>
                  void upsert("posts", editingPost?.id ?? null, data)
                }
              />
            )}
            {tab === "events" && (
              <EventForm
                key={editingEvent?.id ?? "new-event"}
                initial={editingEvent}
                disabled={overBudget}
                saveLabel={t("save")}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) =>
                  void upsert("events", editingEvent?.id ?? null, data)
                }
              />
            )}
            {tab === "videos" && (
              <VideoForm
                key={editingVideo?.id ?? "new-video"}
                initial={editingVideo}
                disabled={overBudget}
                saveLabel={t("save")}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) =>
                  void upsert("videos", editingVideo?.id ?? null, data)
                }
              />
            )}
            {tab === "quotes" && (
              <QuoteForm
                key={editingQuote?.id ?? "new-quote"}
                initial={editingQuote}
                disabled={overBudget}
                saveLabel={t("save")}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) =>
                  void upsert("quotes", editingQuote?.id ?? null, data)
                }
              />
            )}
            {tab === "messages" && (
              <MessageForm
                key={editingMessage?.id ?? "new-message"}
                initial={editingMessage}
                disabled={overBudget}
                saveLabel={t("save")}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) =>
                  void upsert(
                    "personalMessages",
                    editingMessage?.id ?? null,
                    data,
                  )
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ItemList({
  items,
  empty,
  onEdit,
  onDelete,
  labels,
}: {
  items: { id: string; title: string; meta: string }[];
  empty: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  labels: { edit: string; delete: string };
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-line border border-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-medium text-ink">{item.title || "Untitled"}</p>
            <p className="mt-1 text-xs text-ink-soft">{item.meta}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={btnGhost} onClick={() => onEdit(item.id)}>
              {labels.edit}
            </button>
            <button
              type="button"
              className="text-sm text-red-700"
              onClick={() => onDelete(item.id)}
            >
              {labels.delete}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PostForm({
  initial,
  disabled,
  saveLabel,
  cancelLabel,
  membersOnlyLabel,
  onCancel,
  onSubmit,
}: {
  initial?: BlogPost;
  disabled: boolean;
  saveLabel: string;
  cancelLabel: string;
  membersOnlyLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      slug: String(fd.get("slug")),
      title: { nl: String(fd.get("title")) },
      excerpt: { nl: String(fd.get("excerpt")) },
      body: { nl: String(fd.get("body")) },
      membersOnly: fd.get("membersOnly") === "on",
      publishedAt:
        String(fd.get("publishedAt")) ||
        new Date().toISOString().slice(0, 10),
    });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <input
        name="slug"
        placeholder="slug"
        required
        defaultValue={initial?.slug}
        className={fieldClass}
      />
      <input
        name="title"
        placeholder="Title"
        required
        defaultValue={nl(initial?.title)}
        className={fieldClass}
      />
      <input
        name="excerpt"
        placeholder="Excerpt"
        required
        defaultValue={nl(initial?.excerpt)}
        className={fieldClass}
      />
      <textarea
        name="body"
        placeholder="Body"
        required
        rows={8}
        defaultValue={nl(initial?.body)}
        className={fieldClass}
      />
      <input
        name="publishedAt"
        type="date"
        defaultValue={initial?.publishedAt || new Date().toISOString().slice(0, 10)}
        className={fieldClass}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="membersOnly"
          defaultChecked={initial?.membersOnly}
        />
        {membersOnlyLabel}
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}

function EventForm({
  initial,
  disabled,
  saveLabel,
  onCancel,
  onSubmit,
}: {
  initial?: SeminarEvent;
  disabled: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      title: { nl: String(fd.get("title")) },
      description: { nl: String(fd.get("description")) },
      date: String(fd.get("date")),
      time: String(fd.get("time")),
      location: String(fd.get("location") || "Almere"),
    });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <input
        name="title"
        placeholder="Seminar title"
        required
        defaultValue={nl(initial?.title)}
        className={fieldClass}
      />
      <textarea
        name="description"
        placeholder="Description"
        required
        rows={5}
        defaultValue={nl(initial?.description)}
        className={fieldClass}
      />
      <input
        name="date"
        type="date"
        required
        defaultValue={initial?.date}
        className={fieldClass}
      />
      <input
        name="time"
        placeholder="14:00–17:00"
        required
        defaultValue={initial?.time}
        className={fieldClass}
      />
      <input
        name="location"
        placeholder="Almere"
        defaultValue={initial?.location || "Almere"}
        className={fieldClass}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function VideoForm({
  initial,
  disabled,
  saveLabel,
  onCancel,
  onSubmit,
}: {
  initial?: VideoItem;
  disabled: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      title: { nl: String(fd.get("title")) },
      description: { nl: String(fd.get("description")) },
      kind: String(fd.get("kind")),
      videoUrl: String(fd.get("videoUrl") || ""),
      durationLabel: String(fd.get("duration") || ""),
      publishedAt:
        String(fd.get("publishedAt")) ||
        new Date().toISOString().slice(0, 10),
    });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <input
        name="title"
        placeholder="Title"
        required
        defaultValue={nl(initial?.title)}
        className={fieldClass}
      />
      <input
        name="description"
        placeholder="Description"
        defaultValue={nl(initial?.description)}
        className={fieldClass}
      />
      <select
        name="kind"
        className={fieldClass}
        defaultValue={initial?.kind || "seminar"}
      >
        <option value="seminar">Seminar recording</option>
        <option value="vlog">Vlog</option>
        <option value="sample">Public sample</option>
      </select>
      <input
        name="videoUrl"
        placeholder="Video URL"
        defaultValue={initial?.videoUrl}
        className={fieldClass}
      />
      <input
        name="duration"
        placeholder="Duration e.g. 8 min"
        defaultValue={initial?.durationLabel}
        className={fieldClass}
      />
      <input
        name="publishedAt"
        type="date"
        defaultValue={initial?.publishedAt || new Date().toISOString().slice(0, 10)}
        className={fieldClass}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function QuoteForm({
  initial,
  disabled,
  saveLabel,
  onCancel,
  onSubmit,
}: {
  initial?: QuoteItem;
  disabled: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      text: { nl: String(fd.get("text")) },
      publishedAt:
        String(fd.get("publishedAt")) ||
        new Date().toISOString().slice(0, 10),
    });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <textarea
        name="text"
        placeholder="Quote"
        required
        rows={4}
        defaultValue={nl(initial?.text)}
        className={fieldClass}
      />
      <input
        name="publishedAt"
        type="date"
        defaultValue={initial?.publishedAt || new Date().toISOString().slice(0, 10)}
        className={fieldClass}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function MessageForm({
  initial,
  disabled,
  saveLabel,
  onCancel,
  onSubmit,
}: {
  initial?: PersonalMessage;
  disabled: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      toEmail: String(fd.get("toEmail")),
      toUserId: String(fd.get("toUserId") || ""),
      subject: { nl: String(fd.get("subject")) },
      body: { nl: String(fd.get("body")) },
      read: false,
      createdAt:
        initial?.createdAt || new Date().toISOString().slice(0, 10),
    });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <input
        name="toEmail"
        type="email"
        placeholder="Member email"
        required
        defaultValue={initial?.toEmail}
        className={fieldClass}
      />
      <input
        name="subject"
        placeholder="Subject"
        required
        defaultValue={nl(initial?.subject)}
        className={fieldClass}
      />
      <textarea
        name="body"
        placeholder="Personal message"
        required
        rows={5}
        defaultValue={nl(initial?.body)}
        className={fieldClass}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
