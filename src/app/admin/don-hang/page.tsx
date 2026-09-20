import Link from "next/link";
import { listOrders } from "@/server/commerce";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { money } from "@/lib/format";

export default async function AdminOrders() {
  const orders = await listOrders();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Đơn hàng</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <article key={o.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{o.code}</p>
              <OrderStatusForm id={o.id} status={o.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {o.customer} · {o.phone} · {o.address}
            </p>
            <ul className="mt-3 text-sm">
              {o.items.map((i) => (
                <li key={i.productId + (i.variantLabel || "")}>
                  {i.name} × {i.quantity} — {money(i.price * i.quantity)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-medium">Tổng {money(o.total)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
