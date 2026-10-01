"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import type { Product } from "@/types";

/**
 * Thanh mua cố định dưới màn hình mobile (chuẩn TMĐT VN):
 * giá + tồn + "Thêm vào giỏ" + "Mua ngay" (thêm giỏ rồi nhảy sang thanh toán).
 * Dùng biến thể mặc định (option đầu của từng nhóm) — giống AddToCart khi chưa chọn gì.
 */
export function StickyBuyBar({ product }: { product: Product }) {
  const { add } = useCart();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const step = product.unit === "kg" ? 100 : 1;
  const variantLabel = product.variants?.length
    ? product.variants.map((v) => v.options[0]).join(" / ")
    : undefined;
  const sku = variantLabel
    ? product.skus?.find((s) => s.label === variantLabel)
    : product.skus?.[0];
  const stock = sku?.stock ?? product.stock;

  const addNow = () => {
    if (stock < step) {
      setMsg("Sản phẩm đã hết hàng");
      return false;
    }
    add(product, step, variantLabel, sku?.id);
    trackEvent(AnalyticsEvents.AddToCart, {
      productId: product.id,
      slug: product.slug,
      qty: step,
      price: product.price,
      variant: variantLabel,
    });
    return true;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{money(product.price)}</p>
          <p className="text-xs text-muted">{stock > 0 ? `Còn ${stock}` : "Hết hàng"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (addNow()) setMsg("Đã thêm vào giỏ hàng");
            }}
            disabled={stock < step}
            className="rounded-full border border-primary px-4 py-2.5 text-sm text-primary disabled:opacity-50"
          >
            Thêm vào giỏ
          </button>
          <button
            onClick={() => {
              if (addNow()) router.push("/thanh-toan");
            }}
            disabled={stock < step}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Mua ngay
          </button>
        </div>
      </div>
      {msg && (
        <p role="status" className="px-4 pb-2 text-xs text-primary">
          {msg}
        </p>
      )}
    </div>
  );
}
