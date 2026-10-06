"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/types";
import { btnPrimary } from "@/components/admin/buttons";
import { useOptimisticAction } from "@/lib/use-optimistic-action";

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
  const [msg, setMsg] = useState("");

  const { value, pending, error, run } = useOptimisticAction(status, async (next) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Không cập nhật được trạng thái");
    setMsg(`Đã cập nhật: ${labelOf(next)}`);
    router.refresh();
  });

  // `value` = trạng thái optimistic (hook) — options/advance tính theo value để
  // UI chuyển mượt ngay khi bấm; commit lỗi thì hook tự revert về `status`.
  const options: OrderStatus[] = [value, ...ORDER_TRANSITIONS[value]];

  const advance =
    value === "pending" || value === "confirmed"
      ? { next: "shipping" as const, label: "Chuyển sang đang giao" }
      : value === "shipping"
        ? { next: "completed" as const, label: "Đánh dấu hoàn tất" }
        : null;

  function save(next: OrderStatus) {
    if (next === value || pending) return;
    if (next === "cancelled" && !window.confirm("Huỷ đơn này? Khách sẽ thấy trạng thái đã huỷ.")) return;
    setMsg("");
    run(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {advance && (
        <button
          type="button"
          disabled={pending}
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
          disabled={pending}
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
      {(error || msg) && (
        <p role="status" className={`text-xs ${error ? "text-accent" : "text-muted"}`}>
          {error || msg}
        </p>
      )}
    </div>
  );
}
