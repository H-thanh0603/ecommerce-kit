import { siteConfig } from "@/config/site";
import { money } from "@/lib/format";

export const metadata = { title: "Chính sách" };

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl text-primary">Chính sách cửa hàng</h1>
      <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
        <h2 className="font-medium text-ink">Vận chuyển</h2>
        <p>
          Giao hàng toàn quốc trong {siteConfig.shipping.estimatedDays}. Phí mặc định{" "}
          {money(siteConfig.shipping.defaultFee)}. Miễn phí từ {money(siteConfig.shipping.freeFrom)}.
        </p>
        <h2 className="pt-4 font-medium text-ink">Đổi trả</h2>
        <p>
          Đổi trả trong 7 ngày nếu sản phẩm còn tem mác, chưa qua sử dụng. Không áp dụng với hàng sale cuối cùng
          hoặc hàng đặt riêng — có thể bật rule này trong module khi làm cho khách.
        </p>
        <h2 className="pt-4 font-medium text-ink">Bảo mật</h2>
        <p>
          Thông tin khách chỉ dùng để xử lý đơn. Khi triển khai production, gắn privacy policy pháp lý và cookie
          consent theo yêu cầu khách hàng.
        </p>
      </section>
    </div>
  );
}
