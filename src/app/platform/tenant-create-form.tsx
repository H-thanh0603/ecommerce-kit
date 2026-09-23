"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TenantCreateForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [hosts, setHosts] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          hosts: hosts.split(",").map((h) => h.trim()).filter(Boolean),
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Tạo tenant thất bại");
      setMsg(`Đã tạo tenant ${j.tenant.slug} — migrate schema riêng chạy bằng migrate-all (T10).`);
      setSlug("");
      setName("");
      setHosts("");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Tạo tenant thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-5">
      <h2 className="font-medium">Tạo tenant mới</h2>
      <p className="mt-1 text-xs text-muted">
        Tạo Tenant + TenantDomain trong schema platform. Migrate schema riêng của tenant chạy bằng
        script migrate-all (T10).
      </p>
      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Slug (a–z, 0–9, _, tối đa 31)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="^[a-z][a-z0-9_]{1,30}$"
            placeholder="shop_moi"
            className="rounded-lg border border-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Tên tenant</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Cửa hàng mới"
            className="rounded-lg border border-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted">Domains (cách nhau dấu phẩy)</span>
          <input
            value={hosts}
            onChange={(e) => setHosts(e.target.value)}
            required
            placeholder="shop.example.vn, www.shop.example.vn"
            className="rounded-lg border border-line px-3 py-2"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Đang tạo…" : "Tạo tenant"}
          </button>
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </div>
      </form>
    </section>
  );
}
