"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Wh = { id: string; url: string; events: string; active: boolean };

export default function AdminWebhooks() {
  const [rows, setRows] = useState<Wh[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("order.created,order.status,order.paid");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/webhooks").then((x) => x.json());
    setRows(r.webhooks || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    const j = await res.json();
    setMsg(j.ok ? "Đã thêm" : j.message);
    if (j.ok) {
      setUrl("");
      load();
    }
  }

  async function ping() {
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ping" }),
    });
    const j = await res.json();
    setMsg(`Ping: ${JSON.stringify(j.results || [])}`);
  }

  async function remove(id: string) {
    await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Webhook đi</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        POST JSON + header <code>X-EK-Signature</code> (HMAC-SHA256 của <code>timestamp.body</code>).
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="flex-1 rounded-full border border-line px-4 py-2 text-sm" />
        <input value={events} onChange={(e) => setEvents(e.target.value)} placeholder="events" className="w-64 rounded-full border border-line px-4 py-2 text-sm" />
        <button onClick={add} className="rounded-full bg-primary px-4 py-2 text-sm text-white">
          Thêm
        </button>
        <button onClick={ping} className="rounded-full border border-line px-4 py-2 text-sm">
          Ping tất cả
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {rows.map((w) => (
          <li key={w.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <span>
              <b>{w.url}</b> · {w.events} · {w.active ? "bật" : "tắt"}
            </span>
            <button onClick={() => remove(w.id)} className="text-xs underline">
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
