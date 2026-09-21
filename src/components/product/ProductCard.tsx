"use client";

import Link from "next/link";
import { isEnabled } from "@/config/site";
import { money } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useCompare } from "@/lib/compare";
import type { Product } from "@/types";
import { IconHeart, IconHeartFill, IconStar } from "@/components/icons";
import { SmartImage } from "@/components/ui/SmartImage";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const loved = wishlist.has(product.id);
  const off =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <Link href={`/san-pham/${product.slug}`} className="block aspect-[4/5] overflow-hidden">
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full"
            imgClassName="transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {off > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
              -{off}%
            </span>
          )}
          {isEnabled("flashSale") && product.flashSale && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-white">
              Flash
            </span>
          )}
        </div>
        {isEnabled("wishlist") && (
          <button
            onClick={() => wishlist.toggle(product.id)}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow-sm"
            aria-label="Yêu thích"
          >
            {loved ? <IconHeartFill className="h-4 w-4 text-accent" /> : <IconHeart className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => add(product, product.unit === "kg" ? 100 : 1)}
          className="absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-primary py-2 text-xs font-medium text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
        >
          Thêm vào giỏ
        </button>
      </div>
      <div className="mt-3 space-y-1">
        <Link href={`/san-pham/${product.slug}`} className="block font-medium leading-snug">
          {product.name}
        </Link>
        {product.subtitle && <p className="text-xs text-muted">{product.subtitle}</p>}
        <div className="flex items-center gap-2">
          <p className="font-medium">{money(product.price)}</p>
          {product.compareAtPrice ? (
            <p className="text-sm text-muted line-through">{money(product.compareAtPrice)}</p>
          ) : null}
        </div>
        {isEnabled("reviews") && (
          <p className="flex items-center gap-1 text-xs text-muted">
            <IconStar className="h-3.5 w-3.5 text-accent" />
            {product.rating} · {product.reviewCount} đánh giá
          </p>
        )}
        {isEnabled("compare") && (
          <button type="button" onClick={() => compare.toggle(product.id)} className="text-xs underline text-muted">
            {compare.has(product.id) ? "Bỏ so sánh" : "So sánh"}
          </button>
        )}
        {product.unit === "kg" && <p className="text-xs text-muted">Bán theo kg</p>}
      </div>
    </article>
  );
}
