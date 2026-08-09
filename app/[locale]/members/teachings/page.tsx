import { getTranslations, setRequestLocale } from "next-intl/server";
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
      <h1 className="font-display text-3xl">{tr("teachings")}</h1>
      <ul className="mt-8 divide-y divide-line">
        {posts.map((post) => (
          <li key={post.id} className="py-6">
            <p className="text-xs text-ink-soft">{post.publishedAt}</p>
            <h2 className="font-display mt-2 text-2xl">
              {t(post.title, locale)}
            </h2>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-ink-soft">
              {t(post.body, locale)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
