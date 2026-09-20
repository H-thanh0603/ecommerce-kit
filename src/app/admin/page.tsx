"use client";

import Link from "next/link";
import { orders, products } from "@/data/catalog";
import { money } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export default function AdminHome() {
  const { user } = useAuth();
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-primary">Khu vực quản trị</h1>
        <p className="mt-2 text-sm text-muted">Đăng nhập tài khoản admin để vào.</p>
        <Link href="/dang-nhap" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-white">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const cards = [
    { label: "Doanh thu demo", value: money(revenue) },
    { label: "Đơn hàng", value: String(orders.length) },
    { label: "Sản phẩm", value: String(products.length) },
    { label: "Tồn thấp", value: String(products.filter((p) => p.stock < 15).length) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
          <h1 className="mt-1 font-serif text-4xl text-primary">Bảng điều khiển</h1>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href="/admin/san-pham" className="rounded-full border border-line bg-white px-3 py-1.5">
            Sản phẩm
          </Link>
          <Link href="/admin/don-hang" className="rounded-full border border-line bg-white px-3 py-1.5">
            Đơn hàng
          </Link>
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
            {orders.map((o) => (
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
