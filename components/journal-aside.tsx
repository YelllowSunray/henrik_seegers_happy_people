import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { t } from "@/lib/content";
import { publishedDateLabel } from "@/lib/journal";
import type { BlogPost, Locale, VideoItem } from "@/lib/types";

export async function JournalAside({
  locale,
  posts,
  vlogs,
  currentId,
}: {
  locale: Locale;
  posts?: BlogPost[];
  vlogs?: VideoItem[];
  currentId?: string;
}) {
  const tr = await getTranslations("journal");
  const latestPosts = (posts ?? []).slice(0, 5);
  const latestVlogs = (vlogs ?? []).slice(0, 5);

  return (
    <aside className="space-y-8 lg:sticky lg:top-32">
      {latestPosts.length > 0 ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            {tr("latest")}
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {latestPosts.map((post) => {
              const current = post.id === currentId;
              return (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className={`block py-3 ${current ? "text-accent" : "hover:text-accent"}`}
                    aria-current={current ? "page" : undefined}
                  >
                    <p className="text-[11px] text-ink-soft">
                      {publishedDateLabel(post.publishedAt)}
                    </p>
                    <p className="font-display mt-0.5 text-lg leading-snug">
                      {t(post.title, locale)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/blog"
            className="mt-3 inline-flex text-sm font-semibold text-accent"
          >
            {tr("morePosts")} →
          </Link>
        </div>
      ) : null}

      {latestVlogs.length > 0 ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            {tr("latestVlogs")}
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {latestVlogs.map((vlog) => {
              const current = vlog.id === currentId;
              return (
                <li key={vlog.id}>
                  <Link
                    href={`/vlogs/${vlog.id}`}
                    className={`block py-3 ${current ? "text-accent" : "hover:text-accent"}`}
                    aria-current={current ? "page" : undefined}
                  >
                    <p className="text-[11px] text-ink-soft">
                      {publishedDateLabel(vlog.publishedAt)}
                      {vlog.durationLabel ? ` · ${vlog.durationLabel}` : ""}
                    </p>
                    <p className="font-display mt-0.5 text-lg leading-snug">
                      {t(vlog.title, locale)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/vlogs"
            className="mt-3 inline-flex text-sm font-semibold text-accent"
          >
            {tr("moreVlogs")} →
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
