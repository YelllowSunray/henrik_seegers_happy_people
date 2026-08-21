import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogBody } from "@/components/blog-body";
import { t } from "@/lib/content";
import { fetchMemberPosts } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function MembersTeachingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("members");
  const posts = await fetchMemberPosts();

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("inside")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{tr("teachings")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{tr("descTeachings")}</p>
      {posts.length === 0 ? (
        <p className="mt-10 text-ink-soft">{tr("emptyContent")}</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-t border-line">
          {posts.map((post) => (
            <li key={post.id} className="py-8">
              <p className="text-xs tracking-wide text-ink-soft uppercase">
                {post.publishedAt}
              </p>
              <h2 className="font-display mt-2 text-3xl">
                {t(post.title, locale)}
              </h2>
              <div className="mt-4">
                <BlogBody text={t(post.body, locale)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
