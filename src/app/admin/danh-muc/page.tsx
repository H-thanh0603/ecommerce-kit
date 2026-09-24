"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types";
import { btnDanger, btnGhost, btnPrimary } from "@/components/admin/buttons";

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Category | null>(null);
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-serif text-3xl text-primary">Danh mục</h1>
      <p className="mt-1 text-sm text-muted">Điền form rồi bấm Thêm danh mục. Mỗi dòng có Sửa và Xóa.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Tên<input required name="name" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Đường dẫn<input required name="slug" placeholder="thoi-trang" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Ảnh (URL)<input name="image" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Mô tả<input name="description" className="rounded-xl border border-line px-3 py-2" /></label>
        <button className={btnPrimary}>Thêm danh mục</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
      <ul className="mt-6 space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <span>{c.name} · {c.slug} · {c.productCount} SP</span>
            <span className="flex gap-2">
              <button type="button" className={btnGhost} onClick={() => setEdit(c)}>
                Sửa
              </button>
              <button
                type="button"
                className={btnDanger}
                onClick={async () => {
                  if (!confirm(`Xóa danh mục «${c.name}»?`)) return;
                  const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
                  const data = await res.json();
                  if (!res.ok) alert(data.message);
                  load();
                }}
              >
                Xóa
              </button>
            </span>
          </li>
        ))}
      </ul>
      {edit && (
        <form
          className="mt-4 grid gap-2 rounded-2xl border border-line bg-white p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const res = await fetch(`/api/categories/${edit.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: f.get("name"),
                slug: String(f.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
                description: f.get("description"),
                image: f.get("image"),
              }),
            });
            setMsg(res.ok ? "Đã sửa danh mục" : "Không sửa được");
            if (res.ok) {
              setEdit(null);
              load();
            }
          }}
        >
          <p className="font-medium">Sửa «{edit.name}»</p>
          <label className="grid gap-1 text-sm">Tên<input name="name" required defaultValue={edit.name} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Đường dẫn<input name="slug" required defaultValue={edit.slug} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Ảnh<input name="image" defaultValue={edit.image} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Mô tả<input name="description" defaultValue={edit.description} className="rounded-xl border border-line px-3 py-2" /></label>
          <div className="flex gap-2">
            <button className={btnPrimary}>Lưu danh mục</button>
            <button type="button" className={btnGhost} onClick={() => setEdit(null)}>Hủy</button>
          </div>
        </form>
      )}
    </div>
  );
}
