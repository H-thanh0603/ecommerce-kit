import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { countOrders, getOrderById, listOrders } from "@/server/commerce";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { money } from "@/lib/format";
import { OrderCheck, OrderSelection } from "@/components/admin/OrderSelection";
import { SavedViews } from "@/components/admin/SavedViews";
import { OrderPanel } from "@/components/admin/OrderPanel";

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
  searchParams: Promise<{ status?: string; q?: string; page?: string; order?: string }>;
}) {
  enterTenant(await resolveRequestTenant());
  const sp = await searchParams;
  // Phân trang DB-side (skip/take) — không kéo toàn bộ bảng Order về rồi slice trong RAM.
  const pageSize = 20;
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const filter = { status: sp.status || undefined, q: sp.q || undefined };
  const [orders, total] = await Promise.all([
    listOrders(filter, { page, pageSize }),
    countOrders(filter),
  ]);
  // Side panel: detail fetch theo ?order=<id> — list phía sau giữ nguyên filter (UI-011).
  const panelOrder = sp.order ? await getOrderById(sp.order) : null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const baseParams = new URLSearchParams();
  if (sp.status) baseParams.set("status", sp.status);
  if (sp.q) baseParams.set("q", sp.q);
  const qs = (n: number) => {
    const p = new URLSearchParams(baseParams);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const detailHref = (id: string) => {
    const p = new URLSearchParams(baseParams);
    if (page > 1) p.set("page", String(page));
    p.set("order", id);
    return `?${p.toString()}`;
  };
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
      <SavedViews path="/admin/don-hang" params={{ status: sp.status, q: sp.q, page: sp.page }} />
      <p className="mt-2 text-sm text-muted">{total} đơn. Chọn ô vuông để giao hoặc in nhiều đơn trên trang này.</p>
      <OrderSelection>
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <article key={o.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium"><OrderCheck id={o.id} />{o.code}</p>
              <OrderStatusForm id={o.id} status={o.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {o.customer} · {o.email} · {o.createdAt}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium tabular-nums">Tổng {money(o.total)}</p>
              <Link href={`/admin/don-hang${detailHref(o.id)}`} className="text-sm text-primary underline-offset-2 hover:underline">
                Chi tiết →
              </Link>
            </div>
          </article>
        ))}
        {orders.length === 0 && <p className="text-sm text-muted">Không có đơn khớp bộ lọc.</p>}
      </div>
      </OrderSelection>
      {pages > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/admin/don-hang${qs(n)}`}
              className={`rounded-full border px-3 py-1 ${n === page ? "border-primary bg-primary text-white" : "border-line"}`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
      {panelOrder && <OrderPanel order={panelOrder} />}
    </div>
  );
}
