"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ret = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  order: { code: string; customer: string; email: string };
};

export default function AdminReturns() {
  const [rows, setRows] = useState<Ret[]>([]);
  const [filter, setFilter] = useState("pending");
  const [refund, setRefund] = useState<Record<string, string>>({});

  async function load(s = filter) {
    const r = await fetch(`/api/returns?status=${s}`).then((x) => x.json());
    setRows(r.returns || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function act(id: string, approve: boolean) {
    await fetch("/api/returns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approve, refundAmount: Number(refund[id] || 0) }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Đổi / trả hàng</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <div className="mt-4 flex gap-2 text-sm">
        {["pending", "completed", "rejected", ""].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 ${filter === s ? "border-primary text-primary" : "border-line text-muted"}`}
          >
            {s === "" ? "Tất cả" : s === "pending" ? "Chờ duyệt" : s === "completed" ? "Đã hoàn tồn" : "Từ chối"}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-medium">
              {r.order.code} · {r.order.customer} · {r.order.email}
            </p>
            <p className="mt-1 text-muted">Lý do: {r.reason}</p>
            {r.status === "pending" && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => act(r.id, true)} className="text-primary underline">
                  Duyệt + hoàn tồn
                </button>
                <label className="flex items-center gap-1 text-xs text-muted">
                  Hoàn tiền
                  <input
                    type="number"
                    min={0}
                    value={refund[r.id] || ""}
                    onChange={(e) => setRefund({ ...refund, [r.id]: e.target.value })}
                    placeholder="0"
                    className="w-24 rounded-lg border border-line px-2 py-1"
                  />
                </label>
                <button onClick={() => act(r.id, false)} className="text-accent underline">
                  Từ chối
                </button>
              </div>
            )}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">Không có yêu cầu.</p>}
      </div>
    </div>
  );
}
