import type { MetadataRoute } from "next";
import { listArticles, listCategories, listProducts } from "@/server/commerce";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const app = process.env.APP_URL || "http://localhost:3000";
  const [products, articles, categories] = await Promise.all([
    listProducts({ pageSize: 48 }).catch(() => ({ items: [] as { slug: string }[] })),
    listArticles().catch(() => []),
    listCategories().catch(() => []),
  ]);
  const now = new Date();
  return [
    { url: `${app}/`, lastModified: now },
    { url: `${app}/san-pham`, lastModified: now },
    ...categories.map((c) => ({ url: `${app}/san-pham?cat=${c.slug}`, lastModified: now })),
    ...products.items.map((p) => ({ url: `${app}/san-pham/${p.slug}`, lastModified: now })),
    ...articles.map((a) => ({ url: `${app}/tin-tuc/${a.slug}`, lastModified: now })),
  ];
}
