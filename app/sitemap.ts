import type { MetadataRoute } from "next";

/** Site is not public yet — empty sitemap so crawlers find nothing to index. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
