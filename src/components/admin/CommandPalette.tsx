"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isEnabled } from "@/config/site";
import { adminNavGroups } from "@/lib/admin-nav";

/**
 * Command palette ⌘K (pattern Twenty CRM) — tự viết, không dependency.
 * Điều hướng nhanh theo admin-nav.ts + tìm đơn/SP/khách qua /api/admin/search.
 * Component phụ (không tranh primary action — rule UI-006), không chứa action
 * phá hủy (rule UI-008). Flag kiểm tra phía client (isEnabled là build-time).
 */

type Hit = { href: string; title: string; subtitle: string; kind: "order" | "product" | "customer" };

type Row = { key: string; href: string; title: string; subtitle: string; group: string };

const KIND_LABEL: Record<Hit["kind"], string> = {
  order: "Đơn hàng",
  product: "Sản phẩm",
  customer: "Khách hàng",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (!isEnabled("commandPalette")) return null;

  // Điều hướng: lọc theo flag, giữ thứ tự nhóm; khi có q thì lọc tiếp theo label.
  const navRows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase();
    const rows: Row[] = [];
    for (const g of adminNavGroups) {
      for (const item of g.items) {
        if (item.flag && !isEnabled(item.flag)) continue;
        if (query && !item.label.toLowerCase().includes(query)) continue;
        rows.push({ key: `nav:${item.href}`, href: item.href, title: item.label, subtitle: "", group: g.title });
      }
    }
    return rows;
  }, [q]);

  const hitRows = useMemo<Row[]>(
    () =>
      hits.map((h, i) => ({
        key: `hit:${i}:${h.href}`,
        href: h.href,
        title: h.title,
        subtitle: h.subtitle,
        group: KIND_LABEL[h.kind],
      })),
    [hits],
  );

  const rows = useMemo(() => [...navRows, ...hitRows], [navRows, hitRows]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

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
  }, []);

  // Focus input khi mở; đóng thì trả focus.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Debounce search — ≥2 ký tự mới gọi API (BE-007 đã rate-limit phía server).
  useEffect(() => {
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
  }, [q]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted shadow-sm hover:text-primary print:hidden md:flex"
        aria-label="Mở tìm nhanh (Ctrl+K)"
      >
        <span aria-hidden>⌕</span> Tìm nhanh
        <kbd className="rounded border border-line px-1.5 text-[10px] text-muted">⌘K</kbd>
      </button>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      go(rows[active].href);
    }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh] print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tìm nhanh admin"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tìm trang, đơn hàng, sản phẩm, khách hàng…"
          className="w-full border-b border-line px-4 py-3 text-sm outline-none placeholder:text-muted"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={rows[active] ? `cmdk-opt-${active}` : undefined}
        />
        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto p-2 text-sm">
          {rows.length === 0 && (
            <p className="px-3 py-6 text-center text-muted">
              {searching ? "Đang tìm…" : q.trim().length >= 2 ? "Không có kết quả" : "Gõ để tìm kiếm"}
            </p>
          )}
          {rows.map((r, i) => {
            const showGroup = r.group !== lastGroup;
            lastGroup = r.group;
            const on = i === active;
            return (
              <div key={r.key}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-muted">{r.group}</p>
                )}
                <button
                  type="button"
                  id={`cmdk-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left ${on ? "bg-canvas" : ""}`}
                >
                  <span className={on ? "font-medium text-primary" : ""}>{r.title}</span>
                  {r.subtitle && <span className="truncate text-xs text-muted">{r.subtitle}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
          ↑↓ di chuyển · Enter mở · Esc đóng
        </p>
      </div>
    </div>
  );
}
