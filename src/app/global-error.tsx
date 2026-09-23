"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log bắt buộc — digest lỗi render root.
  console.error("[global-error]", error);
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FAF7F2", color: "#1C1917" }}>
        <div style={{ maxWidth: 480, margin: "96px auto", textAlign: "center", padding: "0 16px" }}>
          <h1 style={{ fontSize: 28, color: "#0F3D2E" }}>Đã có sự cố</h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "#78716C" }}>
            Không tải được trang. Thử lại hoặc quay về trang chủ.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ background: "#0F3D2E", color: "#fff", border: 0, borderRadius: 999, padding: "10px 24px", cursor: "pointer" }}
            >
              Thử lại
            </button>
            {/* global-error nằm ngoài router — full navigation an toàn hơn Link ở đây */}
            <button
              onClick={() => {
                window.location.assign("/");
              }}
              style={{ border: "1px solid #E7E0D6", borderRadius: 999, padding: "10px 24px", cursor: "pointer", color: "#1C1917", background: "transparent" }}
            >
              Trang chủ
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
