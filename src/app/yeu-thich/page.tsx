"use client";

import { useEffect, useState } from "react";
import { useWishlist } from "@/lib/wishlist";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useFeatures } from "@/lib/features";
import type { Product } from "@/types";
import Link from "next/link";

export default function WishlistPage() {
  const { ids } = useWishlist();
  const features = useFeatures();
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!ids.length) return setProducts([]);
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, [ids]);
  if (features.ready && !features.on("wishlist")) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p>Module yêu thích đang tắt trong cấu hình.</p>
      </div>
    );
  }
  const list = products.filter((p) => ids.includes(p.id));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl text-primary">Yêu thích</h1>
      <p className="mt-2 text-sm text-muted">{list.length} sản phẩm đã lưu.</p>
      <div className="mt-8">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <p className="text-muted">Chưa lưu sản phẩm nào.</p>
            <Link href="/san-pham" className="mt-4 inline-block text-sm underline">
              Đi chọn hàng
            </Link>
          </div>
        ) : (
          <ProductGrid products={list} />
        )}
      </div>
    </div>
  );
}
