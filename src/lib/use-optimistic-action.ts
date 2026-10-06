"use client";

import { useState, useTransition, useOptimistic } from "react";

/**
 * Optimistic UI dùng chung (rule UI-010): chỉ cho toggle/cập nhật nhanh,rollback được —
 * KHÔNG dùng cho xóa/hoàn tiền. Giá trị hiển thị cập nhật ngay trong transition;
 * commit lỗi thì tự revert về giá trị gốc (useOptimistic reset khi transition kết thúc
 * mà base state không đổi), lỗi surfaced qua `error`.
 */
export function useOptimisticAction<T>(
  initial: T,
  commit: (next: T) => Promise<void>,
): { value: T; pending: boolean; error: string | null; run: (next: T) => void } {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(initial, (_base, next: T) => next);

  const run = (next: T) => {
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      try {
        await commit(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không cập nhật được");
      }
    });
  };

  return { value: optimistic, pending, error, run };
}
