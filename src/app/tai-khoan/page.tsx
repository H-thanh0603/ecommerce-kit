"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { orders } from "@/data/catalog";
import { money } from "@/lib/format";

const statusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export default function AccountPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-primary">Bạn chưa đăng nhập</h1>
        <Link href="/dang-nhap" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-white">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const mine = user.role === "admin" ? orders : orders.slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-primary">Xin chào, {user.name}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-primary px-4 py-2 text-sm text-white">
              Vào admin
            </Link>
          )}
          <button onClick={logout} className="rounded-full border border-line px-4 py-2 text-sm">
            Đăng xuất
          </button>
        </div>
      </div>

      <h2 className="mt-10 font-medium">Đơn gần đây</h2>
      <ul className="mt-4 space-y-3">
        {mine.map((o) => (
          <li key={o.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{o.code}</p>
              <p className="text-sm text-muted">{statusLabel[o.status]}</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              {o.createdAt} · {o.items.length} món · {money(o.total)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
