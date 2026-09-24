"use client";

import { useState } from "react";
import { SmartImage } from "@/components/ui/SmartImage";

/** Gallery chi tiết SP: 1 ảnh lớn + thumb chọn — thay xếp dọc full-size. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [""];
  const cur = Math.min(active, list.length - 1);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl bg-white">
        <SmartImage src={list[cur]} alt={name} className="aspect-[4/5] w-full" eager />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Ảnh sản phẩm">
          {list.map((src, i) => (
            <button
              key={src + i}
              role="tab"
              aria-selected={i === cur}
              aria-label={`Ảnh ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-2 ring-offset-2 ${
                i === cur ? "ring-primary" : "ring-transparent"
              }`}
            >
              <SmartImage src={src} alt="" className="aspect-square w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
