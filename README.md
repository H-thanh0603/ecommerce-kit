# Ekkit — khung website thương mại điện tử

Starter shop Next.js: clone, đổi thương hiệu, bật/tắt module, thêm chức năng theo khách.

```bash
npm run new:project -- ten-khach --brand "Tên Shop"   # tách dự án khách mới
```

Triển khai production: xem `DEPLOY.md` (Docker 1 lệnh, chuyển Postgres, checklist).

- Storefront: catalog, giỏ, checkout, tài khoản, journal, chatbot AI
- Admin: sản phẩm, đơn, cài đặt, AI Agent
- Dữ liệu: Prisma + PostgreSQL
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

Admin: đặt `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` **trước khi seed**. Production bắt buộc password mạnh (không nhận `admin123`).

```bash
npm test
npx prisma migrate deploy
```

Mã giảm giá: `WELCOME10`, `FREESHIP`, `GIAM50K`

## Multi-tenant (nhiều shop / 1 DB Postgres)

```bash
npm run migrate:all                                    # migrate mọi schema (public + platform + tenant)
npm run tenant:create shopa "Shop A" shopa.localhost   # shop mới: row + schema + migrate + seed
npm run platform:admin admin@platform.vn <mat-khau≥8>  # super-admin đăng nhập /platform
```

Local truy cập `http://shopa.localhost:3000` (Host → schema Postgres riêng). Runbook: `DEPLOY.md` §10.

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

## License

MIT — xem `LICENSE` + `NOTICE`. Fork, đổi tên, bán white-label cho khách đều được; giữ copyright notice khi redistribute. Brand/ảnh stock trong `public/` là placeholder — thay trước khi commercial launch.

## Bus model (gợi ý)

Repo MIT → tự host miễn phí. 3 mô hình kiếm tiền phổ biến cho agency/dev bán sản phẩm này:

1. **Setup + customization fee** — charge per-project (clone → đổi brand → bật flag theo hợp đồng).
2. **Managed hosting / per-tenant subscription** — dùng multi-tenant (`npm run tenant:create`), charge theo tháng cho từng shop (thu phí platform, không phải code license).
3. **Module add-on** — các flag `features.*` (booking, multiWarehouse, aiAgent...) bán riêng theo gói.

Codebase không kèm billing — tự tích hợp Stripe/polar.sh hoặc thu tay.
