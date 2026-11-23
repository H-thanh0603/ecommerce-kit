"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Clock, Search, Tag, X } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { money } from "@/lib/format";
import type { Category } from "@/types";

type SugItem = { name: string; slug: string; image: string; price: number };
const RECENT_KEY = "ekkit.search.recent.v1";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  const clean = term.trim();
  if (!clean) return;
  try {
    const next = [clean, ...loadRecent().filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function SearchDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<SugItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecent(loadRecent());
  }, [open]);

  // Phím tắt `/` mở tìm kiếm nhanh (không cướp phím khi đang gõ trong input/textarea)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
        return;
      }
      if (e.key !== "/" || open) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      onOpenChange(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setSugs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setSugs(data.items || []);
        }
      } catch {
        if (!ctrl.signal.aborted) setSugs([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [open, q]);

  const goSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (clean) saveRecent(clean);
      onOpenChange(false);
      setQ("");
      router.push(clean ? `/san-pham?q=${encodeURIComponent(clean)}` : "/san-pham");
    },
    [onOpenChange, router],
  );

  const goHref = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQ("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <Command
        shouldFilter={false}
        label="Tìm kiếm sản phẩm"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim() && sugs.length === 0) {
                e.preventDefault();
                goSearch(q);
              }
            }}
            placeholder="Tìm sản phẩm, chất liệu, danh mục…"
            className="w-full py-4 text-sm outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Đóng tìm kiếm"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Command.List className="max-h-96 overflow-y-auto p-3 text-sm">
          {q.trim().length >= 2 && (
            <Command.Group
              heading={loading ? "Đang tìm…" : "Sản phẩm gợi ý"}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted"
            >
              {sugs.map((s) => (
                <Command.Item
                  key={s.slug}
                  value={s.name}
                  onSelect={() => goHref(`/san-pham/${s.slug}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 aria-selected:bg-canvas"
                >
                  <SmartImage src={s.image} alt="" className="h-12 w-12 shrink-0 rounded-xl" sizes="48px" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-primary tabular">{money(s.price)}</p>
                  </div>
                </Command.Item>
              ))}
              <Command.Item
                value={`search-all-${q}`}
                onSelect={() => goSearch(q)}
                className="mt-1 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line px-3 py-2 text-xs font-medium text-primary aria-selected:bg-canvas"
              >
                Xem tất cả kết quả cho “{q.trim()}”
              </Command.Item>
            </Command.Group>
          )}

          {q.trim().length < 2 && recent.length > 0 && (
            <Command.Group
              heading="Tìm gần đây"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted"
            >
              {recent.map((term) => (
                <Command.Item
                  key={term}
                  value={term}
                  onSelect={() => goSearch(term)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-ink aria-selected:bg-canvas"
                >
                  <Clock className="h-3.5 w-3.5 text-muted" />
                  <span>{term}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {q.trim().length < 2 && categories.length > 0 && (
            <Command.Group
              heading="Danh mục nổi bật"
              className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted"
            >
              <div className="flex flex-wrap gap-1.5 px-1.5 pt-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goHref(`/san-pham?cat=${c.slug}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs text-ink transition hover:border-primary hover:text-primary"
                  >
                    <Tag className="h-3 w-3 text-accent" />
                    {c.name}
                  </button>
                ))}
              </div>
            </Command.Group>
          )}
        </Command.List>

        <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-4 py-2 text-[11px] text-muted">
          <span>↑↓ chọn · Enter mở · Esc đóng</span>
          <span>Nhấn / để mở nhanh</span>
        </div>
      </Command>
    </div>
  );
}
