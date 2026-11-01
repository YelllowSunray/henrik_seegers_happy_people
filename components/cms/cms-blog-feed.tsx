"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BlogBody } from "@/components/blog-body";
import { BlogCover, BlogEmptyState, BlogPostCard } from "@/components/blog-card";
import {
  AdminCardActions,
  AdminCardOpenLink,
  AdminDangerButton,
  AdminField,
  AdminGhostButton,
  AdminInput,
  AdminNewButton,
  AdminPreview,
  AdminPrimaryButton,
  AdminSaveStatus,
  AdminSuccess,
  AdminTextarea,
  confirmDelete,
  confirmLeave,
  useLeaveGuard,
} from "@/components/cms/admin-ui";
import { BlogCoverField } from "@/components/cms/blog-image-pick";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { FACEBOOK_HREF } from "@/lib/contact";
import {
  adminSaveError,
  cmsAdminFetch,
  isAdminCreateSuccess,
  readAdminJson,
  type AdminJson,
} from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import { formatPostDate, readingMinutes } from "@/lib/journal";
import type { BlogPost, Locale } from "@/lib/types";

type Draft = {
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  excerpt: "",
  body: "",
  coverImage: "",
});

function useDebouncedSave(
  postId: string | null,
  payload: Draft,
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
  }, [
    enabled,
    postId,
    payload.title,
    payload.excerpt,
    payload.body,
    payload.coverImage,
  ]);

  return status;
}

function BlogFormFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
}) {
  return (
    <div className="space-y-6">
      <AdminField
        label="1. Titel"
        hint="De kop die bezoekers als eerste zien."
      >
        <AdminInput
          value={draft.title}
          onChange={(title) => onChange({ ...draft, title })}
          placeholder="Bijvoorbeeld: Je bent niet verloren"
        />
      </AdminField>
      <AdminField
        label="2. Korte intro"
        hint="Eén of twee zinnen onder de titel."
      >
        <AdminTextarea
          value={draft.excerpt}
          onChange={(excerpt) => onChange({ ...draft, excerpt })}
          placeholder="Waar gaat dit bericht over?"
          minRows={3}
        />
      </AdminField>
      <AdminField
        label="3. Omslagfoto"
        hint="Deze foto komt op de kaart en bovenaan het bericht."
      >
        <BlogCoverField
          value={draft.coverImage}
          onChange={(coverImage) => onChange({ ...draft, coverImage })}
        />
      </AdminField>
      <AdminField
        label="4. Het verhaal"
        hint="Lege regel = nieuwe alinea."
      >
        <AdminTextarea
          value={draft.body}
          onChange={(body) => onChange({ ...draft, body })}
          placeholder="Schrijf hier je blog."
          minRows={8}
        />
      </AdminField>
    </div>
  );
}

