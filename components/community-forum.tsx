"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  COMMUNITY_POSTS_COLLECTION,
  displayNameFromUser,
  formatForumTime,
  type CommunityComment,
  type CommunityPost,
} from "@/lib/community-forum";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { signInHref } from "@/lib/auth-href";

function toIso(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export function CommunityForum() {
  const t = useTranslations("communityForum");
  const locale = useLocale();
  const { user, loading, isAdmin } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setReady(true);
      return;
    }
    const q = query(
      collection(getClientDb(), COMMUNITY_POSTS_COLLECTION),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setPosts(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ""),
              body: String(data.body ?? ""),
              authorUid: String(data.authorUid ?? ""),
              authorName: String(data.authorName ?? "Happy People"),
              createdAt: toIso(data.createdAt),
              commentCount: Number(data.commentCount ?? 0),
            };
          }),
        );
        setReady(true);
      },
      () => setReady(true),
    );
  }, []);

  const openPost = useMemo(
    () => posts.find((p) => p.id === openId) ?? null,
    [posts, openId],
  );

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!nextTitle || !nextBody) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(getClientDb(), COMMUNITY_POSTS_COLLECTION), {
        title: nextTitle.slice(0, 160),
        body: nextBody.slice(0, 8000),
        authorUid: user.uid,
        authorName: displayNameFromUser(user),
        authorEmail: user.email ?? "",
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function removePost(post: CommunityPost) {
    if (!user) return;
    if (post.authorUid !== user.uid && !isAdmin) return;
    if (!window.confirm(`“${post.title}” verwijderen?`)) return;
    await deleteDoc(doc(getClientDb(), COMMUNITY_POSTS_COLLECTION, post.id));
    if (openId === post.id) setOpenId(null);
  }

  if (openPost) {
    return (
      <PostDetail
        post={openPost}
        locale={locale}
        onBack={() => setOpenId(null)}
        onDelete={() => void removePost(openPost)}
        canDelete={Boolean(
          user && (user.uid === openPost.authorUid || isAdmin),
        )}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        {t("lead")}
      </p>

      <div className="mt-10 rounded-2xl border border-line bg-white/70 p-4 sm:p-5">
        {!loading && user ? (
          <form onSubmit={publish} className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              {t("newPost")}
            </p>
            <label className="block text-sm font-medium text-ink">
              {t("titleLabel")}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
                className="mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              {t("bodyLabel")}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={8000}
                required
                rows={5}
                className="mt-1.5 w-full resize-y border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !title.trim() || !body.trim()}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
            >
              {busy ? t("publishing") : t("publish")}
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink-soft">{t("loginToPost")}</p>
            <Link
              href={signInHref("/community")}
              className="rounded-full border border-accent/40 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/5"
            >
              {t("loginCta")}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {!ready ? (
          <p className="text-ink-soft">…</p>
        ) : posts.length === 0 ? (
          <p className="text-ink-soft">{t("empty")}</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-line bg-white/70 p-4 transition hover:border-accent/40 sm:p-5"
            >
              <button
                type="button"
                onClick={() => setOpenId(post.id)}
                className="w-full text-left"
              >
                <h2 className="font-display text-xl text-ink md:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft md:text-base">
                  {post.body}
                </p>
                <p className="mt-3 text-xs text-ink-soft">
                  {t("by")} {post.authorName} · {formatForumTime(post.createdAt, locale)} ·{" "}
                  {t("comments", { count: post.commentCount })}
                </p>
              </button>
              {user && (user.uid === post.authorUid || isAdmin) ? (
                <button
                  type="button"
                  onClick={() => void removePost(post)}
                  className="mt-3 text-xs font-medium text-red-700/90"
                >
                  {t("delete")}
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function PostDetail({
  post,
  locale,
  onBack,
  onDelete,
  canDelete,
}: {
  post: CommunityPost;
  locale: string;
  onBack: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const t = useTranslations("communityForum");
  const { user, loading } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(
      collection(
        getClientDb(),
        COMMUNITY_POSTS_COLLECTION,
        post.id,
        "comments",
      ),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            body: String(data.body ?? ""),
            authorUid: String(data.authorUid ?? ""),
            authorName: String(data.authorName ?? "Happy People"),
            createdAt: toIso(data.createdAt),
          };
        }),
      );
    });
  }, [post.id]);

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    const next = text.trim();
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(
        collection(
          getClientDb(),
          COMMUNITY_POSTS_COLLECTION,
          post.id,
          "comments",
        ),
        {
          body: next.slice(0, 4000),
          authorUid: user.uid,
          authorName: displayNameFromUser(user),
          createdAt: serverTimestamp(),
        },
      );
      await updateDoc(doc(getClientDb(), COMMUNITY_POSTS_COLLECTION, post.id), {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      setText("");
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-accent hover:underline"
      >
        ← {t("back")}
      </button>
      <article className="mt-6 rounded-2xl border border-line bg-white/70 p-5 sm:p-6">
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-xs text-ink-soft">
          {t("by")} {post.authorName} · {formatForumTime(post.createdAt, locale)}
        </p>
        <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-ink md:text-lg">
          {post.body}
        </p>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="mt-6 text-xs font-medium text-red-700/90"
          >
            {t("delete")}
          </button>
        ) : null}
      </article>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-ink">
          {t("comments", { count: comments.length })}
        </h2>
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-line bg-white/60 px-4 py-3"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink md:text-base">
                {c.body}
              </p>
              <p className="mt-2 text-[11px] text-ink-soft">
                {t("by")} {c.authorName} · {formatForumTime(c.createdAt, locale)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl border border-line bg-white/70 p-4">
          {!loading && user ? (
            <form onSubmit={submitComment} className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={4000}
                required
                rows={3}
                className="w-full resize-y border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-accent"
              />
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
              >
                {t("comment")}
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-soft">{t("loginToPost")}</p>
              <Link
                href={signInHref(`/community`)}
                className="rounded-full border border-accent/40 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/5"
              >
                {t("loginCta")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
