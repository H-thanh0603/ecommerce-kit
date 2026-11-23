"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";

/** Gallery chi tiết SP: Embla swipe carousel + thumbnail sync + fullscreen zoom lightbox.
 *  `alts` song song theo index với `images` ("" fallback về name). */
export function ProductGallery({ images, alts, name }: { images: string[]; alts?: string[]; name: string }) {
  const list = images.length ? images : [""];
  const altOf = (i: number) => alts?.[i]?.trim() || name;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: list.length > 1 });
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
      setSelected(index);
    },
    [emblaApi],
  );

  // Phím tắt trong lightbox: Esc đóng, ←/→ chuyển ảnh
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") scrollTo((selected + 1) % list.length);
      else if (e.key === "ArrowLeft") scrollTo((selected - 1 + list.length) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, selected, list.length, scrollTo]);

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-3xl bg-white">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {list.map((src, i) => (
              <div key={src + i} className="min-w-0 flex-[0_0_100%]">
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  className="block w-full cursor-zoom-in text-left"
                  aria-label={`Phóng to ảnh ${i + 1}`}
                >
                  <SmartImage src={src} alt={altOf(i)} className="aspect-[4/5] w-full" eager={i === 0} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="Xem toàn màn hình"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
        >
          <Expand className="h-4 w-4" />
        </button>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-xs transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-xs transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-xs">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollTo(i)}
                  aria-label={`Chọn ảnh ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === selected ? "w-5 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Ảnh sản phẩm">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`Ảnh ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-2 ring-offset-2 transition ${
                i === selected ? "ring-primary" : "ring-transparent opacity-75 hover:opacity-100"
              }`}
            >
              <SmartImage src={src} alt={altOf(i)} className="aspect-square w-full" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ảnh ${name}`}
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Đóng"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollTo((selected - 1 + list.length) % list.length);
                }}
                aria-label="Ảnh trước"
                className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollTo((selected + 1) % list.length);
                }}
                aria-label="Ảnh tiếp theo"
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-black"
          >
            <SmartImage
              src={list[selected]}
              alt={altOf(selected)}
              className="max-h-[88vh] w-full"
              imgClassName="object-contain"
              eager
            />
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white tabular">
              {selected + 1} / {list.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
