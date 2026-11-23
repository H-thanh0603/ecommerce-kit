"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/types";

type SearchParams = {
  cat?: string;
  q?: string;
  sort?: string;
  flash?: string;
  min?: string;
  max?: string;
};

export function MobileFilterDrawer({
  categories,
  sp,
}: {
  categories: Category[];
  sp: SearchParams;
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (sp.cat ? 1 : 0) + (sp.sort ? 1 : 0) + (sp.min ? 1 : 0) + (sp.max ? 1 : 0);

  return (
    <div className="md:hidden">
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Bộ lọc & sắp xếp
            {activeCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-white">
                {activeCount}
              </span>
            )}
          </button>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-canvas outline-none"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line" />
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <Drawer.Title className="font-serif text-xl text-primary">Bộ lọc sản phẩm</Drawer.Title>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng bộ lọc"
                className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Danh mục</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/san-pham"
                    onClick={() => setOpen(false)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      !sp.cat ? "bg-primary text-white" : "border border-line bg-white"
                    }`}
                  >
                    Tất cả
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={{ pathname: "/san-pham", query: { ...sp, cat: c.slug, page: "1" } }}
                      onClick={() => setOpen(false)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        sp.cat === c.slug ? "bg-primary text-white" : "border border-line bg-white"
                      }`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Sắp xếp</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["popular", "Bán chạy"],
                    ["price-asc", "Giá tăng dần"],
                    ["price-desc", "Giá giảm dần"],
                  ].map(([k, label]) => (
                    <Link
                      key={k}
                      href={{ pathname: "/san-pham", query: { ...sp, sort: k, page: "1" } }}
                      onClick={() => setOpen(false)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        sp.sort === k ? "bg-primary text-white" : "border border-line bg-white"
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              <form action="/san-pham" onSubmit={() => setOpen(false)} className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Khoảng giá (₫)</p>
                {(["cat", "q", "sort", "flash"] as const).map((k) =>
                  sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null,
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="min"
                    min={0}
                    defaultValue={sp.min || ""}
                    placeholder="Từ (₫)"
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="max"
                    min={0}
                    defaultValue={sp.max || ""}
                    placeholder="Đến (₫)"
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/san-pham"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-line bg-white py-2.5 text-center text-sm"
                  >
                    Đặt lại
                  </Link>
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-white"
                  >
                    Áp dụng
                  </button>
                </div>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
