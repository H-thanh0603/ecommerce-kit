"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";

type Gift = { id: string; code: string; balance: number; active: boolean; note: string; expiresAt: string | null };

export default function AdminGifts() {
  const [rows, setRows] = useState<Gift[]>([]);
  const [code, setCode] = useState("");
  const [balance, setBalance] = useState("500000");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/gifts").then((x) => x.json());
    setRows(r.gifts || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const res = await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, balance: Number(balance) }),
    });
    const j = await res.json();
    setMsg(j.ok ? `Đã tạo ${j.gift.code}` : j.message);
    if (j.ok) {
      setCode("");
      load();
    }
  }

  async function toggle(g: Gift) {
    await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, code: g.code, balance: g.balance, active: !g.active, note: g.note }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Thẻ quà tặng</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Mã thẻ (VD: QUATET5TRAM)" className="rounded-full border border-line px-4 py-2 text-sm" />
        <input value={balance} onChange={(e) => setBalance(e.target.value)} type="number" min={0} placeholder="Số dư" className="w-36 rounded-full border border-line px-4 py-2 text-sm" />
        <button onClick={create} className="rounded-full bg-primary px-4 py-2 text-sm text-white">
          Phát hành
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((g) => (
          <li key={g.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{g.code}</b> · {money(g.balance)} · {g.active ? "đang dùng" : "đã tắt"}
            </span>
            <button onClick={() => toggle(g)} className="text-xs underline">
              {g.active ? "Tắt" : "Bật"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
