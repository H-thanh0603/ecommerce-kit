import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-widest text-muted">Mất kết nối</p>
      <h1 className="mt-2 font-serif text-3xl text-primary">Bạn đang offline</h1>
      <p className="mt-3 text-sm text-muted">
        Kiểm tra mạng rồi tải lại. Giỏ hàng và danh sách yêu thích vẫn giữ nguyên trên thiết bị.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm text-white"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
