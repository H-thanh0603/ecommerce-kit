import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { listOrders } from "@/server/commerce";
import { money, qtyLabel } from "@/lib/format";

export default async function PrintOrders({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  enterTenant(await resolveRequestTenant());
  const sp = await searchParams;
  const want = new Set((sp.ids || "").split(",").filter(Boolean));
  const orders = (await listOrders()).filter((o) => want.has(o.id));
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:max-w-none">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="font-serif text-3xl text-primary">In {orders.length} đơn</h1>
        <p className="text-sm text-muted">Bấm Ctrl+P (hoặc menu trình duyệt) để in.</p>
      </div>
      {orders.map((o) => (
        <article key={o.id} className="mb-8 break-inside-avoid border-b border-line pb-6">
          <h2 className="font-serif text-2xl">{o.code}</h2>
          <p className="mt-1 text-sm">
            {o.customer} · {o.phone} · {o.address}
          </p>
          <ul className="mt-3 text-sm">
            {o.items.map((i) => (
              <li key={i.productId + (i.variantLabel || "")}>
                {i.name} {qtyLabel(i.quantity, i.unit)} — {money(i.price)}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-medium">Tổng {money(o.total)}</p>
        </article>
      ))}
      {orders.length === 0 && <p>Không có đơn để in.</p>}
    </div>
  );
}
