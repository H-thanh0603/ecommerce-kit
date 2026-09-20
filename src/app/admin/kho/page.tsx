"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Wh = { id: string; code: string; name: string; address: string; isDefault: boolean; stocks: { productId: string; skuKey: string; stock: number }[] };

export default function AdminWarehouse() {
  const [rows, setRows] = useState<Wh[]>([]);
  const load = () => fetch("/api/warehouses").then((r) => r.json()).then((d) => setRows(d.warehouses || []));
  useEffect(() => { load(); }, []);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: f.get("code"),
        name: f.get("name"),
        address: f.get("address"),
        isDefault: f.get("isDefault") === "on",
      }),
    });
    e.currentTarget.reset();
    load();
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Kho</h1><Link href="/admin" className="text-sm text-muted">← Dashboard</Link></div>
      <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <input required name="code" placeholder="Mã (HCM)" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input required name="name" placeholder="Tên kho" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="address" placeholder="Địa chỉ" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
        <label className="text-sm"><input type="checkbox" name="isDefault" /> Mặc định</label>
        <button className="rounded-full bg-primary py-2 text-sm text-white">Thêm kho</button>
      </form>
      <ul className="mt-6 space-y-3">
        {rows.map((w) => (
          <li key={w.id} className="rounded-xl border border-line bg-white p-4 text-sm">
            <p className="font-medium">{w.name} ({w.code}) {w.isDefault ? "· mặc định" : ""}</p>
            <p className="text-muted">{w.address} · {w.stocks.length} SKU</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
