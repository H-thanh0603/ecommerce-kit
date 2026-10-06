"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/types";
import { btnPrimary } from "@/components/admin/buttons";

const labels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

const labelOf = (status: OrderStatus) => labels[status] ?? status;

export function OrderStatusForm({ id, status }: { id: string, status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Chỉ hiện trạng thái hiện tại + các transition hợp lệ theo state machine
  // (backend `ORDER_TRANSITIONS` cũng chặn — UI chỉ là bản sao thuận mắt).
  const options: OrderStatus[] = [value, ...ORDER_TRANSITIONS[value]];

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
            <option key={o} value={o}>
              {labelOf(o)}
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
