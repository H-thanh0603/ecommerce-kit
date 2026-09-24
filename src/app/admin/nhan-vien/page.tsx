"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btnDanger, btnPrimary } from "@/components/admin/buttons";

type Staff = { id: string; email: string; name: string; createdAt: string };

export default function AdminStaff() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/staff").then((x) => x.json());
    setRows(r.staff || []);
    setMe(r.me || "");
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name"), email: f.get("email"), password: f.get("password") }),
    });
    const j = await res.json();
    setMsg(j.ok ? "Đã thêm nhân viên. Họ đăng nhập bằng email và mật khẩu vừa đặt." : j.message);
    if (j.ok) {
      e.currentTarget.reset();
      load();
    }
  }

  async function revoke(id: string, email: string) {
    if (!confirm(`Gỡ quyền admin của ${email}? Họ vẫn đăng nhập được như khách.`)) return;
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", id }),
    });
    const j = await res.json();
    setMsg(j.ok ? "Đã gỡ quyền" : j.message);
    if (j.ok) load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Nhân viên</h1>
        <Link href="/admin" className="text-sm text-muted">← Tổng quan</Link>
      </div>
      <p className="mt-1 text-sm text-muted">Người được thêm đăng nhập /admin bằng email và mật khẩu bạn đặt. Khách cũ sẽ được nâng thành admin.</p>
      <form onSubmit={create} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Tên<input required name="name" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Email<input required type="email" name="email" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Mật khẩu (ít nhất 8 ký tự)<input required minLength={8} type="password" name="password" className="rounded-xl border border-line px-3 py-2" /></label>
        <button className={btnPrimary}>Thêm nhân viên</button>
      </form>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{s.name}</b> · {s.email}
              <span className="block text-muted">{s.id === me ? "Đang đăng nhập" : `Từ ${s.createdAt}`}</span>
            </span>
            {s.id !== me && (
              <button type="button" className={btnDanger} onClick={() => revoke(s.id, s.email)}>
                Gỡ quyền
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
