import Link from "next/link";
import { listOrders } from "@/server/commerce";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { money, qtyLabel } from "@/lib/format";
import { isEnabled } from "@/config/site";
import { IssueInvoiceButton } from "@/components/admin/IssueInvoiceButton";
import { GhnButton, OrderTimeline, PayBadge } from "@/components/admin/OrderActions";

const statuses = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã huỷ" },
];

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const orders = await listOrders({ status: sp.status || undefined, q: sp.q || undefined });
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-serif text-3xl text-primary">Đơn hàng</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Mã, tên, email, SĐT"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm"
        />
        <select name="status" defaultValue={sp.status || ""} className="rounded-full border border-line bg-white px-3 py-2 text-sm">
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-primary px-4 py-2 text-sm text-white">Lọc</button>
      </form>
      <p className="mt-2 text-sm text-muted">{orders.length} đơn</p>
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <article key={o.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{o.code}</p>
              <OrderStatusForm id={o.id} status={o.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {o.customer} · {o.email} · {o.phone} · {o.address}
            </p>
            <p className="text-xs text-muted">{o.createdAt} · {o.paymentMethod}</p>
            <div className="mt-1">
              <PayBadge status={o.paymentStatus} method={o.paymentMethod} />
            </div>
            <ul className="mt-3 text-sm">
              {o.items.map((i) => (
                <li key={i.productId + (i.variantLabel || "")}>
                  {i.name} {qtyLabel(i.quantity, i.unit)} — {money(i.price)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-medium">Tổng {money(o.total)}</p>
            {isEnabled("invoices") && <IssueInvoiceButton orderId={o.id} />}
            {isEnabled("ghn") && o.status !== "cancelled" && (
              <GhnButton orderCode={o.code} hasLabel={o.ghnOrderCode} />
            )}
            <OrderTimeline orderCode={o.code} />
          </article>
        ))}
        {orders.length === 0 && <p className="text-sm text-muted">Không có đơn khớp bộ lọc.</p>}
      </div>
    </div>
  );
}
