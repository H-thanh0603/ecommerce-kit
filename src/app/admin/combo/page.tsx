"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";

type Bundle = { id: string; name: string; price: number; active: boolean; lines: Array<{ productId: string; quantity: number }> };

export default function AdminBundles() {
  const [rows, setRows] = useState<Bundle[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [linesJson, setLinesJson] = useState('[{"productId":"p1","quantity":1}]');
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/bundles").then((x) => x.json());
    setRows(r.bundles || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    let lines: unknown = [];
    try {
      lines = JSON.parse(linesJson);
    } catch {
      setMsg("linesJson không phải JSON");
      return;
    }
    const res = await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), lines }),
    });
    const j = await res.json();
    setMsg(j.ok ? `Đã lưu ${j.bundle.name}` : j.message);
    if (j.ok) {
      setName("");
      setPrice("");
      load();
    }
  }

  async function remove(id: string) {
    await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Combo</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
        </Link>
      </div>
      <div className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên combo" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} placeholder="Giá combo (đ)" className="rounded-lg border border-line px-3 py-2 text-sm" />
        <textarea value={linesJson} onChange={(e) => setLinesJson(e.target.value)} rows={3} placeholder='[{"productId":"p1","skuId":"...","quantity":1}]' className="rounded-lg border border-line px-3 py-2 font-mono text-xs" />
        <button onClick={save} className="rounded-full bg-primary px-4 py-2 text-sm text-white">
          Lưu combo
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{b.name}</b> · {money(b.price)} · {b.lines.length} dòng · {b.active ? "bật" : "tắt"}
            </span>
            <button onClick={() => remove(b.id)} className="text-xs underline">
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
