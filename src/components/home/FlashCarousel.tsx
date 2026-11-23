"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { money } from "@/lib/format";
import type { Product } from "@/types";

export function FlashCarousel({ products }: { products: Product[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="-ml-4 flex touch-pan-y">
          {products.map((p) => {
            const off =
              p.compareAtPrice && p.compareAtPrice > p.price
                ? Math.round((1 - p.price / p.compareAtPrice) * 100)
                : 0;
            return (
              <div
                key={p.id}
                className="min-w-0 flex-[0_0_72%] pl-4 sm:flex-[0_0_45%] md:flex-[0_0_33.333%]"
              >
                <Link
                  href={`/san-pham/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-white text-ink shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative">
                    <SmartImage
                      src={p.images[0]}
                      alt={p.name}
                      className="aspect-[4/3] w-full"
                      imgClassName="transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 72vw, 33vw"
                    />
                    {off > 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                        -{off}%
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="truncate font-medium leading-snug">{p.name}</p>
                    <p className="mt-1 text-sm tabular">
                      <span className="font-medium text-primary">{money(p.price)}</span>
                      {p.compareAtPrice ? (
                        <span className="ml-2 text-xs text-muted line-through">
                          {money(p.compareAtPrice)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {products.length > 2 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Flash sale trước"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-xs transition hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Flash sale tiếp theo"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-xs transition hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
