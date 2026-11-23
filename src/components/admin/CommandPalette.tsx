"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { CornerDownLeft, Search } from "lucide-react";
import { isEnabled } from "@/config/site";
import { adminNavGroups } from "@/lib/admin-nav";
import { canAccessAdminArea } from "@/lib/admin-permissions";

/**
 * Command palette ⌘K (cmdk) — điều hướng nhanh theo admin-nav.ts + tìm đơn/SP/khách
 * qua /api/admin/search. Không tranh primary action (UI-006), không chứa action phá hủy (UI-008).
 */

type Hit = { href: string; title: string; subtitle: string; kind: "order" | "product" | "customer" };

const KIND_LABEL: Record<Hit["kind"], string> = {
  order: "Đơn hàng",
  product: "Sản phẩm",
  customer: "Khách hàng",
};

export function CommandPalette({ role }: { role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);

  const enabled = isEnabled("commandPalette");

  const visibleGroups = useMemo(() => {
    if (!enabled) return [];
    return adminNavGroups
      .map((g) => ({
        title: g.title,
        items: g.items.filter(
          (item) => (!item.flag || isEnabled(item.flag)) && canAccessAdminArea(role, item.href),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [enabled, role]);

  const groupedHits = useMemo(() => {
    const map = new Map<Hit["kind"], Hit[]>();
    for (const h of hits) {
      const arr = map.get(h.kind) ?? [];
      arr.push(h);
      map.set(h.kind, arr);
    }
    return Array.from(map.entries());
  }, [hits]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      setHits([]);
      router.push(href);
    },
    [router],
  );

  // Global shortcut: ⌘K / Ctrl+K mở–đóng, Escape đóng khi mở.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  // Debounce search — ≥2 ký tự mới gọi API (BE-007 đã rate-limit phía server).
  useEffect(() => {
    if (!enabled || !open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { ok?: boolean; hits?: Hit[] };
        setHits(res.ok && data.ok ? (data.hits ?? []) : []);
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [enabled, open, q]);

  if (!enabled) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted shadow-sm transition hover:border-primary hover:text-primary print:hidden md:flex"
        aria-label="Mở tìm nhanh (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        Tìm nhanh
        <kbd className="rounded border border-line px-1.5 text-[10px] text-muted">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-[12vh] backdrop-blur-[2px] print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Command
        label="Tìm nhanh admin"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Tìm trang, đơn hàng, sản phẩm, khách hàng…"
            className="w-full py-3.5 text-sm outline-none placeholder:text-muted"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
          <Command.Empty className="px-3 py-6 text-center text-muted">
            {searching ? "Đang tìm…" : "Không có kết quả"}
          </Command.Empty>

          {visibleGroups.map((g) => (
            <Command.Group
              key={g.title}
              heading={g.title}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-muted"
            >
              {g.items.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${g.title}`}
                  onSelect={() => go(item.href)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-ink aria-selected:bg-canvas aria-selected:font-medium aria-selected:text-primary"
                >
                  <span>{item.label}</span>
                  <CornerDownLeft className="h-3.5 w-3.5 opacity-40" />
                </Command.Item>
              ))}
            </Command.Group>
          ))}

          {groupedHits.map(([kind, list]) => (
            <Command.Group
              key={kind}
              heading={KIND_LABEL[kind]}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-muted"
            >
              {list.map((h, i) => (
                <Command.Item
                  key={`${kind}:${i}:${h.href}`}
                  value={`${h.title} ${h.subtitle} ${q}`}
                  onSelect={() => go(h.href)}
                  className="flex cursor-pointer items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-ink aria-selected:bg-canvas aria-selected:font-medium aria-selected:text-primary"
                >
                  <span>{h.title}</span>
                  {h.subtitle && <span className="truncate text-xs text-muted">{h.subtitle}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
          ↑↓ di chuyển · Enter mở · Esc đóng
        </p>
      </Command>
    </div>
  );
}
