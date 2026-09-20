"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "atelier.wishlist.v1";

type WishlistValue = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const remote = await fetch("/api/wishlist").then((r) => r.json());
        if (Array.isArray(remote.ids)) setIds(remote.ids);
        else {
          const raw = localStorage.getItem(KEY);
          if (raw) setIds(JSON.parse(raw) as string[]);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids]);

  const value = useMemo<WishlistValue>(
    () => ({
      ids,
      toggle: (id) => {
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        }).catch(() => {});
      },
      has: (id) => ids.includes(id),
    }),
    [ids],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist phải nằm trong WishlistProvider");
  return ctx;
}
