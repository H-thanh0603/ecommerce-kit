import Link from "next/link";
import { listOrders, shopStats } from "@/server/commerce";
import { money } from "@/lib/format";
import { isEnabled } from "@/config/site";

export default async function AdminHome() {
  const [stats, orders] = await Promise.all([shopStats(), listOrders()]);
  const cards = [
    { label: "Doanh thu", value: money(stats.revenue) },
    { label: "Đơn hàng", value: String(stats.orderCount) },
    { label: "Sản phẩm", value: String(stats.productCount) },
    { label: "Tồn thấp", value: String(stats.lowStock) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
          <h1 className="mt-1 font-serif text-4xl text-primary">Bảng điều khiển</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/san-pham" className="rounded-full border border-line bg-white px-3 py-1.5">
            Sản phẩm
          </Link>
          <Link href="/admin/danh-muc" className="rounded-full border border-line bg-white px-3 py-1.5">
            Danh mục
          </Link>
          <Link href="/admin/ma-giam" className="rounded-full border border-line bg-white px-3 py-1.5">
            Mã giảm
          </Link>
          <Link href="/admin/don-hang" className="rounded-full border border-line bg-white px-3 py-1.5">
            Đơn hàng
          </Link>
          <Link href="/admin/lien-he" className="rounded-full border border-line bg-white px-3 py-1.5">
            Hộp thư
          </Link>
          {isEnabled("booking") && (
            <Link href="/admin/dat-lich" className="rounded-full border border-line bg-white px-3 py-1.5">
              Đặt lịch
            </Link>
          )}
          {isEnabled("multiWarehouse") && (
            <Link href="/admin/kho" className="rounded-full border border-line bg-white px-3 py-1.5">
              Kho
            </Link>
          )}
          {isEnabled("invoices") && (
            <Link href="/admin/hoa-don" className="rounded-full border border-line bg-white px-3 py-1.5">
              Hóa đơn
            </Link>
          )}
          {isEnabled("aiAgent") && (
            <Link href="/admin/ai" className="rounded-full border border-line bg-white px-3 py-1.5">
              AI Agent
            </Link>
          )}
          <Link href="/admin/cai-dat" className="rounded-full border border-line bg-white px-3 py-1.5">
            Cài đặt
          </Link>
        </nav>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-2 font-serif text-3xl text-primary">{c.value}</p>
          </div>
        ))}
      </div>

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
                <td className="px-4 py-3">{o.code}</td>
                <td className="px-4 py-3">{o.customer}</td>
                <td className="px-4 py-3">{money(o.total)}</td>
                <td className="px-4 py-3">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
