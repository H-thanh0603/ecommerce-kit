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
    if (!confirm("Xóa sản phẩm này? Nếu sản phẩm đã nằm trong đơn, nó sẽ bị ẩn thay vì xóa.")) return;
    await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  };
  return (
    <span className="flex gap-2 text-xs">
      <a href={`/admin/san-pham?edit=${product.id}`} className="underline">
        Sửa
      </a>
      <button onClick={hide} className="underline">
        {product.published === false ? "Hiện" : "Ẩn"}
      </button>
      <button onClick={remove} className="underline text-accent">
        Xóa
      </button>
    </span>
  );
}
