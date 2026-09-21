"use client";

import { useEffect, useState } from "react";

const KEY = "ek.consent.v1";

/** Banner đồng ý cookie (NĐ 13/2023) — nhớ lựa chọn vào localStorage. */
export function ConsentBanner({ enabled, text }: { enabled?: boolean; text?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (enabled === false) return;
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, [enabled]);
  if (!show) return null;
  const decide = (v: string) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* bỏ qua */
    }
    setShow(false);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-muted">{text}</p>
        <div className="flex gap-2">
          <button onClick={() => decide("rejected")} className="rounded-full border border-line px-4 py-1.5 text-xs">
            Từ chối
          </button>
          <button onClick={() => decide("accepted")} className="rounded-full bg-primary px-4 py-1.5 text-xs text-white">
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
