"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "atelier.compare.v1";
const MAX = 4;

type Cmp = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

const Ctx = createContext<Cmp | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids]);
  const value = useMemo<Cmp>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      clear: () => setIds([]),
      toggle: (id) =>
        setIds((prev) => {
          if (prev.includes(id)) return prev.filter((x) => x !== id);
          if (prev.length >= MAX) return prev;
          return [...prev, id];
        }),
    }),
    [ids],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare");
  return ctx;
}
