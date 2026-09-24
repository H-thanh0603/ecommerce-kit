"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { btnDanger, btnGhost, btnPrimary } from "@/components/admin/buttons";

type Line = { productId: string; quantity: number };
type Bundle = { id: string; name: string; price: number; active: boolean; lines: Line[] };
type ProductOpt = { id: string; name: string };

const emptyLine = (): Line => ({ productId: "", quantity: 1 });

export default function AdminBundles() {
  const [rows, setRows] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [msg, setMsg] = useState("");

  async function load() {
    const [b, p] = await Promise.all([
      fetch("/api/admin/bundles").then((x) => x.json()),
      fetch("/api/products?pageSize=48").then((x) => x.json()),
    ]);
    setRows(b.bundles || []);
    setProducts((p.products || []).map((x: ProductOpt) => ({ id: x.id, name: x.name })));
  }
  useEffect(() => {
    load();
  }, []);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((curr) => curr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save() {
    const clean = lines.filter((l) => l.productId && l.quantity > 0);
    const res = await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), lines: clean }),
    });
    const j = await res.json();
    setMsg(j.ok ? `Đã lưu ${j.bundle.name}` : j.message);
    if (j.ok) {
      setName("");
      setPrice("");
      setLines([emptyLine()]);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa combo này?")) return;
    await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name || id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Combo</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">Chọn sản phẩm và số lượng. Không cần dán JSON.</p>
      <div className="mt-6 grid gap-3 rounded-2xl border border-line bg-white p-4">
        <label className="grid gap-1 text-sm">
          Tên combo
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-line px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Giá combo (đ)
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} className="rounded-lg border border-line px-3 py-2" />
        </label>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
              Sản phẩm
              <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} className="rounded-lg border border-line bg-white px-3 py-2">
                <option value="">Chọn…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid w-24 gap-1 text-sm">
              Số lượng
              <input type="number" min={1} value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} className="rounded-lg border border-line px-3 py-2" />
            </label>
            <button type="button" className={btnGhost} onClick={() => setLines((curr) => curr.filter((_, idx) => idx !== i))}>
              Bỏ dòng
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={() => setLines((curr) => [...curr, emptyLine()])}>
            Thêm dòng
          </button>
          <button type="button" onClick={save} className={btnPrimary}>
            Lưu combo
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{b.name}</b> · {money(b.price)} · {b.active ? "bật" : "tắt"}
              <span className="mt-1 block text-muted">
                {b.lines.map((l) => `${nameOf(l.productId)} × ${l.quantity}`).join(", ") || "Chưa có dòng"}
              </span>
            </span>
            <button type="button" onClick={() => remove(b.id)} className={btnDanger}>
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
