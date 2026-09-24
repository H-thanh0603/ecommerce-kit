"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btnGhost, btnPrimary } from "@/components/admin/buttons";

type Stock = { productId: string; skuKey: string; stock: number; product?: { name: string } };
type Wh = { id: string; code: string; name: string; address: string; isDefault: boolean; stocks: Stock[] };
type ProductOpt = { id: string; name: string };

export default function AdminWarehouse() {
  const [rows, setRows] = useState<Wh[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/warehouses").then((r) => r.json()).then((d) => setRows(d.warehouses || []));
  useEffect(() => {
    load();
    fetch("/api/products?pageSize=48").then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  async function saveStock(warehouseId: string, productId: string, skuKey: string) {
    const key = `${warehouseId}:${productId}:${skuKey}`;
    const stock = Number(draft[key] ?? rows.flatMap((w) => w.stocks).find((s) => `${warehouseId}:${s.productId}:${s.skuKey}` === key)?.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      setMsg("Tồn phải là số ≥ 0");
      return;
    }
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId, productId, skuKey, stock }),
    });
    setMsg(res.ok ? "Đã cập nhật tồn" : "Không lưu được tồn");
    if (res.ok) load();
  }
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
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Kho</h1><Link href="/admin" className="text-sm text-muted">← Tổng quan</Link></div>
      <form onSubmit={onSubmit} className="mt-6 grid gap-2 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <input required name="code" placeholder="Mã (HCM)" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input required name="name" placeholder="Tên kho" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <input name="address" placeholder="Địa chỉ" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
        <label className="text-sm"><input type="checkbox" name="isDefault" /> Mặc định</label>
        <button className={btnPrimary}>Thêm kho</button>
      </form>
      {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-3">
        {rows.map((w) => (
          <li key={w.id} className="rounded-xl border border-line bg-white p-4 text-sm">
            <p className="font-medium">{w.name} ({w.code}) {w.isDefault ? "· mặc định" : ""}</p>
            <p className="text-muted">{w.address}</p>
            <ul className="mt-3 space-y-2">
              {w.stocks.map((s) => {
                const key = `${w.id}:${s.productId}:${s.skuKey}`;
                return (
                  <li key={key} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-40 flex-1">{s.product?.name || s.productId}{s.skuKey ? ` · ${s.skuKey}` : ""}</span>
                    <input
                      type="number"
                      min={0}
                      value={draft[key] ?? String(s.stock)}
                      aria-label={`Tồn ${s.product?.name || s.productId}`}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      className="w-24 rounded-lg border border-line px-2 py-1"
                    />
                    <button type="button" className={btnGhost} onClick={() => saveStock(w.id, s.productId, s.skuKey)}>
                      Lưu tồn
                    </button>
                  </li>
                );
              })}
            </ul>
            <AddStock warehouseId={w.id} products={products} onDone={load} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddStock({ warehouseId, products, onDone }: { warehouseId: string; products: ProductOpt[]; onDone: () => void }) {
  const [productId, setProductId] = useState("");
  const [stock, setStock] = useState("0");
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!productId) return;
        await fetch("/api/warehouses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warehouseId, productId, skuKey: "", stock: Number(stock) }),
        });
        setProductId("");
        onDone();
      }}
    >
      <label className="grid gap-1 text-sm">
        Thêm sản phẩm vào kho
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1">
          <option value="">Chọn sản phẩm…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-24 rounded-lg border border-line px-2 py-1" aria-label="Số tồn mới" />
      <button className={btnPrimary}>Thêm tồn</button>
    </form>
  );
}
