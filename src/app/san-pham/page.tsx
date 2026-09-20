import { ProductGrid } from "@/components/product/ProductGrid";
import { categories, products, searchProducts } from "@/data/catalog";
import { siteConfig } from "@/config/site";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ cat?: string; q?: string; sort?: string }>;
};

export const metadata = { title: "Sản phẩm" };

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  let list = sp.q ? searchProducts(sp.q) : [...products];
  if (sp.cat) list = list.filter((p) => p.category === sp.cat);
  if (sp.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sp.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sp.sort === "popular") list.sort((a, b) => b.sold - a.sold);

  const currentCat = categories.find((c) => c.slug === sp.cat);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Cửa hàng</p>
      <h1 className="mt-2 font-serif text-4xl text-primary">
        {currentCat ? currentCat.name : sp.q ? `Kết quả “${sp.q}”` : "Tất cả sản phẩm"}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        {currentCat?.description || siteConfig.brand.description}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link
          href="/san-pham"
          className={`rounded-full px-3 py-1.5 text-sm ${!sp.cat ? "bg-primary text-white" : "border border-line bg-white"}`}
        >
          Tất cả
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/san-pham?cat=${c.slug}`}
            className={`rounded-full px-3 py-1.5 text-sm ${
              sp.cat === c.slug ? "bg-primary text-white" : "border border-line bg-white"
            }`}
          >
            {c.name}
          </Link>
        ))}
        <div className="ml-auto flex gap-2 text-sm">
          <Link href={{ query: { ...sp, sort: "popular" } }} className="text-muted hover:text-ink">
            Bán chạy
          </Link>
          <Link href={{ query: { ...sp, sort: "price-asc" } }} className="text-muted hover:text-ink">
            Giá tăng
          </Link>
          <Link href={{ query: { ...sp, sort: "price-desc" } }} className="text-muted hover:text-ink">
            Giá giảm
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <ProductGrid products={list} />
      </div>
    </div>
  );
}
