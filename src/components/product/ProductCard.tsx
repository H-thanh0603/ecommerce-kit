"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Eye, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { isEnabled } from "@/config/site";
import { money } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useCompare } from "@/lib/compare";
import type { Product } from "@/types";
import { IconHeart, IconHeartFill, IconStar } from "@/components/icons";
import { SmartImage } from "@/components/ui/SmartImage";

export function ProductCard({ product }: { product: Product }) {
  const { add, setDrawerOpen } = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const [quickOpen, setQuickOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const variantLabel = useMemo(() => {
    if (!product.variants?.length) return undefined;
    return product.variants.map((v) => picked[v.id] || v.options[0]).join(" / ");
  }, [picked, product.variants]);

  const sku = useMemo(
    () => (variantLabel ? product.skus?.find((s) => s.label === variantLabel) : product.skus?.[0]),
    [product.skus, variantLabel],
  );
  const activeStock = sku?.stock ?? product.stock;

  const loved = wishlist.has(product.id);
  const compared = compare.has(product.id);
  const secondImg = product.images[1];
  const off =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  const handleQuickAdd = (usePicked = false) => {
    const qty = product.unit === "kg" ? 100 : 1;
    const label = usePicked ? variantLabel : undefined;
    const skuId = usePicked ? sku?.id : product.skus?.[0]?.id;
    const avail = usePicked ? activeStock : product.stock;
    if (avail < qty) {
      toast.error("Sản phẩm tạm hết hàng");
      return;
    }
    add(product, qty, label, skuId);
    toast.success(`Đã thêm ${product.name}`, {
      description: label || undefined,
      action: { label: "Xem giỏ", onClick: () => setDrawerOpen(true) },
    });
  };

  return (
    <>
      <m.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="group flex flex-col"
      >
        <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-white shadow-xs transition-shadow duration-300 group-hover:shadow-lg">
          <Link href={`/san-pham/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden">
            <SmartImage
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full"
              imgClassName={`transition duration-500 group-hover:scale-105 ${
                secondImg ? "group-hover:opacity-0" : ""
              }`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {secondImg && (
              <SmartImage
                src={secondImg}
                alt={product.name}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            )}
          </Link>

          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {off > 0 && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
                -{off}%
              </span>
            )}
            {isEnabled("flashSale") && product.flashSale && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
                Flash
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {isEnabled("wishlist") && (
              <button
                type="button"
                onClick={() => {
                  wishlist.toggle(product.id);
                  toast(loved ? "Đã bỏ khỏi yêu thích" : "Đã thêm vào yêu thích");
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-sm backdrop-blur-xs transition hover:scale-105 hover:bg-white"
                aria-label="Yêu thích"
              >
                {loved ? <IconHeartFill className="h-4 w-4 text-accent" /> : <IconHeart className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-xs transition hover:scale-105 hover:bg-white hover:text-primary sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100"
              aria-label={`Xem nhanh ${product.name}`}
            >
              <Eye className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleQuickAdd(false)}
            className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full bg-primary/95 py-2.5 text-xs font-medium text-white shadow-md backdrop-blur-xs transition hover:bg-primary sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100"
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.8} />
            Thêm vào giỏ
          </button>
        </div>

        <div className="mt-3 space-y-1">
          <Link href={`/san-pham/${product.slug}`} className="block font-medium leading-snug transition-colors hover:text-primary">
            {product.name}
          </Link>
          {product.subtitle && <p className="text-xs text-muted">{product.subtitle}</p>}
          <div className="flex items-center gap-2">
            <p className="font-medium text-primary tabular">{money(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-sm text-muted line-through tabular">{money(product.compareAtPrice)}</p>
            ) : null}
          </div>
          {isEnabled("reviews") && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <IconStar className="h-3.5 w-3.5 text-accent" />
              {product.rating} · {product.reviewCount} đánh giá
            </p>
          )}
          {isEnabled("compare") && (
            <button
              type="button"
              onClick={() => {
                compare.toggle(product.id);
                toast(compared ? "Đã bỏ khỏi so sánh" : "Đã thêm vào danh sách so sánh");
              }}
              className="text-xs text-muted underline hover:text-primary"
            >
              {compared ? "Bỏ so sánh" : "So sánh"}
            </button>
          )}
          {product.unit === "kg" && <p className="text-xs text-muted">Bán theo kg</p>}
        </div>
      </m.article>

      {quickOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem nhanh ${product.name}`}
          onClick={() => setQuickOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-canvas shadow-2xl md:grid-cols-2"
          >
            <button
              type="button"
              onClick={() => setQuickOpen(false)}
              aria-label="Đóng"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-sm hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-white">
              <SmartImage src={product.images[0]} alt={product.name} className="aspect-[4/5] h-full w-full" eager />
            </div>
            <div className="flex flex-col justify-between p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Xem nhanh</p>
                <h3 className="mt-1 font-serif text-2xl text-primary">{product.name}</h3>
                {product.subtitle && <p className="mt-1 text-sm text-muted">{product.subtitle}</p>}
                <div className="mt-4 flex items-baseline gap-2.5">
                  <span className="font-serif text-2xl text-primary tabular">{money(product.price)}</span>
                  {product.compareAtPrice ? (
                    <span className="text-sm text-muted line-through tabular">{money(product.compareAtPrice)}</span>
                  ) : null}
                </div>
                {product.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{product.description}</p>
                )}
                {isEnabled("productVariants") && product.variants && product.variants.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {product.variants.map((v) => (
                      <div key={v.id}>
                        <p className="mb-1.5 text-xs font-medium text-ink">{v.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {v.options.map((opt) => {
                            const active = (picked[v.id] || v.options[0]) === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setPicked((p) => ({ ...p, [v.id]: opt }))}
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  active
                                    ? "border-primary bg-primary font-medium text-white"
                                    : "border-line bg-white text-ink hover:border-primary"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted">
                  Còn {activeStock} sản phẩm{sku ? ` · ${sku.label}` : ""}
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={activeStock <= 0}
                  onClick={() => {
                    handleQuickAdd(true);
                    setQuickOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {activeStock > 0 ? "Thêm vào giỏ" : "Tạm hết hàng"}
                </button>
                <Link
                  href={`/san-pham/${product.slug}`}
                  onClick={() => setQuickOpen(false)}
                  className="w-full rounded-full border border-line bg-white py-2.5 text-center text-sm hover:border-primary hover:text-primary"
                >
                  Xem chi tiết & chọn phân loại
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
