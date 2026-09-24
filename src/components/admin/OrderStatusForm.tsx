"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/types";
import { btnPrimary } from "@/components/admin/buttons";

const options: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã huỷ" },
];

const labelOf = (status: OrderStatus) => options.find((o) => o.value === status)?.label ?? status;

export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const advance =
    value === "pending" || value === "confirmed"
      ? { next: "shipping" as const, label: "Chuyển sang đang giao" }
      : value === "shipping"
        ? { next: "completed" as const, label: "Đánh dấu hoàn tất" }
        : null;

  async function save(next: OrderStatus) {
    if (next === value || busy) return;
    if (next === "cancelled" && !window.confirm("Huỷ đơn này? Khách sẽ thấy trạng thái đã huỷ.")) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setValue(prev);
      setMsg(data.message || "Không cập nhật được trạng thái");
    } else {
      setMsg(`Đã cập nhật: ${labelOf(next)}`);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {advance && (
        <button
          type="button"
          disabled={busy}
          onClick={() => save(advance.next)}
          className={btnPrimary}
        >
          {advance.label}
        </button>
      )}
      <label className="text-xs text-muted">
        Trạng thái
        <select
          aria-label="Trạng thái đơn"
          value={value}
          disabled={busy}
          className="ml-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink"
          onChange={(e) => save(e.target.value as OrderStatus)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {msg && (
        <p role="status" className="text-xs text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
