import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { getProductById, listCategories, listProducts } from "@/server/commerce";
import { money } from "@/lib/format";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { ProductActions } from "@/components/admin/ProductActions";
import { isEnabled } from "@/config/site";
import { ExcelButtons } from "@/components/admin/ExcelButtons";

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; page?: string }>;
}) {
  enterTenant(await resolveRequestTenant());
  const sp = await searchParams;
  const [result, categories] = await Promise.all([
    listProducts({
      includeUnpublished: true,
      q: sp.q,
      page: Number(sp.page || 1),
      pageSize: 24,
    }),
    listCategories(),
  ]);
  let products = result.items;
  if (sp.edit && !products.some((p) => p.id === sp.edit)) {
    const extra = await getProductById(sp.edit);
    if (extra) products = [extra, ...products];
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-primary">Sản phẩm</h1>
          <p className="mt-1 text-sm text-muted">Nút xanh thêm sản phẩm mới. Trên mỗi dòng: Sửa, Ẩn hoặc Hiện, Xóa.</p>
        </div>
        <div className="flex gap-3 text-sm">{isEnabled("excel") && <ExcelButtons />}</div>
      </div>
      <form className="mt-4">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm tên, slug, tag…"
          className="w-full max-w-sm rounded-full border border-line bg-white px-4 py-2 text-sm"
        />
      </form>
      <ProductEditor categories={categories} products={products} initialEditId={sp.edit} />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn</th>
              <th className="px-4 py-3">Đã bán</th>
              <th className="px-4 py-3">Hiện</th>
              <th className="sticky right-0 bg-canvas px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.15)]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted">
                  Không có sản phẩm khớp.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/san-pham?edit=${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{money(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">{p.sold}</td>
                <td className="px-4 py-3">{p.published === false ? "Ẩn" : "Có"}</td>
                <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <ProductActions product={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.pages > 1 && (
        <div className="mt-4 flex gap-2 text-sm">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={{ query: { q: sp.q, page: String(n) } }}
              className={`rounded-full px-3 py-1 ${n === result.page ? "bg-primary text-white" : "border border-line"}`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
