import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { siteConfig } from "@/config/site";
import { money } from "@/lib/format";

export const metadata = {
  title: "Chính sách",
  description: "Vận chuyển, đổi trả, bảo mật và điều khoản sử dụng cửa hàng.",
};

export default async function PolicyPage() {
  enterTenant(await resolveRequestTenant());
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl text-primary">Chính sách cửa hàng</h1>
      <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
        <h2 id="van-chuyen" className="font-medium text-ink">Vận chuyển</h2>
        <p>
          Giao hàng toàn quốc trong {siteConfig.shipping.estimatedDays}. Phí mặc định{" "}
          {money(siteConfig.shipping.defaultFee)}. Miễn phí từ {money(siteConfig.shipping.freeFrom)}.
        </p>
        <h2 id="doi-tra" className="pt-4 font-medium text-ink">Đổi trả</h2>
        <p>
          Đổi trả trong 7 ngày nếu sản phẩm còn tem mác, chưa qua sử dụng. Không áp dụng với hàng sale cuối cùng
          hoặc hàng đặt riêng — có thể bật rule này trong module khi làm cho khách.
        </p>
        <h2 id="privacy" className="pt-4 font-medium text-ink">Quyền riêng tư</h2>
        <p>
          Thu thập: tên, email, số điện thoại, địa chỉ giao, lịch sử đơn. Mục đích: xử lý đơn, giao hàng, hỗ trợ
          khách, kế toán. Không bán dữ liệu cho bên thứ ba. Bạn có quyền xuất bản sao (JSON) và yêu cầu ẩn danh
          hóa tài khoản ngay tại <a className="underline text-primary" href="/tai-khoan">trang cá nhân</a>.
        </p>
        <p>
          Nhà xử lý dữ liệu (subprocessor) khi bật tính năng liên quan: hạ tầng Vercel/AWS (hosting), GHN (giao
          hàng — tên/địa chỉ/điện thoại), cổng thanh toán VNPay/MoMo/SePay (số tiền, mã đơn), SMTP (gửi thư),
          xAI/GPT (chỉ nội dung bạn chủ động gửi vào chat hỗ trợ). Cookie: phiên đăng nhập HttpOnly; cookie
          marketing chỉ bật khi bạn đồng ý banner.
        </p>
        <p>
          Giữ dữ liệu tối đa 24 tháng sau đơn cuối (hoặc theo nghĩa vụ kế toán hiện hành); token đặt lại mật
          khẩu hết hạn trong 30 phút; mail chứa token bị che sau 24h.
        </p>
        <h2 id="dieu-khoan" className="pt-4 font-medium text-ink">Điều khoản sử dụng</h2>
        <p>
          Dùng trang đồng ý không mua bán hàng cấm, không can thiệp hệ thống. Giá hiển thị đã gồm VAT nếu có;
          đơn chỉ xác nhận khi cửa hàng xác nhận (hoặc IPN thanh toán thành công). Tranh chấp liên hệ{" "}
          {siteConfig.brand.email} trước khi khởi kiện; áp dụng luật pháp Việt Nam.
        </p>
        <p className="text-xs">
          Đây là bản mẫu kỹ thuật cho kit — thay bằng văn bản pháp lý của chủ shop trước khi launch thương mại.
        </p>
      </section>
    </div>
  );
}
