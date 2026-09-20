import Link from "next/link";

export const metadata = { title: "Đặt hàng thành công" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Cảm ơn bạn</p>
      <h1 className="mt-3 font-serif text-4xl text-primary">Đơn hàng đã được ghi nhận</h1>
      <p className="mt-3 text-muted">
        Mã đơn <span className="font-medium text-ink">{code || "ATL-XXXXX"}</span>. Chúng tôi sẽ liên hệ để xác nhận.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/san-pham" className="rounded-full bg-primary px-5 py-2.5 text-sm text-white">
          Tiếp tục mua
        </Link>
        <Link href="/tai-khoan" className="rounded-full border border-line px-5 py-2.5 text-sm">
          Xem tài khoản
        </Link>
      </div>
    </div>
  );
}
