"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enabledPayments, isEnabled, siteConfig } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discountAmount, money, shippingFee, vietQrUrl } from "@/lib/format";

type Coupon = { code: string; type: "percent" | "fixed" | "shipping"; value: number; minOrder: number };

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const methods = enabledPayments();
  const [method, setMethod] = useState(methods[0]?.key || "cod");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [innerCity, setInnerCity] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [savedAddr, setSavedAddr] = useState<Array<{ id: string; label: string; name: string; phone: string; address: string }>>([]);

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.addresses) && j.addresses.length) {
          setSavedAddr(j.addresses);
          const d = j.addresses[0];
          setBuyer(d.name);
          setBuyerPhone(d.phone);
          setBuyerAddress(d.address);
        }
      })
      .catch(() => {});
  }, []);

  const shipRaw = shippingFee(subtotal, { innerCity });
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

  const applyCoupon = async () => {
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal, email: user?.email }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.message || "Mã không tồn tại");
    if (subtotal < data.coupon.minOrder) {
      return setError(`Đơn tối thiểu ${money(data.coupon.minOrder)}`);
    }
    setApplied(data.coupon);
    setError("");
  };

  const place = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        address: String(form.get("address") || ""),
        note: String(form.get("note") || ""),
        paymentMethod: method,
        couponCode: applied?.code,
        innerCity,
        pointsToUse: usePoints ? 100 : undefined,
        items,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) return setError(data.message || "Không đặt được hàng");
    clear();
    // Lưu địa chỉ vào sổ cho lần sau (khách đăng nhập, best-effort).
    if (user) {
      fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          phone: String(form.get("phone") || ""),
          address: String(form.get("address") || ""),
        }),
      }).catch(() => {});
    }
    if (data.payUrl) {
      window.location.href = data.payUrl;
      return;
    }
    router.push(`/dat-hang-thanh-cong?code=${data.order.code}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl text-primary">Thanh toán</h1>
      <form onSubmit={place} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-medium">Thông tin nhận hàng</h2>
            {savedAddr.length > 0 && (
              <select
                className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
                defaultValue={0}
                onChange={(e) => {
                  const a = savedAddr[Number(e.target.value)];
                  if (a) {
                    setBuyer(a.name);
                    setBuyerPhone(a.phone);
                    setBuyerAddress(a.address);
                  }
                }}
              >
                {savedAddr.map((a, i) => (
                  <option key={a.id} value={i}>
                    {a.label}: {a.name} · {a.address}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required name="name" value={buyer || user?.name || ""} onChange={(e) => setBuyer(e.target.value)} placeholder="Họ tên" className="rounded-xl border border-line px-3 py-2.5 text-sm" />
              <input required name="phone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Số điện thoại" className="rounded-xl border border-line px-3 py-2.5 text-sm" />
              <input required type="email" name="email" defaultValue={user?.email || ""} placeholder="Email" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" />
              <input required name="address" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Địa chỉ" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" />
              <textarea name="note" placeholder="Ghi chú đơn hàng" className="rounded-xl border border-line px-3 py-2.5 text-sm sm:col-span-2" rows={3} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={innerCity} onChange={(e) => setInnerCity(e.target.checked)} />
                Nội thành (phí {money(siteConfig.shipping.innerCityFee)} nếu chưa đạt freeship)
              </label>
              {isEnabled("membership") && user && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                  Dùng 100 điểm thành viên (−{money(1000)})
                </label>
              )}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vietQrUrl({
                    shortCode: siteConfig.payments.bankTransfer.shortCode,
                    accountNumber: siteConfig.payments.bankTransfer.accountNumber,
                    accountName: siteConfig.payments.bankTransfer.accountName,
                    amount: total,
                    addInfo: `DH ${buyer} ${buyerPhone}`.trim().slice(0, 25) || "Thanh toan don hang",
                  })}
                  alt="VietQR chuyển khoản"
                  className="mx-auto w-44 rounded-lg bg-white p-2"
                  loading="lazy"
                />
                <p className="mt-2 text-center font-medium text-ink">{money(total)}</p>
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
          {error && <p className="mt-3 text-xs text-accent">{error}</p>}
          <button disabled={pending} className="mt-5 w-full rounded-full bg-primary py-3 text-sm text-white disabled:opacity-60">
            {pending ? "Đang ghi đơn…" : "Đặt hàng"}
          </button>
          <p className="mt-3 text-xs text-muted">
            Đơn lưu vào cơ sở dữ liệu. COD / chuyển khoản có sẵn; MoMo·VNPay gắn tại src/server/payments.ts.
          </p>
        </aside>
      </form>
    </div>
  );
}
