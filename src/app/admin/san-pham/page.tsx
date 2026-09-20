import Link from "next/link";
import { listCategories, listProducts } from "@/server/commerce";
import { money } from "@/lib/format";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { ProductActions } from "@/components/admin/ProductActions";

export default async function AdminProducts() {
  const [result, categories] = await Promise.all([
    listProducts({ includeUnpublished: true, pageSize: 48 }),
    listCategories(),
  ]);
  const products = result.items;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Sản phẩm</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">Thêm/sửa/ẩn/xóa. Ảnh: URL hoặc upload.</p>
      <ProductEditor categories={categories} products={products} />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn</th>
              <th className="px-4 py-3">Đã bán</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/san-pham/${p.slug}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{money(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">{p.sold}</td>
                <td className="px-4 py-3"><ProductActions product={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
