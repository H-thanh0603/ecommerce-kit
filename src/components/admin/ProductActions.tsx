"use client";

import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { btnDanger, btnGhost } from "@/components/admin/buttons";

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
    <span className="flex flex-wrap justify-end gap-2">
      <a href={`/admin/san-pham?edit=${product.id}`} className={btnGhost}>
        Sửa
      </a>
      <button type="button" onClick={hide} className={btnGhost}>
        {product.published === false ? "Hiện" : "Ẩn"}
      </button>
      <button type="button" onClick={remove} className={btnDanger}>
        Xóa
      </button>
    </span>
  );
}
