"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { Link } from "@/i18n/navigation";
import { CmsField, useAutosizeTextarea } from "@/components/cms/cms-field";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { cmsAdminFetch } from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import type { BlogPost, Locale } from "@/lib/types";

type Draft = {
  title: string;
  excerpt: string;
  body: string;
};

const emptyDraft = (): Draft => ({ title: "", excerpt: "", body: "" });

const ADMIN_CHROME =
  "m-0 box-border block w-full min-w-0 max-w-full appearance-none border border-dashed border-accent/40 bg-transparent px-1.5 py-0.5 leading-[inherit] outline-none transition " +
  "hover:border-accent/70 hover:bg-accent/[0.04] focus:border-accent focus:bg-accent/[0.06] focus:ring-1 focus:ring-accent/25 " +
  "resize-none overflow-x-hidden rounded-sm !whitespace-pre-wrap [overflow-wrap:anywhere]";

function AdminTextArea({
  value,
  onChange,
  className,
  placeholder,
  multiline = true,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, [value, className, multiline], true);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder={placeholder}
      onCompositionStart={(e) => {
        e.currentTarget.dataset.composing = "1";
      }}
      onCompositionEnd={(e) => {
        e.currentTarget.dataset.composing = "0";
        onChange(e.currentTarget.value);
      }}
      onChange={(e) => {
        if (e.target.dataset.composing === "1") return;
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") e.preventDefault();
      }}
      className={`${ADMIN_CHROME} ${className ?? ""}`}
    />
  );
}

