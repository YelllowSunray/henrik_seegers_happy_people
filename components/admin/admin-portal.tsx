"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
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
import {
  AdminBillingUsage,
  useBillingOverBudget,
} from "@/components/billing-banner";
import { useAuth } from "@/components/auth-provider";
import { AdminChatPanel } from "@/components/admin-chat-panel";
import {
  MemberIdentity,
  memberOptionLabel,
} from "@/components/member-status-badge";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { memberBillingKind } from "@/lib/member-status";
import { Link } from "@/i18n/navigation";
import type {
  BlogPost,
  MemberProfile,
  PersonalMessage,
  QuoteItem,
  SeminarEvent,
  VideoItem,
  VideoKind,
} from "@/lib/types";

type Tab =
  | "posts"
  | "events"
  | "videos"
  | "quotes"
  | "messages"
  | "subscribers"
  | "chat";

type Subscriber = MemberProfile & { id: string };

function formatCreatedAt(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString()
      .slice(0, 10);
  }
  return String(value ?? "");
}

const fieldClass =
  "mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-accent";
const labelClass = "block text-sm font-medium text-ink";
const btnClass =
  "inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-50";
const btnGhost =
  "inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-bg-deep";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

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
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messageTarget, setMessageTarget] = useState<{
    toUserId: string;
    toEmail: string;
  } | null>(null);

  const [chatFocusUid, setChatFocusUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !isAdmin) return;
    const db = getClientDb();
    const ignore = () => {
      /* permission / offline — keep last good state */
    };
    const unsubs = [
      onSnapshot(
        collection(db, "posts"),
        (snap) => {
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
        },
        ignore,
      ),
      onSnapshot(
        collection(db, "events"),
        (snap) => {
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
                  address:
                    typeof data.address === "string" ? data.address : undefined,
                  priceLabel:
                    typeof data.priceLabel === "string"
                      ? data.priceLabel
                      : undefined,
                } as SeminarEvent;
              })
              .sort((a, b) => a.date.localeCompare(b.date)),
          );
        },
        ignore,
      ),
      onSnapshot(
        collection(db, "videos"),
        (snap) => {
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
        },
        ignore,
      ),
      onSnapshot(
        collection(db, "quotes"),
        (snap) => {
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
        },
        ignore,
      ),
      onSnapshot(
        collection(db, "personalMessages"),
        (snap) => {
          setMessages(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                toUserId: String(data.toUserId ?? ""),
                toEmail: data.toEmail,
                subject: data.subject ?? { nl: "" },
                body: data.body ?? { nl: "" },
                createdAt: formatCreatedAt(data.createdAt),
                read: Boolean(data.read),
              } as PersonalMessage;
            }),
          );
        },
        ignore,
      ),
      onSnapshot(
        collection(db, "members"),
        (snap) => {
          setSubscribers(
            snap.docs
              .map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  uid: String(data.uid ?? d.id),
                  email: String(data.email ?? ""),
                  displayName: data.displayName as string | undefined,
                  phone: data.phone as string | undefined,
                  photoURL: data.photoURL as string | undefined,
                  onboardingCompleted: Boolean(data.onboardingCompleted),
                  trialEndsAt: data.trialEndsAt as string | undefined,
                  subscriptionStatus:
                    (data.subscriptionStatus as MemberProfile["subscriptionStatus"]) ??
                    "none",
                  membershipPlan:
                    data.membershipPlan as MemberProfile["membershipPlan"],
                  stripeCustomerId: data.stripeCustomerId as string | undefined,
                  stripeSubscriptionId: data.stripeSubscriptionId as
                    | string
                    | undefined,
                  isAdmin: Boolean(data.isAdmin),
                } satisfies Subscriber;
              })
              .sort((a, b) => {
                const an = (a.displayName || a.email).toLowerCase();
                const bn = (b.displayName || b.email).toLowerCase();
                return an.localeCompare(bn);
              }),
          );
        },
        ignore,
      ),
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
          createdAt: serverTimestamp(),
          ...data,
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
          {user ? (
            <Link
              href="/members"
              className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
            >
              Leden
            </Link>
          ) : (
            <Link
              href="/auth"
              className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </>
    );
  }

  const navSections: { audience: "public" | "club"; tabs: Tab[] }[] = [
    { audience: "public", tabs: ["events", "posts"] },
    { audience: "club", tabs: ["subscribers", "chat", "videos", "quotes", "messages"] },
  ];
  const editingPost = posts.find((p) => p.id === editingId);
  const editingEvent = events.find((e) => e.id === editingId);
  const editingVideo = videos.find((v) => v.id === editingId);
  const editingQuote = quotes.find((q) => q.id === editingId);
  const editingMessage = messages.find((m) => m.id === editingId);

  const trialSubscribers = subscribers.filter(
    (s) => !s.isAdmin && memberBillingKind(s) === "trial",
  );
  const paidSubscribers = subscribers.filter(
    (s) => !s.isAdmin && memberBillingKind(s) === "paid",
  );
  const otherSubscribers = subscribers.filter(
    (s) => !s.isAdmin && memberBillingKind(s) === "other",
  );
  const messageRecipients = subscribers.filter((s) => !s.isAdmin && s.email);

  const tabHint =
    tab === "posts"
      ? t("tabHintPosts")
      : tab === "events"
        ? t("tabHintEvents")
        : tab === "videos"
          ? t("tabHintVideos")
          : tab === "quotes"
            ? t("tabHintQuotes")
            : tab === "subscribers"
              ? t("tabHintSubscribers")
              : tab === "chat"
                ? t("tabHintChat")
                : t("tabHintMessages");

  const tabAudience: "public" | "club" =
    tab === "events" || tab === "posts" ? "public" : "club";

  function selectTab(next: Tab) {
    setTab(next);
    setEditingId(null);
    setStatus(null);
    if (next !== "messages") setMessageTarget(null);
  }

  function writeMessageTo(member: Subscriber) {
    setMessageTarget({
      toUserId: member.uid,
      toEmail: member.email,
    });
    setEditingId(null);
    setStatus(null);
    setTab("messages");
  }

  function openChatWith(member: Subscriber) {
    setEditingId(null);
    setStatus(null);
    setChatFocusUid(member.uid);
    setTab("chat");
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <header className="border-b border-line pb-5">
          <h1 className="font-display text-3xl text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
          <AdminBillingUsage />
          <Link
            href="/admin/accounts"
            className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
          >
            {t("accountsLink")}
          </Link>
        </header>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:gap-10">
          <aside className="w-full shrink-0 md:w-48">
            {navSections.map((section) => (
              <div key={section.audience} className="mb-7">
                <p
                  className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
                    section.audience === "club" ? "text-accent" : "text-ink-soft"
                  }`}
                >
                  {section.audience === "public"
                    ? t("audiencePublic")
                    : t("audienceClub")}
                </p>
                <nav className="mt-2 space-y-0.5">
                  {section.tabs.map((key) => (
                    <button
                      key={`${section.audience}-${key}`}
                      type="button"
                      onClick={() => selectTab(key)}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        tab === key
                          ? "bg-accent font-medium text-white"
                          : "text-ink hover:bg-bg-deep"
                      }`}
                    >
                      {t(key)}
                    </button>
                  ))}
                </nav>
              </div>
            ))}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl text-ink">{t(tab)}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  tabAudience === "public"
                    ? "bg-bg-deep text-ink-soft"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {tabAudience === "public" ? t("badgePublic") : t("badgeClub")}
              </span>
            </div>
            <p className="mb-6 text-sm text-ink-soft">{tabHint}</p>
            {status && (
              <p className="mb-4 text-sm font-medium text-accent">{status}</p>
            )}

            {tab === "subscribers" ? (
              <SubscribersPanel
                trial={trialSubscribers}
                paid={paidSubscribers}
                other={otherSubscribers}
                onMessage={writeMessageTo}
                onChat={openChatWith}
                labels={{
                  trial: t("subscribersTrial"),
                  paid: t("subscribersPaid"),
                  other: t("subscribersOther"),
                  empty: t("subscribersEmpty"),
                  write: t("writeMessage"),
                  chat: t("openChat"),
                  planMonthly: t("planMonthly"),
                  planYearly: t("planYearly"),
                  statusNone: t("statusNone"),
                  statusPastDue: t("statusPastDue"),
                  statusCanceled: t("statusCanceled"),
                }}
              />
            ) : tab === "chat" ? (
              <AdminChatPanel
                focusMemberUid={chatFocusUid}
                subscribers={subscribers}
              />
            ) : (
              <>
            <section className="rounded-lg border border-line bg-white/60 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">
                  {editingId ? t("edit") : t("newItem")}
                </h3>
                {editingId && (
                  <button
                    type="button"
                    className="text-sm text-ink-soft underline-offset-2 hover:underline"
                    onClick={() => {
                      setEditingId(null);
                      setMessageTarget(null);
                    }}
                  >
                    {t("newItem")}
                  </button>
                )}
              </div>

              {tab === "posts" && (
                <PostForm
                  key={editingPost?.id ?? "new-post"}
                  initial={editingPost}
                  disabled={overBudget}
                  saveLabel={t("save")}
                  cancelLabel={t("cancel")}
                  audienceLabel={t("audienceLabel")}
                  publicOption={t("audiencePublicOption")}
                  clubOption={t("audienceClubOption")}
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
                  audienceLabel={t("audienceLabel")}
                  kindSeminar={t("videoKindSeminar")}
                  kindVlog={t("videoKindVlog")}
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
                  key={
                    editingMessage?.id ??
                    messageTarget?.toUserId ??
                    "new-message"
                  }
                  initial={editingMessage}
                  prefill={messageTarget}
                  recipients={messageRecipients}
                  disabled={overBudget}
                  saveLabel={t("save")}
                  onCancel={() => {
                    setEditingId(null);
                    setMessageTarget(null);
                  }}
                  onSubmit={(data) =>
                    void upsert(
                      "personalMessages",
                      editingMessage?.id ?? null,
                      data,
                    ).then(() => setMessageTarget(null))
                  }
                />
              )}
            </section>

            <section className="mt-10">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">
                {t("existingItems")}
              </h3>
              {tab === "posts" && (
                <ItemList
                  empty={t("empty")}
                  items={posts.map((p) => ({
                    id: p.id,
                    title: nl(p.title),
                    meta: p.publishedAt,
                    audience: p.membersOnly ? "club" : "public",
                  }))}
                  onEdit={setEditingId}
                  onDelete={(id) => void remove("posts", id)}
                  labels={{
                    edit: t("edit"),
                    delete: t("delete"),
                    public: t("badgePublic"),
                    club: t("badgeClub"),
                  }}
                />
              )}
              {tab === "events" && (
                <ItemList
                  empty={t("empty")}
                  items={events.map((e) => ({
                    id: e.id,
                    title: nl(e.title),
                    meta: `${e.date} · ${e.location}${e.address ? ` · ${e.address}` : ""}`,
                    audience: "public" as const,
                  }))}
                  onEdit={setEditingId}
                  onDelete={(id) => void remove("events", id)}
                  labels={{
                    edit: t("edit"),
                    delete: t("delete"),
                    public: t("badgePublic"),
                    club: t("badgeClub"),
                  }}
                />
              )}
              {tab === "videos" && (
                <ItemList
                  empty={t("empty")}
                  items={videos
                    .filter((v) => v.kind !== "sample")
                    .map((v) => ({
                      id: v.id,
                      title: nl(v.title),
                      meta: `${v.kind} · ${v.publishedAt}`,
                      audience: "club" as const,
                    }))}
                  onEdit={setEditingId}
                  onDelete={(id) => void remove("videos", id)}
                  labels={{
                    edit: t("edit"),
                    delete: t("delete"),
                    public: t("badgePublic"),
                    club: t("badgeClub"),
                  }}
                />
              )}
              {tab === "quotes" && (
                <ItemList
                  empty={t("empty")}
                  items={quotes.map((q) => ({
                    id: q.id,
                    title: nl(q.text).slice(0, 80),
                    meta: q.publishedAt,
                    audience: "club" as const,
                  }))}
                  onEdit={setEditingId}
                  onDelete={(id) => void remove("quotes", id)}
                  labels={{
                    edit: t("edit"),
                    delete: t("delete"),
                    public: t("badgePublic"),
                    club: t("badgeClub"),
                  }}
                />
              )}
              {tab === "messages" && (
                <ItemList
                  empty={t("empty")}
                  items={messages.map((m) => ({
                    id: m.id,
                    title: nl(m.subject),
                    meta: m.toEmail ?? m.createdAt,
                    audience: "club" as const,
                  }))}
                  onEdit={setEditingId}
                  onDelete={(id) => void remove("personalMessages", id)}
                  labels={{
                    edit: t("edit"),
                    delete: t("delete"),
                    public: t("badgePublic"),
                    club: t("badgeClub"),
                  }}
                />
              )}
            </section>
              </>
            )}
          </main>
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
  items: {
    id: string;
    title: string;
    meta: string;
    audience: "public" | "club";
  }[];
  empty: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  labels: { edit: string; delete: string; public: string; club: string };
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-line border border-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink">{item.title || "Untitled"}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  item.audience === "public"
                    ? "bg-bg-deep text-ink-soft"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {item.audience === "public" ? labels.public : labels.club}
              </span>
            </div>
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
  audienceLabel,
  publicOption,
  clubOption,
  onCancel,
  onSubmit,
}: {
  initial?: BlogPost;
  disabled: boolean;
  saveLabel: string;
  cancelLabel: string;
  audienceLabel: string;
  publicOption: string;
  clubOption: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin");
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      slug: String(fd.get("slug")),
      title: { nl: String(fd.get("title")) },
      excerpt: { nl: String(fd.get("excerpt")) },
      body: { nl: String(fd.get("body")) },
      membersOnly: fd.get("audience") === "club",
      publishedAt:
        String(fd.get("publishedAt")) ||
        new Date().toISOString().slice(0, 10),
    });
  }
  return (
    <form onSubmit={handle} className="grid max-w-xl gap-4">
      <fieldset className="space-y-2 rounded-md border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-ink">
          {audienceLabel}
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="audience"
            value="public"
            defaultChecked={!initial?.membersOnly}
            className="mt-1"
          />
          <span>{publicOption}</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="audience"
            value="club"
            defaultChecked={Boolean(initial?.membersOnly)}
            className="mt-1"
          />
          <span>{clubOption}</span>
        </label>
      </fieldset>
      <Field label={t("fieldTitle")}>
        <input
          name="title"
          required
          defaultValue={nl(initial?.title)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldSlug")}>
        <input
          name="slug"
          required
          defaultValue={initial?.slug}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldExcerpt")}>
        <input
          name="excerpt"
          required
          defaultValue={nl(initial?.excerpt)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldBody")}>
        <textarea
          name="body"
          required
          rows={8}
          defaultValue={nl(initial?.body)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldDate")}>
        <input
          name="publishedAt"
          type="date"
          defaultValue={
            initial?.publishedAt || new Date().toISOString().slice(0, 10)
          }
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-1">
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
  const t = useTranslations("admin");
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      title: { nl: String(fd.get("title")) },
      description: { nl: String(fd.get("description")) },
      date: String(fd.get("date")),
      time: String(fd.get("time")),
      location: String(
        fd.get("location") || "Van der Valk Hotel Amersfoort",
      ),
      address: String(
        fd.get("address") || "Ruimtevaart 22-24, 3824 MX Amersfoort",
      ),
    });
  }
  return (
    <form onSubmit={handle} className="grid max-w-xl gap-4">
      <Field label={t("fieldTitle")}>
        <input
          name="title"
          required
          defaultValue={nl(initial?.title)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldDescription")}>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={nl(initial?.description)}
          className={fieldClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fieldDate")}>
          <input
            name="date"
            type="date"
            required
            defaultValue={initial?.date}
            className={fieldClass}
          />
        </Field>
        <Field label={t("fieldTime")}>
          <input
            name="time"
            placeholder="14:00–17:00"
            required
            defaultValue={initial?.time}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field label={t("fieldLocation")}>
        <input
          name="location"
          defaultValue={
            initial?.location || "Van der Valk Hotel Amersfoort"
          }
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldAddress")}>
        <input
          name="address"
          placeholder="Ruimtevaart 22-24, 3824 MX Amersfoort"
          defaultValue={
            initial?.address || "Ruimtevaart 22-24, 3824 MX Amersfoort"
          }
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            {t("cancel")}
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
  audienceLabel,
  kindSeminar,
  kindVlog,
  onCancel,
  onSubmit,
}: {
  initial?: VideoItem;
  disabled: boolean;
  saveLabel: string;
  audienceLabel: string;
  kindSeminar: string;
  kindVlog: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin");
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
    <form onSubmit={handle} className="grid max-w-xl gap-4">
      <Field label={audienceLabel}>
        <select
          name="kind"
          className={fieldClass}
          defaultValue={
            initial?.kind === "sample" ? "seminar" : initial?.kind || "seminar"
          }
        >
          <option value="seminar">{kindSeminar}</option>
          <option value="vlog">{kindVlog}</option>
        </select>
      </Field>
      <Field label={t("fieldTitle")}>
        <input
          name="title"
          required
          defaultValue={nl(initial?.title)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldDescription")}>
        <input
          name="description"
          defaultValue={nl(initial?.description)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldUrl")}>
        <input
          name="videoUrl"
          defaultValue={initial?.videoUrl}
          className={fieldClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fieldDuration")}>
          <input
            name="duration"
            defaultValue={initial?.durationLabel}
            className={fieldClass}
          />
        </Field>
        <Field label={t("fieldDate")}>
          <input
            name="publishedAt"
            type="date"
            defaultValue={
              initial?.publishedAt || new Date().toISOString().slice(0, 10)
            }
            className={fieldClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            {t("cancel")}
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
  const t = useTranslations("admin");
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
    <form onSubmit={handle} className="grid max-w-xl gap-4">
      <Field label={t("fieldBody")}>
        <textarea
          name="text"
          required
          rows={4}
          defaultValue={nl(initial?.text)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldDate")}>
        <input
          name="publishedAt"
          type="date"
          defaultValue={
            initial?.publishedAt || new Date().toISOString().slice(0, 10)
          }
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {initial && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function SubscribersPanel({
  trial,
  paid,
  other,
  onMessage,
  onChat,
  labels,
}: {
  trial: Subscriber[];
  paid: Subscriber[];
  other: Subscriber[];
  onMessage: (member: Subscriber) => void;
  onChat: (member: Subscriber) => void;
  labels: {
    trial: string;
    paid: string;
    other: string;
    empty: string;
    write: string;
    chat: string;
    planMonthly: string;
    planYearly: string;
    statusNone: string;
    statusPastDue: string;
    statusCanceled: string;
  };
}) {
  function Group({
    title,
    items,
  }: {
    title: string;
    items: Subscriber[];
  }) {
    return (
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
            {title}
          </h3>
          <span className="text-xs text-ink-soft">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">{labels.empty}</p>
        ) : (
          <ul className="divide-y divide-line border border-line bg-white/60">
            {items.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <MemberIdentity profile={s} />
                  {s.phone && (
                    <p className="mt-1 pl-14 text-xs text-ink-soft">{s.phone}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => onChat(s)}
                  >
                    {labels.chat}
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => onMessage(s)}
                  >
                    {labels.write}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div>
      <Group title={labels.trial} items={trial} />
      <Group title={labels.paid} items={paid} />
      <Group title={labels.other} items={other} />
    </div>
  );
}

function MessageForm({
  initial,
  prefill,
  recipients,
  disabled,
  saveLabel,
  onCancel,
  onSubmit,
}: {
  initial?: PersonalMessage;
  prefill?: { toUserId: string; toEmail: string } | null;
  recipients: Subscriber[];
  disabled: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin");
  const defaultEmail = initial?.toEmail || prefill?.toEmail || "";
  const defaultUid = initial?.toUserId || prefill?.toUserId || "";
  const [toUserId, setToUserId] = useState(defaultUid);
  const [toEmail, setToEmail] = useState(defaultEmail);

  const selected = recipients.find(
    (r) =>
      r.uid === toUserId ||
      (toEmail && r.email.toLowerCase() === toEmail.toLowerCase()),
  );

  function selectRecipient(value: string) {
    if (!value) {
      setToUserId("");
      setToEmail("");
      return;
    }
    const [uid, ...rest] = value.split("|");
    setToUserId(uid);
    setToEmail(rest.join("|"));
  }

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("toEmail") || toEmail)
      .trim()
      .toLowerCase();
    const uid = String(fd.get("toUserId") || toUserId).trim();
    const matched = recipients.find(
      (r) => r.uid === uid || r.email.toLowerCase() === email,
    );
    onSubmit({
      toEmail: email,
      toUserId: matched?.uid || uid,
      subject: { nl: String(fd.get("subject")) },
      body: { nl: String(fd.get("body")) },
      read: false,
      createdAt: initial?.createdAt || new Date().toISOString().slice(0, 10),
    });
  }

  const selectValue =
    toUserId && toEmail ? `${toUserId}|${toEmail}` : "";

  const optionLabels = {
    trial: t("subscribersTrialShort"),
    trialDays: (days: number) => t("badgeTrialDays", { days }),
    paid: t("subscribersPaidShort"),
    paidMonthly: t("badgePaidMonthly"),
    paidYearly: t("badgePaidYearly"),
    other: t("badgeOther"),
  };

  return (
    <form onSubmit={handle} className="grid max-w-xl gap-4">
      {recipients.length > 0 && (
        <Field label={t("fieldMember")}>
          <select
            className={fieldClass}
            value={selectValue}
            onChange={(e) => selectRecipient(e.target.value)}
            required={!initial}
          >
            <option value="">{t("pickMember")}</option>
            {recipients.map((r) => (
              <option key={r.id} value={`${r.uid}|${r.email}`}>
                {memberOptionLabel(r, optionLabels)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {selected && (
        <div className="border border-line bg-bg-deep/40 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
            {t("selectedMember")}
          </p>
          <MemberIdentity profile={selected} />
          {selected.phone && (
            <p className="mt-2 text-xs text-ink-soft">{selected.phone}</p>
          )}
        </div>
      )}

      {!selected && (
        <Field label={t("fieldEmail")}>
          <input
            name="toEmail"
            type="email"
            required
            value={toEmail}
            onChange={(e) => {
              setToEmail(e.target.value);
              setToUserId("");
            }}
            className={fieldClass}
            placeholder={t("fieldEmailHint")}
          />
        </Field>
      )}
      {selected && (
        <input type="hidden" name="toEmail" value={selected.email} />
      )}
      <input type="hidden" name="toUserId" value={toUserId || selected?.uid || ""} />
      <Field label={t("fieldSubject")}>
        <input
          name="subject"
          required
          defaultValue={nl(initial?.subject)}
          className={fieldClass}
        />
      </Field>
      <Field label={t("fieldBody")}>
        <textarea
          name="body"
          required
          rows={5}
          defaultValue={nl(initial?.body)}
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className={btnClass} disabled={disabled}>
          {saveLabel}
        </button>
        {(initial || prefill) && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
