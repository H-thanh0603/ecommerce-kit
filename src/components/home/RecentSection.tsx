"use client";

import { ProductGrid } from "@/components/product/ProductGrid";
import { useRecents } from "@/lib/recent";

export function RecentSection() {
  const items = useRecents();
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <h2 className="mb-6 font-serif text-3xl text-primary">Đã xem gần đây</h2>
      <ProductGrid products={items.slice(0, 4)} />
    </section>
  );
}