function BlogPreview({ draft }: { draft: Draft }) {
  return (
    <AdminPreview label="Zo ziet het eruit">
      {draft.coverImage ? (
        <div className="mb-5 overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.coverImage}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      ) : null}
      <p className="text-sm text-ink-soft">Vandaag</p>
      <h2 className="font-display mt-2 text-2xl leading-tight text-ink sm:text-3xl">
        {draft.title.trim() || "Titel"}
      </h2>
      {draft.excerpt.trim() ? (
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {draft.excerpt}
        </p>
      ) : null}
      {draft.body.trim() ? (
        <div className="mt-5">
          <BlogBody text={draft.body} />
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-soft">Nog geen tekst.</p>
      )}
    </AdminPreview>
  );
}

function NewBlog({ onCreated }: { onCreated: (post: BlogPost) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<BlogPost | null>(null);
  const dirty = Boolean(
    draft.title.trim() ||
      draft.excerpt.trim() ||
      draft.body.trim() ||
      draft.coverImage.trim(),
  );
  useLeaveGuard(open && dirty);

  function close() {
    if (!confirmLeave(dirty)) return;
    setOpen(false);
    setDraft(emptyDraft());
    setError(null);
  }

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
      const data = await readAdminJson<AdminJson & { post?: BlogPost }>(res);
      if (!isAdminCreateSuccess(res, data, "blog") || !data.post) {
        throw new Error(adminSaveError(res, data, "blog"));
      }
      onCreated(data.post);
      setPublished(data.post);
      setDraft(emptyDraft());
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Publiceren mislukt. Het bericht is niet opgeslagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="nieuwe-blog" className="scroll-mt-28">
      {published ? (
        <AdminSuccess
          href={`/blog/${published.slug}`}
          linkLabel="Bekijk dit bericht live"
        >
          Gepubliceerd — het staat nu op de site.
        </AdminSuccess>
      ) : null}
      {!open ? (
        <AdminNewButton
          onClick={() => {
            setPublished(null);
            setOpen(true);
          }}
        >
          Nieuwe blog
        </AdminNewButton>
      ) : (
        <div className="rounded-2xl border border-line bg-bg-deep/40 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
                Nieuwe blog
              </p>
              <p className="mt-1 text-base text-ink-soft">
                Titel, intro, eventueel een foto, dan het verhaal — en Publiceren.
              </p>
            </div>
            <AdminGhostButton onClick={close}>Annuleren</AdminGhostButton>
          </div>
          <div className="mt-6 space-y-8">
            <BlogFormFields draft={draft} onChange={setDraft} />
            <BlogPreview draft={draft} />
            {error ? <p className="text-base text-red-700">{error}</p> : null}
            <AdminPrimaryButton busy={busy} onClick={() => void publish()}>
              {busy ? "Bezig…" : "Publiceren"}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function BlogEditForm({
  post,
  locale,
  onDeleted,
  onUpdated,
  onClose,
}: {
  post: BlogPost;
  locale: Locale;
  onDeleted: (id: string) => void;
  onUpdated?: (next: BlogPost) => void;
  onClose?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    title: t(post.title, locale),
    excerpt: t(post.excerpt, locale),
    body: t(post.body, locale),
    coverImage: post.coverImage ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useDebouncedSave(post.id, draft, true);

  function updateDraft(next: Draft) {
    setDraft(next);
    onUpdated?.({
      ...post,
      title: { ...post.title, nl: next.title },
      excerpt: { ...post.excerpt, nl: next.excerpt },
      body: { ...post.body, nl: next.body },
      coverImage: next.coverImage.trim() || undefined,
    });
  }

  async function onDelete() {
    if (!confirmDelete(draft.title)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cmsAdminFetch(`/api/admin/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Verwijderen mislukt");
      }
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSaveStatus status={status} />
        <div className="flex flex-wrap gap-2">
          {onClose ? (
            <AdminGhostButton onClick={onClose}>Klaar</AdminGhostButton>
          ) : null}
          <AdminDangerButton disabled={busy} onClick={() => void onDelete()}>
            Verwijderen
          </AdminDangerButton>
        </div>
      </div>
      <p className="text-sm text-ink-soft">
        Wijzigingen worden automatisch opgeslagen.
      </p>
      <BlogFormFields draft={draft} onChange={updateDraft} />
      <BlogPreview draft={draft} />
      {error ? <p className="text-base text-red-700">{error}</p> : null}
    </div>
  );
}

function CmsBlogRow({
  post,
  locale,
  onDeleted,
  onUpdated,
}: {
  post: BlogPost;
  locale: Locale;
  onDeleted: (id: string) => void;
  onUpdated: (next: BlogPost) => void;
}) {
  const [editing, setEditing] = useState(false);
  const title = t(post.title, locale) || "Zonder titel";
  const excerpt = t(post.excerpt, locale);
  const tr = useTranslations("blog");
  const minutes = readingMinutes(title, excerpt, t(post.body, locale));
  const date = formatPostDate(post.publishedAt, locale) || "Concept";

  if (editing) {
    return (
      <li className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <BlogEditForm
          post={post}
          locale={locale}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
          onClose={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)]">
      <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[11rem_1fr]">
        <BlogCover
          post={post}
          alt=""
          className="min-h-[6.5rem] sm:min-h-full"
        />
        <div className="flex min-w-0 flex-col justify-center px-3 py-3 sm:p-5">
          <p className="text-sm text-ink-soft">
            <time dateTime={post.publishedAt}>{date}</time>
            <span aria-hidden> · </span>
            <span>{tr("minutes", { count: minutes })}</span>
          </p>
          <h3 className="font-display mt-1 line-clamp-2 text-lg leading-tight text-ink sm:text-2xl">
            {title}
          </h3>
          {excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft sm:text-base">
              {excerpt}
            </p>
          ) : null}
        </div>
      </div>
      <AdminCardActions>
        <AdminPrimaryButton compact onClick={() => setEditing(true)}>
          Bewerken
        </AdminPrimaryButton>
        <AdminCardOpenLink href={`/blog/${post.slug}`}>
          Openen
        </AdminCardOpenLink>
        <AdminDangerButton
          compact
          onClick={() => {
            if (!confirmDelete(title)) return;
            void (async () => {
              const res = await cmsAdminFetch(`/api/admin/posts/${post.id}`, {
                method: "DELETE",
              });
              if (res.ok) onDeleted(post.id);
            })();
          }}
        >
          Verwijderen
        </AdminDangerButton>
      </AdminCardActions>
    </li>
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
  const tr = useTranslations("blog");
  const [posts, setPosts] = useState(initialPosts);
  const emptyTitle = tr("emptyTitle");
  const emptyHint = tr("emptyHint");
  const facebookLabel = tr("facebook");

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const onDeleted = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const onCreated = useCallback((post: BlogPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const onUpdated = useCallback((next: BlogPost) => {
    setPosts((prev) => prev.map((post) => (post.id === next.id ? next : post)));
  }, []);

  const visible = typeof limit === "number" ? posts.slice(0, limit) : posts;

  if (!cms?.enabled) {
    if (posts.length === 0) {
      return (
        <BlogEmptyState
          title={emptyTitle}
          hint={emptyHint}
          facebookLabel={facebookLabel}
          facebookHref={FACEBOOK_HREF}
        />
      );
    }

    const [featured, ...rest] = visible;
    const useFeatured = !limit && Boolean(featured);

    return (
      <>
        {useFeatured && featured ? (
          <BlogPostCard
            post={featured}
            locale={locale}
            readLabel={readLabel}
            featured
          />
        ) : null}
        {(useFeatured ? rest : visible).length > 0 ? (
          <ul
            className={`grid gap-5 sm:grid-cols-2 sm:gap-6 ${
              useFeatured ? "mt-6" : ""
            }`}
          >
            {(useFeatured ? rest : visible).map((post) => (
              <li key={post.id} className="min-w-0">
                <BlogPostCard
                  post={post}
                  locale={locale}
                  readLabel={readLabel}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {showCta && ctaLabel ? (
          <div className="mt-10 border-t border-line pt-8">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
            >
              {ctaLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <NewBlog onCreated={onCreated} />
      {posts.length === 0 ? (
        <BlogEmptyState
          title={emptyTitle}
          hint={emptyHint || emptyLabel}
          facebookLabel={facebookLabel}
          facebookHref={FACEBOOK_HREF}
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <CmsBlogRow
              key={post.id}
              post={post}
              locale={locale}
              onDeleted={onDeleted}
              onUpdated={onUpdated}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

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
  const [gone, setGone] = useState(false);

  if (!cms?.enabled) return <>{children}</>;
  if (gone) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-soft">Bericht verwijderd.</p>
        <Link
          href="/blog"
          className="mt-4 inline-flex min-h-12 items-center text-base font-semibold text-accent"
        >
          ← Terug naar blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <BlogEditForm
        post={post}
        locale={locale}
        onDeleted={() => setGone(true)}
      />
    </div>
  );
}
