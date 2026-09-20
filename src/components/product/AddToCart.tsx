"use client";

import { useMemo, useState } from "react";
import { isEnabled } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/types";
import { IconHeart, IconHeartFill } from "@/components/icons";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const step = product.unit === "kg" ? 100 : 1;
  const [qty, setQty] = useState(step);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const variantLabel = useMemo(() => {
    if (!product.variants?.length) return undefined;
    return product.variants.map((v) => picked[v.id] || v.options[0]).join(" / ");
  }, [picked, product.variants]);

  const sku = useMemo(
    () => (variantLabel ? product.skus?.find((s) => s.label === variantLabel) : product.skus?.[0]),
    [product.skus, variantLabel],
  );
  const stock = sku?.stock ?? product.stock;

  const submit = () => {
    if (stock < qty) {
      setMsg("Không đủ tồn kho");
      return;
    }
    add(product, qty, variantLabel, sku?.id);
    setMsg("Đã thêm vào giỏ hàng");
    setTimeout(() => setMsg(""), 1800);
  };

  return (
    <div className="space-y-5">
      {isEnabled("productVariants") &&
        product.variants?.map((v) => (
          <div key={v.id}>
            <p className="mb-2 text-sm font-medium">{v.name}</p>
            <div className="flex flex-wrap gap-2">
              {v.options.map((opt) => {
                const active = (picked[v.id] || v.options[0]) === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setPicked((p) => ({ ...p, [v.id]: opt }))}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      active ? "border-primary bg-primary text-white" : "border-line bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line bg-white">
          <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(step, q - step))}>
            −
          </button>
          <span className="min-w-10 text-center text-sm">
            {product.unit === "kg" ? `${(qty / 1000).toFixed(1)}kg` : qty}
          </span>
          <button className="px-3 py-2" onClick={() => setQty((q) => q + step)}>
            +
          </button>
        </div>
        <button
          onClick={submit}
          className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-white"
        >
          Thêm vào giỏ
        </button>
        {isEnabled("wishlist") && (
          <button
            onClick={() => wishlist.toggle(product.id)}
            className="grid h-12 w-12 place-items-center rounded-full border border-line bg-white"
            aria-label="Yêu thích"
          >
            {wishlist.has(product.id) ? (
              <IconHeartFill className="h-5 w-5 text-accent" />
            ) : (
              <IconHeart className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Còn {stock} sản phẩm{sku ? ` · ${sku.label}` : ""}</p>
      {msg && <p className="text-sm text-primary">{msg}</p>}
    </div>
  );
}
