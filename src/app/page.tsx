import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { HomeView } from "@/components/home/HomeView";
import { listArticles, listCategories, listProducts } from "@/server/commerce";

export default async function Page() {
  enterTenant(await resolveRequestTenant());
  const [featured, flash, allCats, articles] = await Promise.all([
    listProducts({ featured: true, pageSize: 8 }),
    listProducts({ flashSale: true, pageSize: 12 }),
    listCategories(),
    listArticles(),
  ]);
  const products = [...featured.items, ...flash.items.filter((p) => !featured.items.some((f) => f.id === p.id))];
  return <HomeView products={products} categories={allCats} articles={articles} />;
}
