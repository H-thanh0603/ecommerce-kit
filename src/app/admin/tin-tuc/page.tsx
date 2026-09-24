"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btnDanger, btnGhost, btnPrimary } from "@/components/admin/buttons";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  body: string;
  date: string;
  minutes: number;
};

const blank: Omit<Article, "id"> = { slug: "", title: "", excerpt: "", cover: "", body: "", date: "", minutes: 3 };

export default function AdminArticles() {
  const [rows, setRows] = useState<Article[]>([]);
  const [form, setForm] = useState<Omit<Article, "id"> & { id?: string }>(blank);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/articles").then((x) => x.json());
    setRows(r.articles || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setMsg(j.ok ? "Đã lưu bài" : j.message);
    if (j.ok) {
      setForm(blank);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa bài này?")) return;
    await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Bài viết</h1>
        <Link href="/admin" className="text-sm text-muted">← Tổng quan</Link>
      </div>
      <form onSubmit={save} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4">
        <label className="grid gap-1 text-sm">Tiêu đề<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Đường dẫn<input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="bai-moi" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Tóm tắt<input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Ảnh bìa (URL)<input value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Nội dung<textarea required rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="rounded-xl border border-line px-3 py-2" /></label>
        <div className="flex gap-2">
          <button className={btnPrimary}>{form.id ? "Lưu bài" : "Thêm bài"}</button>
          {form.id && (
            <button type="button" className={btnGhost} onClick={() => setForm(blank)}>Hủy sửa</button>
          )}
        </div>
      </form>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{a.title}</b>
              <span className="block text-muted">{a.date} · /tin-tuc/{a.slug}</span>
            </span>
            <span className="flex gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(a)}>Sửa</button>
              <button type="button" className={btnDanger} onClick={() => remove(a.id)}>Xóa</button>
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-muted">Chưa có bài. Viết bài đầu tiên ở form phía trên.</li>}
      </ul>
    </div>
  );
}
