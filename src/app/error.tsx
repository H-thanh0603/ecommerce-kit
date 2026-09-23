"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-widest text-muted">Lỗi</p>
      <h1 className="mt-2 font-serif text-3xl text-primary">Đã có sự cố</h1>
      <p className="mt-3 text-sm text-muted">
        Hệ thống gặp lỗi khi tải trang. Thử lại — nếu vẫn lỗi, liên hệ hỗ trợ.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-primary px-6 py-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Thử lại
      </button>
    </div>
  );
}
