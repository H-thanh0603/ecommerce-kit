import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listOrders, shopStats } from "@/server/commerce";
import { money } from "@/lib/format";

const statusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export default async function AdminHome() {
  enterTenant(await resolveRequestTenant());
  const [stats, orders] = await Promise.all([shopStats(), listOrders()]);
  const maxDay = Math.max(1, ...stats.days.map((d) => d.total));
  const cards = [
    { label: "Thực thu (hoàn tất)", value: money(stats.revenueCollected) },
    { label: "Ghi nhận (chưa hủy)", value: money(stats.revenue) },
    { label: "Hôm nay", value: money(stats.revenueToday), sub: `${stats.ordersToday} đơn` },
    { label: "Tháng này", value: money(stats.revenueMonth) },
    { label: "Đơn chờ xử lý", value: String(stats.ordersOpen) },
    { label: "Tồn thấp", value: String(stats.lowStock) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Tổng quan</p>
      <h1 className="mt-1 font-serif text-4xl text-primary">Doanh thu & vận hành</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-2 font-serif text-3xl text-primary">{c.value}</p>
            {"sub" in c && c.sub && <p className="mt-1 text-xs text-muted">{c.sub}</p>}
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">7 ngày gần đây</h2>
        <div className="mt-4 flex h-32 items-end gap-2">
          {stats.days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.max(6, (d.total / maxDay) * 100)}%` }}
                title={money(d.total)}
              />
              <span className="text-[10px] text-muted">{d.date}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-medium">Theo trạng thái</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.byStatus.map((s) => (
              <li key={s.status} className="flex justify-between">
                <Link href={`/admin/don-hang?status=${s.status}`} className="underline">
                  {statusLabel[s.status] || s.status} ({s.count})
                </Link>
                <span>{money(s.total)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-medium">Bán chạy</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.topProducts.map((p) => (
              <li key={p.id} className="flex justify-between">
                <Link href={`/admin/san-pham?edit=${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
                <span className="text-muted">{p.sold} bán</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {stats.lowProducts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-medium">Cần nhập hàng</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {stats.lowProducts.map((p) => (
              <li key={p.id} className="flex justify-between rounded-xl bg-canvas px-3 py-2">
                <Link href={`/admin/san-pham?edit=${p.id}`}>{p.name}</Link>
                <span className="text-accent">còn {p.stock}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-10 font-medium">Đơn mới</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Mã</th>
              <th className="px-4 py-3 font-medium">Khách</th>
              <th className="px-4 py-3 font-medium">Tổng</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/don-hang?q=${o.code}`} className="hover:underline">
                    {o.code}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customer}</td>
                <td className="px-4 py-3">{money(o.total)}</td>
                <td className="px-4 py-3">{statusLabel[o.status] || o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Hộp thư: {stats.leadCount} liên hệ</p>
    </div>
  );
}