function useDebouncedSave(
  postId: string | null,
  payload: Partial<Draft> & { publishedAt?: string },
  enabled: boolean,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const persist = useEffectEvent(async () => {
    if (!postId) return;
    setStatus("Opslaan…");
    try {
      const res = await cmsAdminFetch(`/api/admin/posts/${postId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Opslaan mislukt");
      }
      setStatus("Opgeslagen");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Opslaan mislukt");
    }
  });

  useEffect(() => {
    if (!enabled || !postId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void persist();
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, postId, payload.title, payload.excerpt, payload.body]);

  return status;
}

function CmsBlogRow({
  post,
  locale,
  onDeleted,
}: {
  post: BlogPost;
  locale: Locale;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(t(post.title, locale));
  const [excerpt, setExcerpt] = useState(t(post.excerpt, locale));
  const [body, setBody] = useState(t(post.body, locale));
  const [expandBody, setExpandBody] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = useDebouncedSave(
    post.id,
    { title, excerpt, body },
    true,
  );

  async function onDelete() {
    if (
      !window.confirm(
        `Bericht “${title || "zonder titel"}” verwijderen? Dit kan niet ongedaan.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await cmsAdminFetch(`/api/admin/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Verwijderen mislukt");
      }
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-dashed border-accent/40 bg-accent/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">{post.publishedAt || "Concept"}</p>
        <div className="flex items-center gap-2">
          {status ? (
            <span className="text-[11px] text-ink-soft">{status}</span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Verwijder
          </button>
        </div>
      </div>
      <AdminTextArea
        value={title}
        onChange={setTitle}
        multiline={false}
        placeholder="Titel"
        className="font-display mt-3 text-2xl leading-tight text-ink md:text-3xl"
      />
      <AdminTextArea
        value={excerpt}
        onChange={setExcerpt}
        placeholder="Korte intro"
        className="mt-3 max-w-2xl reading-copy"
      />
      {expandBody ? (
        <AdminTextArea
          value={body}
          onChange={setBody}
          placeholder="Volle tekst (lege regel = nieuwe alinea)"
          className="mt-4 max-w-2xl reading-copy reading-copy-ink"
        />
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpandBody((v) => !v)}
          className="rounded-full border border-accent/40 px-3.5 py-2 text-xs font-semibold text-accent hover:bg-accent/5"
        >
          {expandBody ? "Tekst inklappen" : "Tekst bewerken"}
        </button>
        <Link
          href={`/blog/${post.slug}`}
          className="rounded-full px-3.5 py-2 text-xs font-semibold text-ink-soft underline-offset-2 hover:text-accent hover:underline"
        >
          Open pagina →
        </Link>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </li>
  );
}

function CmsNewPost({
  onCreated,
}: {
  onCreated: (post: BlogPost) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!draft.title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await cmsAdminFetch("/api/admin/posts", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        post?: BlogPost;
        error?: string;
      };
      if (!res.ok || !data.post) {
        throw new Error(data.error || "Publiceren mislukt");
      }
      onCreated(data.post);
      setDraft(emptyDraft());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publiceren mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/55 bg-accent/5 px-4 py-3.5 text-sm font-semibold text-accent hover:bg-accent/10"
      >
        <span aria-hidden className="text-lg leading-none">
          +
        </span>
        Nieuw blogbericht
      </button>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-dashed border-accent/50 bg-accent/[0.05] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Nieuw blogbericht
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDraft(emptyDraft());
            setError(null);
          }}
          className="text-xs font-medium text-ink-soft"
        >
          Annuleren
        </button>
      </div>
      <AdminTextArea
        value={draft.title}
        onChange={(title) => setDraft((d) => ({ ...d, title }))}
        multiline={false}
        placeholder="Titel"
        className="font-display mt-3 text-2xl leading-tight text-ink md:text-3xl"
      />
      <AdminTextArea
        value={draft.excerpt}
        onChange={(excerpt) => setDraft((d) => ({ ...d, excerpt }))}
        placeholder="Korte intro"
        className="mt-3 max-w-2xl reading-copy"
      />
      <AdminTextArea
        value={draft.body}
        onChange={(body) => setDraft((d) => ({ ...d, body }))}
        placeholder="Volle tekst (lege regel = nieuwe alinea)"
        className="mt-4 max-w-2xl reading-copy reading-copy-ink"
      />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void publish()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Bezig…" : "Publiceren"}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

export function CmsBlogFeed({
  posts: initialPosts,
  locale,
  readLabel,
  emptyLabel,
  ctaLabel,
  limit,
  showCta = false,
}: {
  posts: BlogPost[];
  locale: Locale;
  readLabel: string;
  emptyLabel: string;
  ctaLabel?: string;
  limit?: number;
  showCta?: boolean;
}) {
  const cms = useCmsOptional();
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const onDeleted = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const onCreated = useCallback((post: BlogPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const visible = typeof limit === "number" ? posts.slice(0, limit) : posts;

  if (!cms?.enabled) {
    if (posts.length === 0) {
      return <CmsField path="blog.empty" value={emptyLabel} />;
    }
    return (
      <>
        <ul className={limit ? "space-y-10" : "divide-y divide-line"}>
          {visible.map((post) => (
            <li
              key={post.id}
              className={limit ? "min-w-0 max-w-2xl" : "py-8"}
            >
              <p className="text-xs text-ink-soft">{post.publishedAt}</p>
              <h3
                className={`font-display mt-2 text-ink ${
                  limit ? "text-2xl md:text-3xl" : "text-3xl"
                }`}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-accent"
                >
                  {t(post.title, locale)}
                </Link>
              </h3>
              <p
                className={`mt-3 text-ink-soft ${
                  limit
                    ? "text-sm leading-relaxed md:text-base"
                    : "max-w-2xl"
                }`}
              >
                {t(post.excerpt, locale)}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft"
              >
                <CmsField
                  path="blog.read"
                  value={readLabel}
                  multiline={false}
                  inline
                  className="bg-transparent text-sm font-semibold text-white"
                />
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
        {showCta && ctaLabel ? (
          <div className="mt-12 max-w-2xl border-t border-line pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
            >
              <CmsField
                path="blog.cta"
                value={ctaLabel}
                multiline={false}
                inline
                className="text-sm font-semibold text-ink"
              />
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </>
    );
  }

  // In CMS mode show every post so you can add/delete without missing any.
  const cmsList = posts;

  return (
    <div>
      <CmsNewPost onCreated={onCreated} />
      {cmsList.length === 0 ? (
        <CmsField path="blog.empty" value={emptyLabel} />
      ) : (
        <ul className="space-y-4">
          {cmsList.map((post) => (
            <CmsBlogRow
              key={post.id}
              post={post}
              locale={locale}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}
      {showCta && ctaLabel ? (
        <div className="mt-10 max-w-2xl border-t border-line pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
          >
            <CmsField
              path="blog.cta"
              value={ctaLabel}
              multiline={false}
              inline
              className="text-sm font-semibold text-ink"
            />
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Inline editor for a single blog post page. */
export function CmsBlogPostEditor({
  post,
  locale,
  children,
}: {
  post: BlogPost;
  locale: Locale;
  children: React.ReactNode;
}) {
  const cms = useCmsOptional();
  const [title, setTitle] = useState(t(post.title, locale));
  const [excerpt, setExcerpt] = useState(t(post.excerpt, locale));
  const [body, setBody] = useState(t(post.body, locale));
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const status = useDebouncedSave(
    cms?.enabled ? post.id : null,
    { title, excerpt, body },
    Boolean(cms?.enabled),
  );

  if (!cms?.enabled) return <>{children}</>;
  if (gone) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-soft">Bericht verwijderd.</p>
        <Link href="/blog" className="mt-4 inline-flex text-sm font-semibold text-accent">
          ← Terug naar blog
        </Link>
      </div>
    );
  }

  async function onDelete() {
    if (!window.confirm(`Bericht “${title}” verwijderen?`)) return;
    setBusy(true);
    try {
      const res = await cmsAdminFetch(`/api/admin/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setGone(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Verwijderen mislukt");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Blog bewerken · NL
        </p>
        <div className="flex items-center gap-3">
          {status ? (
            <span className="text-[11px] text-ink-soft">{status}</span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Verwijder bericht
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-soft">{post.publishedAt}</p>
      <AdminTextArea
        value={title}
        onChange={setTitle}
        multiline={false}
        placeholder="Titel"
        className="font-display mt-3 max-w-3xl text-3xl leading-tight text-ink sm:text-4xl md:text-5xl"
      />
      <AdminTextArea
        value={excerpt}
        onChange={setExcerpt}
        placeholder="Korte intro (lijst)"
        className="mt-4 max-w-2xl text-base text-ink-soft"
      />
      <AdminTextArea
        value={body}
        onChange={setBody}
        placeholder="Volle tekst"
        rows={12}
        className="mt-8 max-w-3xl reading-copy reading-copy-ink"
      />
      {msg ? <p className="mt-3 text-sm text-red-700">{msg}</p> : null}
    </div>
  );
}
