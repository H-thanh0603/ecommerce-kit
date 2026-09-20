import { siteConfig } from "@/config/site";

export const metadata = { title: "Liên hệ" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Liên hệ</p>
        <h1 className="mt-2 font-serif text-4xl text-primary">Nói chuyện với cửa hàng</h1>
        <p className="mt-3 text-muted">
          Điền form hoặc nhắn Zalo / gọi hotline. Đội ngũ phản hồi trong giờ làm việc.
        </p>
        <ul className="mt-8 space-y-2 text-sm">
          <li>{siteConfig.brand.address}</li>
          <li>{siteConfig.brand.workingHours}</li>
          <li>{siteConfig.brand.phone} · {siteConfig.brand.hotline}</li>
          <li>{siteConfig.brand.email}</li>
        </ul>
      </div>
      <form className="space-y-3 rounded-2xl border border-line bg-white p-6">
        <input required placeholder="Họ tên" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input required type="email" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input placeholder="Số điện thoại" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <textarea required rows={5} placeholder="Nội dung" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <button className="rounded-full bg-primary px-5 py-2.5 text-sm text-white">Gửi tin nhắn</button>
      </form>
    </div>
  );
}
