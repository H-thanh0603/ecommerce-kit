"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string;
  startsAt: string;
  status: string;
  service: { name: string };
};

export default function AdminBooking() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = () => fetch("/api/bookings").then((r) => r.json()).then((d) => setRows(d.bookings || []));
  useEffect(() => { load(); }, []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Đặt lịch</h1><Link href="/admin" className="text-sm text-muted">← Tổng quan</Link></div>
      <ul className="mt-6 space-y-2">
        {rows.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-4 text-sm">
            <span>{b.service.name} · {b.name} · {new Date(b.startsAt).toLocaleString("vi-VN")} · {b.status}</span>
            <label className="text-sm text-muted">
              Trạng thái
            <select
              aria-label="Trạng thái lịch"
              defaultValue={b.status}
              className="ml-2 rounded-full border border-line bg-white px-3 py-1.5 text-ink"
              onChange={async (e) => {
                await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, status: e.target.value }) });
                load();
              }}
            >
              <option value="pending">Chờ</option>
              <option value="confirmed">Xác nhận</option>
              <option value="cancelled">Hủy</option>
            </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
