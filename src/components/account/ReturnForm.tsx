"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types";

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  completed: "Đã hoàn tồn",
  rejected: "Từ chối",
};

type MyReturn = { id: string; reason: string; status: string; order: { code: string } };

/** Form gửi yêu cầu trả hàng + danh sách yêu cầu của khách. */
export function ReturnForm({ orders, email }: { orders: Order[]; email: string }) {
  const eligible = orders.filter((o) => o.status !== "cancelled");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [mine, setMine] = useState<MyReturn[]>([]);

  const order = eligible.find((o) => o.code === code);

  async function loadMine() {
    const r = await fetch("/api/returns").then((x) => x.json()).catch(() => ({}));
    if (Array.isArray(r.returns)) setMine(r.returns);
  }
  useEffect(() => {
    loadMine();
  }, []);

  async function submit() {
    setMsg("");
    if (!order) return setMsg("Chọn đơn cần trả");
    const items = order.items
      .filter((i) => (qty[i.productId + (i.skuId || "")] || 0) > 0)
      .map((i) => ({
        productId: i.productId,
        skuId: i.skuId,
        variantLabel: i.variantLabel,
        quantity: qty[i.productId + (i.skuId || "")],
      }));
    if (!items.length) return setMsg("Chọn món và số lượng cần trả");
    const res = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode: order.code, email, items, reason }),
    });
    const j = await res.json();
    if (!j.ok) return setMsg(j.message || "Gửi thất bại");
    setMsg("Đã gửi yêu cầu, shop sẽ duyệt sớm.");
    setQty({});
    setReason("");
    loadMine();
  }

  if (!eligible.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-medium">Yêu cầu đổi / trả hàng</h2>
      <div className="mt-3 grid gap-2 rounded-2xl border border-line bg-white p-4 text-sm">
        <select value={code} onChange={(e) => setCode(e.target.value)} className="rounded-xl border border-line px-3 py-2">
          <option value="">— Chọn đơn —</option>
          {eligible.map((o) => (
            <option key={o.code} value={o.code}>
              {o.code} · {o.createdAt}
            </option>
          ))}
        </select>
        {order && (
          <ul className="space-y-1">
            {order.items.map((i) => {
              const k = i.productId + (i.skuId || "");
              return (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={i.quantity}
                    value={qty[k] || 0}
                    onChange={(e) => setQty({ ...qty, [k]: Math.max(0, Math.min(i.quantity, Number(e.target.value))) })}
                    className="w-16 rounded-lg border border-line px-2 py-1"
                  />
                </li>
              );
            })}
          </ul>
        )}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do trả hàng" rows={2} className="rounded-xl border border-line px-3 py-2" />
        <button onClick={submit} className="rounded-full bg-primary px-4 py-2 text-white">
          Gửi yêu cầu
        </button>
        {msg && <p className="text-muted">{msg}</p>}
      </div>
      {mine.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {mine.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white px-4 py-2">
              {r.order.code} · {r.reason} · <b>{statusLabel[r.status] || r.status}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
