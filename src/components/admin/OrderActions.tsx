"use client";

import { useState } from "react";
const payLabel: Record<string, string> = {
  unpaid: "Chưa trả",
  pending: "Chờ cổng",
  paid: "Đã trả",
  failed: "Thất bại",
};

export function PayBadge({ status, method }: { status?: string; method: string }) {
  const s = status || "unpaid";
  const color =
    s === "paid" ? "bg-green-100 text-green-800" : s === "failed" ? "bg-red-100 text-red-800" : "bg-stone-100 text-stone-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
      {payLabel[s] || s} · {method}
    </span>
  );
}

export function GhnButton({ orderCode, hasLabel }: { orderCode: string; hasLabel?: string }) {  const [msg, setMsg] = useState(hasLabel || "");
  const [busy, setBusy] = useState(false);
  if (hasLabel) return <p className="mt-1 text-xs text-muted">GHN: {hasLabel}</p>;
  async function create() {
    const toDistrictId = window.prompt("ID quận/huyện GHN (to_district_id):", "");
    if (!toDistrictId) return;
    const toWardCode = window.prompt("Mã phường/xã GHN (to_ward_code):", "");
    if (!toWardCode) return;
    setBusy(true);
    try {
      const res = await fetch("/api/shipping/ghn/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode, toDistrictId: Number(toDistrictId), toWardCode }),
      });
      const data = await res.json();
      setMsg(data.orderCode ? `GHN: ${data.orderCode}` : `Lỗi: ${data.message || "?"}`);
      if (data.orderCode) window.location.reload();
    } catch {
      setMsg("Lỗi mạng");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <button onClick={create} disabled={busy} className="text-xs underline disabled:opacity-50">
        {busy ? "Đang tạo…" : msg.startsWith("Lỗi") ? "Thử lại GHN" : "Tạo vận đơn GHN"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}

type TimelineEvent = { id: string; kind: string; message: string; createdAt: string };

export function OrderTimeline({ orderCode }: { orderCode: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  async function toggle() {
    if (!open && events === null) {
      const r = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/events`).then((x) => x.json());
      setEvents(r.events || []);
    }
    setOpen((v) => !v);
  }
  return (
    <div className="mt-2">
      <button onClick={toggle} className="text-xs underline">
        {open ? "Ẩn nhật ký" : "Nhật ký đơn"}
      </button>
      {open && (
        <ul className="mt-1 space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
          {(events || []).map((e) => (
            <li key={e.id}>
              <b className="text-ink">[{e.kind}]</b> {e.message}
            </li>
          ))}
          {events?.length === 0 && <li>Chưa có sự kiện.</li>}
        </ul>
      )}
    </div>
  );
}
