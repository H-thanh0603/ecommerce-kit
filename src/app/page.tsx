import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { HomeView } from "@/components/home/HomeView";
import { listArticles, listCategories, listProducts } from "@/server/commerce";
import { getEffectiveSiteConfig } from "@/server/settings";

export default async function Page() {
  enterTenant(await resolveRequestTenant());
  const [featured, flash, allCats, articles, site] = await Promise.all([
    listProducts({ featured: true, pageSize: 8 }),
    listProducts({ flashSale: true, pageSize: 12 }),
    listCategories(),
    listArticles(),
    getEffectiveSiteConfig(),
  ]);
  const products = [...featured.items, ...flash.items.filter((p) => !featured.items.some((f) => f.id === p.id))];
  return (
    <HomeView
      products={products}
      categories={allCats}
      articles={articles}
      brand={site.brand}
      shipping={site.shipping}
      home={site.home}
    />
  );
}
