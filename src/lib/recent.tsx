"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";

const KEY = "ek.recent.v1";
const MAX = 8;

export function pushRecent(p: Product) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as Product[];
    const next = [p, ...raw.filter((x) => x.id !== p.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
}

export function readRecents(): Product[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Product[];
  } catch {
    return [];
  }
}

/** Gắn vào trang chi tiết SP để ghi nhận lượt xem. */
export function RecentTracker({ product }: { product: Product }) {
  useEffect(() => {
    pushRecent(product);
  }, [product]);
  return null;
}

export function useRecents() {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    setItems(readRecents());
  }, []);
  return items;
}
