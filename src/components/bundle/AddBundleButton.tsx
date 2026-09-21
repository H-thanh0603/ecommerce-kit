"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { BundleLine } from "@/server/bundle";
import type { Product } from "@/types";

export const BUNDLE_KEY = "ek.bundle.v1";

/** Thêm đủ dòng combo vào giỏ + nhớ bundleId để checkout trừ tiền. */
export function AddBundleButton({ bundleId, lines }: { bundleId: string; lines: BundleLine[] }) {
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addAll() {
    setBusy(true);
    try {
      const res = await fetch(`/api/products?ids=${lines.map((l) => l.productId).join(",")}`).then((r) => r.json());
      const byId = new Map<string, Product>(((res.products || []) as Product[]).map((p) => [p.id, p]));
      for (const l of lines) {
        const p = byId.get(l.productId);
        if (!p) throw new Error("SP trong combo không còn bán");
        add(p, l.quantity, l.variantLabel, l.skuId);
      }
      try {
        localStorage.setItem(BUNDLE_KEY, bundleId);
      } catch {
        /* bỏ qua */
      }
      router.push("/gio-hang");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={addAll}
      disabled={busy}
      className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-white disabled:opacity-60"
    >
      {busy ? "Đang thêm…" : "Thêm combo vào giỏ"}
    </button>
  );
}

export function readBundleId() {
  try {
    return localStorage.getItem(BUNDLE_KEY) || "";
  } catch {
    return "";
  }
}

export function clearBundleId() {
  try {
    localStorage.removeItem(BUNDLE_KEY);
  } catch {
    /* bỏ qua */
  }
}
