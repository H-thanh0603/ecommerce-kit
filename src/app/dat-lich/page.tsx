"use client";

import { useEffect, useState } from "react";
import { useFeatures } from "@/lib/features";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";

type Svc = { id: string; name: string; durationMin: number; price: number };

export default function BookingPage() {
  const { user } = useAuth();
  const features = useFeatures();
  const [services, setServices] = useState<Svc[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/bookings").then((r) => r.json()).then((d) => setServices(d.services || []));
  }, []);
  if (features.ready && !features.on("booking")) return <p className="px-4 py-20 text-center">Module đặt lịch đang tắt.</p>;
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: f.get("serviceId"),
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        startsAt: f.get("startsAt"),
        note: f.get("note"),
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Đã đặt lịch" : data.message || "Lỗi");
  };
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-serif text-4xl text-primary">Đặt lịch</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <select required name="serviceId" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm">
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.durationMin}p · {money(s.price)}</option>
          ))}
        </select>
        <input required name="name" defaultValue={user?.name} placeholder="Họ tên" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input required type="email" name="email" defaultValue={user?.email} placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input required name="phone" placeholder="SĐT" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input required type="datetime-local" name="startsAt" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <textarea name="note" placeholder="Ghi chú" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <button className="w-full rounded-full bg-primary py-3 text-sm text-white">Đặt lịch</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
    </div>
  );
}
