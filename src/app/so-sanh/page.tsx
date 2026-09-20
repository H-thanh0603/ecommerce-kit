"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isEnabled } from "@/config/site";
import { useCompare } from "@/lib/compare";
import { money } from "@/lib/format";
import type { Product } from "@/types";

export default function ComparePage() {
  const { ids, toggle, clear } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!ids.length) return setProducts([]);
    fetch(`/api/products?ids=${ids.join(",")}&pageSize=8`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, [ids]);
  if (!isEnabled("compare")) return <p className="px-4 py-20 text-center">Module so sánh đang tắt.</p>;
  const rows = [
    { label: "Giá", render: (p: Product) => money(p.price) },
    { label: "Tồn", render: (p: Product) => String(p.stock) },
    { label: "Đơn vị", render: (p: Product) => p.unit || "cái" },
    { label: "Danh mục", render: (p: Product) => p.category },
    { label: "Đánh giá", render: (p: Product) => `${p.rating} (${p.reviewCount})` },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex justify-between">
        <h1 className="font-serif text-4xl text-primary">So sánh sản phẩm</h1>
        <button onClick={clear} className="text-sm underline">Xóa hết</button>
      </div>
      {products.length === 0 ? (
        <p className="mt-8 text-muted">Chọn tối đa 4 SP từ danh sách (nút So sánh).</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left"> </th>
                {products.map((p) => (
                  <th key={p.id} className="p-3 text-left">
                    <Link href={`/san-pham/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                    <button className="ml-2 text-xs text-accent" onClick={() => toggle(p.id)}>bỏ</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="p-3 text-muted">{r.label}</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">{r.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
