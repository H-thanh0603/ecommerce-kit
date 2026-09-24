import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { ProductGrid } from "@/components/product/ProductGrid";
import { listCategories, listProducts } from "@/server/commerce";
import { siteConfig } from "@/config/site";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ cat?: string; q?: string; sort?: string; page?: string; flash?: string }>;
};

export const metadata = { title: "Sản phẩm" };

export default async function ProductsPage({ searchParams }: Props) {
  enterTenant(await resolveRequestTenant());
  const sp = await searchParams;
  const page = Number(sp.page || 1);
  const flashOnly = sp.flash === "1";
  const [categories, result] = await Promise.all([
    listCategories(),
    listProducts({ q: sp.q, cat: sp.cat, sort: sp.sort, page, pageSize: 12, flashSale: flashOnly || undefined }),
  ]);
  const list = result.items;
  const currentCat = categories.find((c) => c.slug === sp.cat);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Cửa hàng</p>
      <h1 className="mt-2 font-serif text-4xl text-primary">
        {flashOnly ? "Flash sale" : currentCat ? currentCat.name : sp.q ? `Kết quả “${sp.q}”` : "Tất cả sản phẩm"}
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
          {["popular", "price-asc", "price-desc"].map((s) => (
            <Link
              key={s}
              href={{ query: { ...sp, sort: s, page: "1" } }}
              className={sp.sort === s ? "font-medium text-primary underline" : "text-muted hover:text-ink"}
            >
              {s === "popular" ? "Bán chạy" : s === "price-asc" ? "Giá tăng" : "Giá giảm"}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {list.length === 0 && flashOnly ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center text-muted">
            <p>Đợt flash sale đã kết thúc. Xem sản phẩm khác nhé.</p>
            <Link href="/san-pham" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm text-white">
              Tất cả sản phẩm
            </Link>
          </div>
        ) : (
          <ProductGrid products={list} />
        )}
      </div>
      {result.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={{ query: { ...sp, page: String(n) } }}
              className={`rounded-full px-3 py-1.5 ${n === result.page ? "bg-primary text-white" : "border border-line bg-white"}`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
