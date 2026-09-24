"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnPrimary } from "@/components/admin/buttons";

const Ctx = createContext<{
  ids: string[];
  toggle: (id: string) => void;
} | null>(null);

export function OrderSelection({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  async function ship() {
    if (!ids.length || busy) return;
    if (!confirm(`Chuyển ${ids.length} đơn sang đang giao?`)) return;
    setBusy(true);
    setMsg("");
    let ok = 0;
    for (const id of ids) {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shipping" }),
      });
      if (res.ok) ok += 1;
    }
    setMsg(`Đã chuyển ${ok}/${ids.length} đơn sang đang giao`);
    setIds([]);
    setBusy(false);
    router.refresh();
  }

  return (
    <Ctx.Provider value={{ ids, toggle }}>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} disabled={!ids.length || busy} onClick={ship}>
          Giao {ids.length || ""} đơn đã chọn
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={!ids.length}
          onClick={() => window.open(`/admin/don-hang/in?ids=${ids.join(",")}`, "_blank")}
        >
          In đã chọn
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
      {children}
    </Ctx.Provider>
  );
}

export function OrderCheck({ id }: { id: string }) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return (
    <label className="mr-2 inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={ctx.ids.includes(id)} onChange={() => ctx.toggle(id)} aria-label="Chọn đơn" />
    </label>
  );
}
