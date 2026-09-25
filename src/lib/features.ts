"use client";

import { useEffect, useState } from "react";
import { isEnabled, siteConfig, type FeatureKey } from "@/config/site";

/**
 * Feature flag runtime — đọc `/api/shop` (DB-backed). Fallback về file
 * `siteConfig.features` khi chưa load hoặc API lỗi.
 *
 * Dùng cho component client cần tôn trọng tenant toggle. Build-time flag
 * `isEnabled` vẫn quyết định code có ship không — cả hai AND: tắt file = ẩn,
 * tắt DB = ẩn.
 */
export function useFeatures(): { on: (k: FeatureKey) => boolean; ready: boolean } {
  const [db, setDb] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/shop")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.features && typeof j.features === "object") {
          setDb(j.features as Record<string, boolean>);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return {
    ready: db !== null,
    on: (k) => isEnabled(k) && (db ? Boolean(db[k]) : Boolean(siteConfig.features[k])),
  };
}
