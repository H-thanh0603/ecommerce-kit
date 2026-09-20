"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  active: boolean;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  endsAt: string | null;
};

export default function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const load = () => fetch("/api/coupons/admin").then((r) => r.json()).then((d) => setRows(d.coupons || []));
  useEffect(() => { load(); }, []);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await fetch("/api/coupons/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: f.get("code"),
        type: f.get("type"),
        value: Number(f.get("value")),
        minOrder: Number(f.get("minOrder") || 0),
        maxUses: f.get("maxUses"),
        maxUsesPerUser: f.get("maxUsesPerUser"),
        endsAt: f.get("endsAt") || null,
      }),
    });
    e.currentTarget.reset();
    load();
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Mã giảm giá</h1><Link href="/admin" className="text-sm text-muted">← Dashboard</Link></div>
      <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <input required name="code" placeholder="CODE" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <select name="type" className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="percent">%</option>
          <option value="fixed">Số tiền</option>
          <option value="shipping">Freeship</option>
        </select>
        <input required name="value" type="number" placeholder="Giá trị" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="minOrder" type="number" placeholder="Đơn tối thiểu" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="maxUses" type="number" placeholder="Tổng lượt (trống = ∞)" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="maxUsesPerUser" type="number" placeholder="Lượt / người" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="endsAt" type="datetime-local" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
        <button className="rounded-full bg-primary py-2 text-sm text-white">Thêm mã</button>
      </form>
      <ul className="mt-6 space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <span>{c.code} · {c.type} {c.value} · min {c.minOrder} · {c.active ? "bật" : "tắt"}</span>
            <button className="underline text-accent" onClick={async () => { await fetch(`/api/coupons/admin?id=${c.id}`, { method: "DELETE" }); load(); }}>Xóa</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
