"use client";

import { useRouter } from "next/navigation";
import type { Product } from "@/types";

export function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const hide = async () => {
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !product.published }),
    });
    router.refresh();
  };
  const remove = async () => {
    if (!confirm("Ẩn hoặc xóa sản phẩm này?")) return;
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  };
  return (
    <span className="flex gap-2 text-xs">
      <button onClick={hide} className="underline">
        {product.published === false ? "Hiện" : "Ẩn"}
      </button>
      <button onClick={remove} className="underline text-accent">
        Xóa
      </button>
    </span>
  );
}
