"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import { money, qtyLabel } from "@/lib/format";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { PayBadge, GhnButton, OrderTimeline } from "@/components/admin/OrderActions";
import { IssueInvoiceButton } from "@/components/admin/IssueInvoiceButton";
import { isEnabled } from "@/config/site";

/**
 * Side panel chi tiết đơn (pattern Twenty CRM) — mở bằng URL ?order=<id>
 * trên /admin/don-hang; đóng = xóa param, giữ nguyên filter/page phía sau
 * (rule UI-011). Nội dung chi tiết dời từ card inline-expand sang đây.
 */
export function OrderPanel({ order }: { order: Order }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    const qs = url.searchParams.toString();
    router.push(url.pathname + (qs ? `?${qs}` : ""));
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30 print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết đơn ${order.code}`}
        tabIndex={-1}
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-white p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-2xl text-primary">{order.code}</h2>
          <button type="button" onClick={close} aria-label="Đóng chi tiết" className="rounded-full border border-line px-3 py-1 text-sm hover:border-primary">
            ✕
          </button>
        </div>

        <div className="mt-3">
          <OrderStatusForm id={order.id} status={order.status} />
        </div>

        <section className="mt-4 text-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Khách hàng</p>
          <p className="mt-1">{order.customer}</p>
          <p className="text-muted">{order.email} · {order.phone}</p>
          <p className="text-muted">{order.address}</p>
          {order.note && <p className="mt-1 italic text-muted">Ghi chú: {order.note}</p>}
        </section>

        <section className="mt-4 text-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Sản phẩm</p>
          <ul className="mt-1">
            {order.items.map((i) => (
              <li key={i.productId + (i.variantLabel || "")} className="flex justify-between gap-3 py-0.5">
                <span>
                  {i.name} {qtyLabel(i.quantity, i.unit)}
                </span>
                <span className="tabular-nums text-muted">{money(i.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-0.5 border-t border-line pt-2 tabular-nums">
            <div className="flex justify-between"><dt className="text-muted">Tạm tính</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Ship</dt><dd>{money(order.shippingFee)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between"><dt className="text-muted">Giảm {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>-{money(order.discount)}</dd></div>
            )}
            <div className="flex justify-between font-medium"><dt>Tổng</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </section>

        <section className="mt-4 text-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Thanh toán</p>
          <p className="mt-1">{order.paymentMethod}</p>
          <PayBadge status={order.paymentStatus || "unpaid"} method={order.paymentMethod} />
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          {isEnabled("invoices") && <IssueInvoiceButton orderId={order.id} />}
          {isEnabled("ghn") && order.status !== "cancelled" && (
            <GhnButton orderCode={order.code} hasLabel={order.ghnOrderCode} />
          )}
        </div>

        <section className="mt-4 border-t border-line pt-2">
          <OrderTimeline orderId={order.id} />
        </section>
      </div>
    </div>
  );
}
