"use client";

import Link from "next/link";
import { products } from "@/data/catalog";
import { money } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export default function AdminProducts() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <p className="px-4 py-20 text-center">Cần quyền admin.</p>;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Sản phẩm</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Demo đọc từ <code>src/data/catalog.ts</code>. Khi triển khai, nối Prisma / CMS rồi giữ nguyên bảng này.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn</th>
              <th className="px-4 py-3">Đã bán</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
