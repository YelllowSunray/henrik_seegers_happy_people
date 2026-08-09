"use client";

import { useLocale, useTranslations } from "next-intl";
import { getMemberPosts, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function MembersTeachingsPage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;
  const posts = getMemberPosts();

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
