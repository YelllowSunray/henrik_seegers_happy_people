import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { fetchPublicPosts } from "@/lib/content-firestore";
import { getSiteUrl, PUBLIC_ROUTES } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = await fetchPublicPosts();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of PUBLIC_ROUTES) {
      const path = route === "/" ? `/${locale}` : `/${locale}${route}`;
      staticEntries.push({
        url: `${siteUrl}${path}`,
        lastModified: now,
        changeFrequency: route === "/" ? "weekly" : "monthly",
        priority: route === "/" ? 1 : 0.8,
      });
    }
  }

  const postEntries: MetadataRoute.Sitemap = posts.flatMap((post) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}/blog/${post.slug}`,
      lastModified: post.publishedAt
        ? new Date(post.publishedAt)
        : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...staticEntries, ...postEntries];
}
