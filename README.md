# Atelier — khung website thương mại điện tử

Starter shop Next.js: clone, đổi thương hiệu, bật/tắt module, thêm chức năng theo khách.

```bash
npm run new:project -- ten-khach --brand "Tên Shop"   # tách dự án khách mới
```

Triển khai production: xem `DEPLOY.md` (Docker 1 lệnh, chuyển Postgres, checklist).

- Storefront: catalog, giỏ, checkout, tài khoản, journal, chatbot AI
- Admin: sản phẩm, đơn, cài đặt, AI Agent
- Dữ liệu: Prisma + SQLite (đổi Postgres được)
- Thanh toán: COD + chuyển khoản; MoMo/VNPay cắm tại `src/server/payments.ts`

## Chạy local

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Mở http://localhost:3000

Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` (mặc định `admin@atelier.vn` / `admin123`)

```bash
npm test
npx prisma migrate deploy
```

Mã giảm giá: `WELCOME10`, `FREESHIP`, `GIAM50K`

Chatbot / AI Agent cần `XAI_API_KEY` (SpaceXAI / [console.x.ai](https://console.x.ai)). Không có key thì UI vẫn hiện, API hướng dẫn cấu hình.

## Tuỳ biến theo khách

Sửa `src/config/site.ts`:

1. `brand` — tên, slogan, SĐT, địa chỉ
2. `theme` — màu (bơm vào CSS variables)
3. `nav` — menu
4. `features` — wishlist, coupon, blog, chatbot, agent…
5. `payments` / `shipping`

Sản phẩm mẫu nằm ở `src/data/catalog.ts` (dùng khi seed). Sau seed, CRUD trên admin.

## Mở rộng

| Việc | Chỗ sửa |
|---|---|
| Cổng ví | `src/server/payments.ts` |
| Query / đơn | `src/server/commerce.ts` |
| Auth | `src/server/auth.ts` |
| AI | `src/server/ai.ts` |
| VNPay | `src/server/vnpay.ts` + `payments.vnpay.enabled` |
| GHN | `src/server/shipping.ts` + `features.ghn` |
| Hóa đơn / membership / so sánh / kg / lịch / kho / Excel | flag trong `site.features` |
| Module mới | flag trong `site.ts` + đăng ký `src/lib/modules.ts` |

Xem `HUONG-DAN.md`.
