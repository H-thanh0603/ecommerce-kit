"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money, shippingFee } from "@/lib/format";
import { siteConfig } from "@/config/site";

export default function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const ship = shippingFee(subtotal);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl text-primary">Giỏ hàng trống</h1>
        <p className="mt-3 text-muted">Thêm vài món bạn thích rồi quay lại đây.</p>
        <Link href="/san-pham" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm text-white">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl text-primary">Giỏ hàng</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.productId + (item.variantLabel || "")}
              className="flex gap-4 rounded-2xl border border-line bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" className="h-24 w-20 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <Link href={`/san-pham/${item.slug}`} className="font-medium">
                  {item.name}
                </Link>
                {item.variantLabel && <p className="text-xs text-muted">{item.variantLabel}</p>}
                <p className="mt-1 text-sm">{money(item.price)}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-line">
                    <button className="px-3 py-1" onClick={() => setQty(item.productId, item.quantity - 1, item.variantLabel)}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button className="px-3 py-1" onClick={() => setQty(item.productId, item.quantity + 1, item.variantLabel)}>
                      +
                    </button>
                  </div>
                  <button
                    className="text-xs text-muted underline"
                    onClick={() => remove(item.productId, item.variantLabel)}
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5">
          <h2 className="font-medium">Tóm tắt</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vận chuyển</span>
              <span>{ship === 0 ? "Miễn phí" : money(ship)}</span>
            </div>
            {subtotal < siteConfig.shipping.freeFrom && (
              <p className="text-xs text-muted">
                Mua thêm {money(siteConfig.shipping.freeFrom - subtotal)} để được freeship.
              </p>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <span>Tổng</span>
              <span>{money(subtotal + ship)}</span>
            </div>
          </div>
          <Link
            href="/thanh-toan"
            className="mt-5 block rounded-full bg-primary py-3 text-center text-sm text-white"
          >
            Thanh toán
          </Link>
        </aside>
      </div>
    </div>
  );
}
