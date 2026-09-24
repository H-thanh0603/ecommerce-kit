import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";

export const metadata = { title: "Đặt hàng thành công" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  enterTenant(await resolveRequestTenant());
  const { code } = await searchParams;
  if (!code) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Cảm ơn bạn</p>
        <h1 className="mt-3 font-serif text-4xl text-primary">Chưa thấy mã đơn</h1>
        <p className="mt-3 text-muted">
          Đơn của bạn chưa được ghi nhận (có thể bạn tải lại trang hoặc vào nhầm link). Kiểm tra lại trong{" "}
          <Link href="/tai-khoan" className="underline text-primary">tài khoản</Link> hoặc đặt lại đơn mới.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/san-pham" className="rounded-full bg-primary px-5 py-2.5 text-sm text-white">
            Tiếp tục mua
          </Link>
          <Link href="/tai-khoan" className="rounded-full border border-line px-5 py-2.5 text-sm">
            Xem đơn của tôi
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Cảm ơn bạn</p>
      <h1 className="mt-3 font-serif text-4xl text-primary">Đơn hàng đã được ghi nhận</h1>
      <p className="mt-3 text-muted">
        Mã đơn <span className="font-medium text-ink">{code}</span>. Chúng tôi sẽ liên hệ để xác nhận.
      </p>
      <p className="mt-2 text-sm text-muted">
        Chuyển khoản thì ghi nội dung đúng mã đơn để đối soát nhanh. Theo dõi trạng thái tại{" "}
        <Link href="/tai-khoan" className="underline text-primary">đơn của tôi</Link>.
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
