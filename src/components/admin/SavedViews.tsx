"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isEnabled } from "@/config/site";

/**
 * Bộ lọc lưu sẵn (pattern Twenty CRM "saved view") — tự viết, không dependency.
 * View = tên + querystring của trang; bấm chip là điều hướng URL (rule UI-001/011),
 * không lọc client-side. Per-user phía server (/api/admin/views).
 */

type View = { id: string; name: string; path: string; query: string };

export function SavedViews({ path, params }: { path: string; params: Record<string, string | undefined> }) {
  const router = useRouter();
  const [views, setViews] = useState<View[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Query hiện tại = URL là nguồn chân lý; bỏ param `order` (state panel tạm thời,
  // không thuộc bộ lọc). So sánh chuỗi để tô sáng view đang bật.
  const currentQuery = useMemo(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "order") sp.set(k, v);
    }
    return sp.toString();
  }, [params]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/views?path=${encodeURIComponent(path)}`);
      const data = (await res.json()) as { ok?: boolean; views?: View[] };
      if (res.ok && data.ok) setViews(data.views ?? []);
    } catch {
      // Thanh view không được làm vỡ trang — im lặng giữ UI.
    }
  }, [path]);

  useEffect(() => {
    if (isEnabled("savedViews")) void load();
  }, [load]);

  if (!isEnabled("savedViews")) return null;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, name: trimmed, query: currentQuery }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        setName("");
        setNaming(false);
        await load();
      } else {
        setError(data.message || "Lưu thất bại");
      }
    } catch {
      setError("Lưu thất bại");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xóa bộ lọc này?")) return;
    await fetch(`/api/admin/views?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  const activeId = views.find((v) => v.query === currentQuery && (!currentQuery || v.query))?.id;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {views.map((v) => (
        <span
          key={v.id}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
            v.id === activeId ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary"
          }`}
        >
          <button
            type="button"
            onClick={() => router.push(v.query ? `${v.path}?${v.query}` : v.path)}
            className={v.id === activeId ? "" : "text-primary"}
          >
            {v.name}
          </button>
          <button
            type="button"
            aria-label={`Xóa bộ lọc ${v.name}`}
            onClick={() => remove(v.id)}
            className={`text-xs ${v.id === activeId ? "text-white/70 hover:text-white" : "text-muted hover:text-accent"}`}
          >
            ✕
          </button>
        </span>
      ))}
      {naming ? (
        <span className="inline-flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setNaming(false);
            }}
            autoFocus
            placeholder="Tên bộ lọc"
            aria-label="Tên bộ lọc"
            className="w-40 rounded-full border border-line bg-white px-3 py-1"
          />
          <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-full bg-primary px-3 py-1 text-white disabled:opacity-50">
            Lưu
          </button>
          <button type="button" onClick={() => setNaming(false)} className="text-muted hover:text-primary">
            Huỷ
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="rounded-full border border-dashed border-line px-3 py-1 text-muted hover:border-primary hover:text-primary"
        >
          + Lưu bộ lọc hiện tại
        </button>
      )}
      {error && <span className="text-xs text-accent">{error}</span>}
    </div>
  );
}
