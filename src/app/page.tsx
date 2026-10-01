import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { HomeView } from "@/components/home/HomeView";
import {
  getCatalogStats,
  listArticles,
  listCategories,
  listProducts,
  listTopReviews,
} from "@/server/commerce";
import { listBundles } from "@/server/bundle";
import { getEffectiveSiteConfig } from "@/server/settings";

export default async function Page() {
  enterTenant(await resolveRequestTenant());
  const [featured, flash, popular, allCats, articles, site, reviews, bundles, stats] =
    await Promise.all([
      listProducts({ featured: true, pageSize: 8 }),
      listProducts({ flashSale: true, pageSize: 12 }),
      listProducts({ sort: "popular", pageSize: 4 }),
      listCategories(),
      listArticles(),
      getEffectiveSiteConfig(),
      listTopReviews(6).catch(() => []),
      listBundles().catch(() => []),
      getCatalogStats().catch(() => ({ productCount: 0, sold: 0, ratingAvg: 0, reviewCount: 0 })),
    ]);
  const products = [
    ...featured.items,
    ...flash.items.filter((p) => !featured.items.some((f) => f.id === p.id)),
  ];
  const flashEnd = flash.items
    .map((p) => p.flashSaleEndsAt)
    .filter((d): d is string => Boolean(d))
    .sort()[0];
  return (
    <HomeView
      products={products}
      popular={popular.items}
      categories={allCats}
      articles={articles}
      reviews={reviews}
      bundleCount={bundles.length}
      flashEnd={flashEnd}
      stats={stats}
      brand={site.brand}
      shipping={site.shipping}
      home={site.home}
    />
  );
}
