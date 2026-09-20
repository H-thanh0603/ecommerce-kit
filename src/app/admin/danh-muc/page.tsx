"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category } from "@/types";

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/categories").then((r) => r.json()).then((d) => setRows(d.categories || []));
  useEffect(() => { load(); }, []);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        slug: String(f.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
        description: f.get("description"),
        image: f.get("image"),
      }),
    });
    setMsg(res.ok ? "Đã thêm" : "Lỗi");
    if (res.ok) { e.currentTarget.reset(); load(); }
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Danh mục</h1><Link href="/admin" className="text-sm text-muted">← Dashboard</Link></div>
      <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <input required name="name" placeholder="Tên" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input required name="slug" placeholder="slug" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="image" placeholder="URL ảnh" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
        <input name="description" placeholder="Mô tả" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
        <button className="rounded-full bg-primary py-2 text-sm text-white">Thêm</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
      <ul className="mt-6 space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <span>{c.name} · {c.slug} · {c.productCount} SP</span>
            <button
              className="underline text-accent"
              onClick={async () => {
                const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
                const data = await res.json();
                if (!res.ok) alert(data.message);
                load();
              }}
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
