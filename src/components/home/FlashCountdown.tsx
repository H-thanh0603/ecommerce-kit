"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Đếm ngược tới endsAt (ISO). Hết giờ vẫn hiển thị 00:00:00. */
export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const total = left ?? 0;
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white tabular backdrop-blur-sm"
      aria-live="off"
    >
      <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      {left === null ? (
        <span className="opacity-70">--:--:--</span>
      ) : (
        <span suppressHydrationWarning>
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
      )}
    </span>
  );
}
