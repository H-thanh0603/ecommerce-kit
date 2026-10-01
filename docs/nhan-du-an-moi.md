# Runbook: nhận dự án mới từ khung ecommerce-kit

> Tài liệu duy nhất cho việc "khung → dự án của khách". README và HUONG-DAN đều trỏ về đây.

## 1. Chọn con đường — fork hay SaaS?

| | **Fork repo cho khách** (`new:project`) | **SaaS một app nhiều shop** (`tenant:create`) |
|---|---|---|
| Khi nào | Khách cần code riêng, tự vận hành, tuỳ biến sâu | Nhiều shop nhỏ dùng chung 1 deployment, bạn vận hành |
| Dữ liệu | DB riêng của khách | Schema Postgres riêng trong 1 DB (schema-per-tenant) |
| Nâng cấp | Merge tay từ khung | Deploy 1 lần cho tất cả tenant |
| Sản phẩm | Repo mới độc lập | Row + schema trong platform hiện có |

## 2. Đường fork — `npm run new:project`

```bash
npm run new:project -- ten-khach \
  --brand "Tên Shop" \
  --tagline "Khẩu hiệu ngắn" \
  --description "Mô tả 1 câu cho SEO" \
  --hero "https://... (ảnh hero, tuỳ chọn)" \
  --prefix ABC \      # tiền tố mã đơn (mặc định lấy chữ đầu của slug, tối đa 4 ký tự)
  --dir ../ten-khach
```

Script tự làm: copy repo (trừ .git/node_modules/.next/.env/dev.db) → đổi `package.json` +
`package-lock.json` name → rebrand `src/config/site.ts` (brand, logoText, email, tagline,
mô tả, SEO title/template, tài khoản nhận CK bỏ dấu, `orders.codePrefix`, ảnh hero) →
sinh `.env` với `AUTH_SECRET` ngẫu nhiên → `git init`.

**Script KHÔNG tự làm — checklist việc còn tay:**

1. `npm install && npx prisma migrate deploy && npx tsx prisma/seed.ts`
2. Đổi `ADMIN_PASSWORD` trong `.env` **trước khi seed lần đầu** (prod không nhận admin123)
3. Sửa trong `src/config/site.ts` (giá trị demo cụ thể của shop): hotline, địa chỉ, giờ làm việc,
   link social (Facebook/Instagram/TikTok/YouTube/Zalo), số tài khoản + ngân hàng thật
4. Bật/tắt module theo hợp đồng: `siteConfig.features` (+ form `/admin/cai-dat` cho phần chạy-time)
5. Đổi logo/favicon thật trong `public/` (đang là bộ SVG mặc định)
6. Thay dữ liệu demo: sửa `src/data/catalog.ts` (sản phẩm/bài viết/danh mục demo) rồi seed lại,
   hoặc nhập thật qua `/admin/san-pham` + Excel
7. Kiểm tra `seo.defaultTitle` / `titleTemplate` đã đúng brand (script đã đổi — xác nhận lại)
8. Thanh toán online: bật `momo`/`vnpay`/`zalopay` + khóa API vào `.env` (xem `DEPLOY.md`)
9. Chạy `npm test`, `npm run build`, `E2E_URL=... npm run test:e2e` trước khi bàn giao

## 3. Đường SaaS — `npm run tenant:create`

```bash
npm run tenant:create <slug> <ten> <host1,host2>
npm run migrate:all          # phủ migration cho schema mới (script tenant:create đã migrate riêng)
npm run platform:admin <email> <password≥8>   # super-admin /platform (lần đầu)
```

Tenant mới có sẵn brand mặc định của khung trong schema riêng — vào `/admin/cai-dat`
của host đó để đổi brand/theme/ship ngay trên UI. Chi tiết kiến trúc: `docs/multi-tenant-spec.md`.

## 4. Những chỗ dễ sót khi đổi thương hiệu (đã config-hoá, kiểm tra lại cho chắc)

- Tiền tố mã đơn `orders.codePrefix` — **dùng chung cho mã đơn và dò nội dung CK SePay**,
  đổi 1 chỗ trong `src/config/site.ts`
- Marquee + con dấu trang chủ: tự theo `brand.hotline` / `brand.tagline` / `brand.name`
- SEO fallback: tự theo `siteConfig.brand` — nhưng hãy set mô tả thật trong `/admin/cai-dat`
  để Google index đúng ngành hàng
- Cart key localStorage (`atelier.cart.v1`) và vài fixture test vẫn mang tên cũ — vô hại,
  không cần đổi

## 5. Trước khi lên sản phẩm

- Đọc `DEPLOY.md` (domain, SSL, backup, cron, email SPF/DKIM)
- `scripts/backup.sh` phải chạy định kỳ thật
- Đổi hết khóa demo trong `.env`; bật Sentry nếu có DSN
- Chạy lại audit nhỏ: `npx tsc --noEmit && npm run lint && npm test && npm run build`
