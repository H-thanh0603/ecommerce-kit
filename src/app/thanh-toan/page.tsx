"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enabledPayments, isEnabled, siteConfig } from "@/config/site";
import { coupons } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { discountAmount, money, shippingFee } from "@/lib/format";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const methods = enabledPayments();
  const [method, setMethod] = useState(methods[0]?.key || "cod");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<(typeof coupons)[number] | null>(null);
  const [error, setError] = useState("");

  const shipRaw = shippingFee(subtotal);
  const ship = applied?.type === "shipping" ? 0 : shipRaw;
  const off = useMemo(() => discountAmount(subtotal, applied || undefined), [applied, subtotal]);
  const total = Math.max(0, subtotal + ship - off);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-primary">Chưa có sản phẩm để thanh toán</h1>
      </div>
    );
  }

  const applyCoupon = () => {
    const found = coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!found) return setError("Mã không tồn tại");
    if (subtotal < found.minOrder) {
      return setError(`Đơn tối thiểu ${money(found.minOrder)}`);
    }
    setApplied(found);
    setError("");
  };

  const place = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const codeOrder = "ATL-" + Math.floor(10000 + Math.random() * 89999);
    clear();
    router.push(`/dat-hang-thanh-cong?code=${codeOrder}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl text-primary">Thanh toán</h1>
      <form onSubmit={place} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-medium">Thông tin nhận hàng</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required name="name" placeholder="Họ tên" className="rounded-xl border border-line px-3 py-2.5 text-sm" />
              <input required name="phone" placeholder="Số điện thoại" className="rounded-xl border border-line px-3 py-2.5 text-sm" />
              <input required type="email" name="email" placeholder="Email" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" />
              <input required name="address" placeholder="Địa chỉ" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" />
              <textarea name="note" placeholder="Ghi chú đơn hàng" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" rows={3} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-medium">Phương thức thanh toán</h2>
            <div className="mt-4 space-y-2">
              {methods.map((m) => (
                <label key={m.key} className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={method === m.key}
                    onChange={() => setMethod(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
            {method === "bankTransfer" && (
              <div className="mt-3 rounded-xl bg-canvas p-3 text-sm text-muted">
                <p>{siteConfig.payments.bankTransfer.bank}</p>
                <p>{siteConfig.payments.bankTransfer.accountName}</p>
                <p>{siteConfig.payments.bankTransfer.accountNumber}</p>
                <p className="mt-1">Nội dung: Tên + SĐT</p>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5">
          <h2 className="font-medium">Đơn hàng</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId + i.variantLabel} className="flex justify-between gap-3">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {isEnabled("coupons") && (
            <div className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Mã giảm giá"
                className="flex-1 rounded-full border border-line px-3 py-2 text-sm"
              />
              <button type="button" onClick={applyCoupon} className="rounded-full border border-line px-3 text-sm">
                Áp dụng
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-accent">{error}</p>}
          {applied && <p className="mt-2 text-xs text-primary">Đã áp dụng {applied.code}</p>}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vận chuyển</span>
              <span>{ship === 0 ? "Miễn phí" : money(ship)}</span>
            </div>
            {off > 0 && (
              <div className="flex justify-between">
                <span>Giảm giá</span>
                <span>-{money(off)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <span>Tổng</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <button className="mt-5 w-full rounded-full bg-primary py-3 text-sm text-white">
            Đặt hàng
          </button>
          <p className="mt-3 text-xs text-muted">
            Đây là khung demo: đơn được ghi nhận trên trình duyệt, chưa gọi cổng thanh toán thật.
          </p>
        </aside>
      </form>
    </div>
  );
}
