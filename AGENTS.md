# AGENTS.md — làm việc với khung ecommerce-kit

> Quy ước cho agent (người + AI) khi sửa repo này. Đọc file này trước khi code.

## Lệnh

```bash
npm run dev                 # chạy local (Postgres ek)
npm test                    # vitest (DB thật Postgres (ek), test phải idempotent)
npx tsc --noEmit            # kiểm tra kiểu
npm run build               # build production (E2E chạy trên build này, KHÔNG chạy trên dev)
E2E_URL=http://localhost:3100 npm run test:e2e
npx prisma migrate dev --name <ten>   # đổi schema
```

## Kiến trúc

- `src/config/site.ts` — default cấu hình (brand/theme/flags). DB `SiteSetting` ghi đè lúc chạy.
  Quy ước hiệu lực: **tiền + tồn + ship + mail đọc DB ngay** (`isFeatureOn`, `getEffectiveSiteConfig`);
  **ẩn/hiện giao diện đọc file lúc build** (`isEnabled`, `isModuleOn`).
- Lõi chia 4 module, KHÔNG thêm logic chéo:
  - `src/server/catalog.ts` — danh mục/SP/bài viết/review (đọc + CRUD)
  - `src/server/coupon.ts` — mã giảm giá
  - `src/server/cart.ts` — giỏ/wishlist (đồng bộ user)
  - `src/server/order.ts` — đơn/checkout (transaction trừ tồn SKU + kho, coupon, ship, điểm)
  - `src/server/commerce.ts` — facade re-export, không viết logic mới ở đây
- Module phụ mỗi cái 1 file `src/server/<ten>.ts`: `payments`, `vnpay`, `momo`, `shipping` (GHN),
  `membership`, `warehouse`, `invoice`, `booking`, `excel`, `mail`, `settings`, `storage`, `auth`.
- Thanh toán mới = thêm `PaymentProvider` vào `src/server/payments.ts` (xem `momo.ts` làm mẫu:
  `buildXxxPayUrl` + `verifyXxx` + `handleXxxIpn` pure + route `ipn`/`return` + test).
- Type dùng chung client-an-toàn đặt ở `src/config/site.ts` (`EffectiveSite`) và `src/types/`.
  KHÔNG import module chứa Prisma vào component client (build sẽ vỡ).

## Quy tắc test

- Test DB phải tự dọn (email/code duy nhất theo timestamp, xóa sau test) và nạp lại tồn
  (`restock()` trong `commerce-order.test.ts`) vì DB Postgres (ek) dùng chung.
  Vitest chạy các file song song → mỗi file test checkout dùng 1 SP riêng
  (p1: commerce-order, p2: giftcard) để không giành tồn nhau.
- Logic tiền/tồn/webhook bắt buộc có test: coupon, guard hết hàng, IPN (dùng store giả),
  VAT, gift card, returns.
- E2E (`e2e/`) chạy trên production build + Chrome hệ thống (`channel: "chrome"`),
  chặn ảnh remote, `workers: 1`.
- KHÔNG ghi ngày giờ bằng raw SQL (định dạng thời gian mỗi DB khác nhau) —
  Prisma tự serialize đúng. Cần backdate trong test thì set tay qua Prisma update
  (`prisma.xxx.update({ data: { updatedAt: old } })` — xem `abandoned.test.ts`).

## Khi thêm module theo khách

1. Thêm flag vào `site.features` + đăng ký `src/lib/modules.ts`.
2. Tạo `src/server/<ten>.ts` riêng, không đụng 4 file lõi.
3. Cài đặt runtime (nếu có) vào `SiteSetting` qua `src/server/settings.ts` + form `/admin/cai-dat`.
4. Viết test cho mọi nhánh tiền/tồn.
