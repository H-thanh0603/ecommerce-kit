"use client";

import Link from "next/link";
import { Drawer } from "vaul";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { lineAmount } from "@/types";
import { SmartImage } from "@/components/ui/SmartImage";

export function MiniCartDrawer({ freeShipFrom = siteConfig.shipping.freeFrom }: { freeShipFrom?: number }) {
  const { items, count, subtotal, setQty, remove, drawerOpen, setDrawerOpen } = useCart();
  const remaining = Math.max(0, freeShipFrom - subtotal);
  const progress = freeShipFrom > 0 ? Math.min(100, Math.round((subtotal / freeShipFrom) * 100)) : 100;

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-canvas shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
            <Drawer.Title className="flex items-center gap-2 font-serif text-xl text-primary">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
              Giỏ hàng ({count})
            </Drawer.Title>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng giỏ hàng"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:border-primary hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {freeShipFrom > 0 && items.length > 0 && (
            <div className="border-b border-line bg-white/70 px-5 py-3">
              <p className="text-xs text-muted">
                {remaining > 0 ? (
                  <>
                    Mua thêm <strong className="text-primary tabular">{money(remaining)}</strong> để được miễn phí vận chuyển
                  </>
                ) : (
                  <span className="font-medium text-primary">Đơn hàng đã đủ điều kiện miễn phí vận chuyển</span>
                )}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-muted shadow-sm">
                  <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <p className="mt-4 font-medium text-ink">Giỏ hàng đang trống</p>
                <p className="mt-1 text-sm text-muted">Chọn thêm sản phẩm yêu thích để bắt đầu.</p>
                <Link
                  href="/san-pham"
                  onClick={() => setDrawerOpen(false)}
                  className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white"
                >
                  Khám phá sản phẩm
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => {
                  const step = item.unit === "kg" ? 100 : 1;
                  const amount = lineAmount(item.price, item.quantity, item.unit);
                  return (
                    <li
                      key={`${item.productId}:${item.variantLabel || ""}`}
                      className="flex gap-3 rounded-2xl border border-line bg-white p-3"
                    >
                      <Link
                        href={`/san-pham/${item.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas"
                      >
                        <SmartImage src={item.image} alt={item.name} className="h-full w-full" sizes="64px" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/san-pham/${item.slug}`}
                            onClick={() => setDrawerOpen(false)}
                            className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(item.productId, item.variantLabel)}
                            aria-label={`Xóa ${item.name}`}
                            className="text-muted hover:text-accent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {item.variantLabel && (
                          <p className="mt-0.5 text-xs text-muted">{item.variantLabel}</p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-full border border-line bg-canvas">
                            <button
                              type="button"
                              onClick={() => setQty(item.productId, item.quantity - step, item.variantLabel)}
                              aria-label="Giảm số lượng"
                              className="px-2.5 py-1 text-muted hover:text-ink"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-8 text-center text-xs tabular">
                              {item.unit === "kg" ? `${(item.quantity / 1000).toFixed(1)}kg` : item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(item.productId, item.quantity + step, item.variantLabel)}
                              aria-label="Tăng số lượng"
                              className="px-2.5 py-1 text-muted hover:text-ink"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-medium text-primary tabular">{money(amount)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-line bg-white p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Tạm tính</span>
                <span className="font-serif text-2xl text-primary tabular">{money(subtotal)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Link
                  href="/gio-hang"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full border border-line bg-white py-3 text-center text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  Xem giỏ hàng
                </Link>
                <Link
                  href="/thanh-toan"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full bg-primary py-3 text-center text-sm font-medium text-white shadow-sm hover:bg-primary/90"
                >
                  Thanh toán
                </Link>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
