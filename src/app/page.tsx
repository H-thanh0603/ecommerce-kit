import { HomeView } from "@/components/home/HomeView";
import { listArticles, listCategories, listProducts } from "@/server/commerce";

export default async function Page() {
  const [products, categories, articles] = await Promise.all([
    listProducts(),
    listCategories(),
    listArticles(),
  ]);
  return <HomeView products={products} categories={categories} articles={articles} />;
}
