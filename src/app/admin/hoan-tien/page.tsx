"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";

type Refund = {
  id: string;
  amount: number;
  method: string;
  status: string;
  note: string;
  order: { code: string; customer: string };
};

export default function AdminRefunds() {
  const [rows, setRows] = useState<Refund[]>([]);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/refunds").then((x) => x.json());
    setRows(r.refunds || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const res = await fetch("/api/admin/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode: code, amount: Number(amount), method }),
    });
    const j = await res.json();
    setMsg(j.message || (j.ok ? "Đã tạo phiếu hoàn" : "Thất bại"));
    if (j.ok) {
      setCode("");
      setAmount("");
      load();
    }
  }

  async function act(id: string, action: "complete" | "fail") {
    await fetch("/api/admin/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Hoàn tiền</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Chuyển khoản / tiền mặt ghi sổ. Chọn VNPay hoặc MoMo để gọi API hoàn thật
        (cần đơn đã thanh toán qua cổng đó, <code>paymentRef</code> = mã giao dịch gốc).
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Mã đơn (ATL-…)" className="rounded-full border border-line px-4 py-2 text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={0} placeholder="Số tiền" className="w-36 rounded-full border border-line px-4 py-2 text-sm" />
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-full border border-line px-3 py-2 text-sm">
          <option value="bank">Chuyển khoản</option>
          <option value="vnpay">VNPay API</option>
          <option value="momo">MoMo API</option>
          <option value="cash">Tiền mặt</option>
        </select>
        <button onClick={create} className="rounded-full bg-primary px-4 py-2 text-sm text-white">
          Tạo phiếu
        </button>
      </div>
      {msg && (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-primary">
          {msg}
        </p>
      )}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{r.order.code}</b> · {money(r.amount)} · {r.method} · {r.status}
            </span>
            {r.status === "pending" && (
              <span className="flex gap-2 text-xs">
                <button onClick={() => act(r.id, "complete")} className="text-primary underline">
                  Đã hoàn
                </button>
                <button onClick={() => act(r.id, "fail")} className="text-accent underline">
                  Hủy
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
