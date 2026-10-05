# Plan: Fix & cải thiện theo Audit MVP Free-tier

Phạm vi: P0 + P1 + UX polish + test bổ sung. Kết thúc mỗi giai đoạn: `npx tsc --noEmit` + `npm test` xanh; commit theo từng giai đoạn (style repo: `fix(...)`/`feat(...)`/`test(...)` tiếng Việt như các commit gần đây).

---

## Giai đoạn 1 — P0 blockers

### 1.1 Upgrade Next.js 16.3.5 → 16.3.8 (critical RCE next/og)
- `package.json`: bump pin `"next": "16.3.8"` (và `eslint-config-next` nếu cần khớp), `npm install`.
- Chạy lại `npm test` + `npm run build` để xác nhận không vỡ gì.

### 1.2 Auth cho `GET/POST /api/payments/vietqr/check`
File: `src/app/api/payments/vietqr/check/route.ts` (route POST "khách bấm tôi đã chuyển khoản").
- Thêm ownership theo đúng pattern `retry-pay` (`src/app/api/orders/[id]/retry-pay/route.ts:17-43`): admin bypass; user logged-in chỉ được đơn của mình (userId hoặc email khớp); **guest phải gửi `email` trong body khớp `order.email`, sai → 404** (không lộ đơn tồn tại).
- Thêm rate-limit: `rateLimit(clientKey(req, "vietqr-check"), 10, 60_000)` như route checkout đang làm — vì mỗi request hợp lệ触发 1 outbound call tới VietQR API.
- Cập nhật client `src/app/thanh-toan/page.tsx`: gửi kèm email (đã có trong form checkout) khi gọi route này.
- Test mới: 403 khi sai email, 404 khi guest sai email, 200 khi khớp.

### 1.3 Timeout S3/R2 upload
File: `src/server/storage.ts:87` — thêm `signal: AbortSignal.timeout(30_000)` vào fetch PUT (upload ảnh nên cho rộng hơn các call khác 8-15s).
- Kèm theo: thêm rate-limit cho `src/app/api/upload/route.ts` (admin-only rồi, ví dụ 20/5 phút).

---

## Giai đoạn 2 — Validation & Transactions

### 2.1 Zod validation cho các route còn thủ công
Tạo schema zod ngay trong từng route (không thêm tầng mới, bám pattern `api/orders/route.ts`):
- `api/reviews/route.ts`: `rating: z.coerce.number().int().min(1).max(5)`, `content` min 1 / max 2000 (sửa luôn hổng `NaN` qua check `NaN < 1`).
- `api/bookings/route.ts`: `startsAt` = Date hợp lệ + không quá khứ; name/email/phone có bounds (email regex từ `auth.ts`).
- `api/coupons/admin/route.ts`: `value` finite + min 0; type whitelist ("percent"/"amount").
- `api/admin/webhooks/route.ts`: `url` phải http(s) URL (chặn SSRF khi dispatch/ping).
- `api/addresses/route.ts`: giới hạn độ dài name/phone/address (giữ presence check hiện có).

### 2.2 Booking double-book (BE-005)
File: `src/server/booking.ts:11-38` — bọc check-clash + create trong `prisma.$transaction(..., { isolationLevel: "Serializable" })` + retry P2034 (Prisma-native, không đổi schema). Không thêm `@@unique([serviceId, startsAt])` vì unique toàn phần sẽ chặn đặt lại slot đã `cancelled` (Prisma không có partial unique).
- `setBookingStatus`: whitelist status ("pending"/"confirmed"/"cancelled"/...).
- Test: tạo 2 booking song song cùng slot (Promise.allSettled) → đúng 1 thành công; cancelled vẫn cho đặt lại slot.

### 2.3 Invoice race (BE-005)
File: `src/server/invoice.ts:4-29` — bọc check-existing + upsert counter + create trong 1 `$transaction`; catch P2002 (orderId unique đã có) → re-fetch existing trả về (idempotent, không còn nhảy số INV).

### 2.4 grantOrderPoints lost-update (BE-005)
- `src/server/membership.ts`: thêm `grantOrderPointsTx(tx: Prisma.TransactionClient, userId, total)` dùng `points: { increment: earned }` (không read-then-write), tính tier sau increment — bám pattern `spendPointsTx` (membership.ts:46).
- `src/server/order.ts:129-140` (nhánh completed): bọc trong `$transaction` với **claim idempotent** như nhánh cancelled (dòng 114-122): `updateMany` có điều kiện status để chống cộng điểm 2 lần khi hoàn tất lặp.
- Test: hoàn tất đơn 2 lần → điểm chỉ cộng 1 lần.

### 2.5 CouponRedemption unique (DB-002)
- `prisma/schema.prisma` model CouponRedemption: thêm `@@unique([couponId, orderId])` (an toàn, chặn 1 đơn redeem 2 lần, không đổi hành vi nghiệp vụ).
- `npx prisma migrate dev --name coupon_redemption_unique` + `npm run migrate:all` (đã được user duyệt).
- `src/server/order.ts` catch P2002 → trả message coupon thân thiện.
- *Ghi nhận risk còn lại:* race 2 đơn khác nhau vượt `maxUsesPerUser` khi >1 vẫn dựa count-check — document trong schema comment, không thêm unique [couponId, email] vì sẽ vỡ trường hợp maxUsesPerUser > 1.

### 2.6 markPaid nhất quán MoMo
Đối chiếu `src/server/momo.ts` + `momo/ipn/route.ts`: đảm bảo mọi đường markPaid dùng `updateMany({ where: { ..., paymentStatus: { not: "paid" } } })` như vietqr (audit phát hiện đường momo route thiếu guard). Có test idempotency sẵn — chạy lại để chắc.

---

## Giai đoạn 3 — Rate-limit & Security polish

### 3.1 Rate-limit 3 route IPN/webhook
`momo/ipn`, `vietqr/ipn`, `sepay/webhook`: thêm `rateLimit(clientKey(req, "ipn"), 60, 60_000)` đầu handler (giữ signature verify như cũ). Rate-limit ngay trong route thay vì proxy (proxy edge in-memory per-isolate sẽ đếm sai).

### 3.2 Redact PII cho AI agent (AI-004)
File: `src/server/ai.ts:107-114` — thêm mapper `toOrderForAI()` chỉ giữ: code, status, paymentStatus, total, createdAt, items (name/qty/price), paymentMethod. Bỏ email/phone/address/note khỏi `get_order` và `recent_orders` trước khi stringify sang xAI. Ghi comment vì sao.

### 3.3 Phân trang listOrders (DB-003)
- `src/server/order.ts`: thêm `countOrders(opts)` (where giống listOrders).
- `src/app/admin/don-hang/page.tsx:27-31`: bỏ slice-in-RAM → truyền `{page, pageSize: 20}` + `countOrders` để render phân trang server-side (link ?page=).
- `src/app/admin/page.tsx:16` (dashboard): giới hạn `pageSize: 5-10` sau khi xem phần dùng `orders`.
- `src/server/ai.ts:112` (`recent_orders`): truyền `{ pageSize: 8 }` thay vì kéo full table.
- `src/app/api/orders/route.ts` GET admin: thêm query param `page` (default 50/page).

---

## Giai đoạn 4 — UX polish

### 4.1 Login `?next=`
`src/app/dang-nhap/page.tsx`: đọc `useSearchParams()` (bọc Suspense nếu Next 16 yêu cầu), sau login redirect tới `next` nếu hợp lệ — chỉ nhận path bắt đầu `/` và không `//` (chống open-redirect); admin vẫn ưu tiên `/admin`.

### 4.2 Shared client validation (zod)
Tạo `src/lib/validators.ts` chứa các schema dùng chung client+server (checkout, auth, review); route server import cùng schema với form. Form áp dụng: checkout (SĐT VN, email), đăng ký (password ≥6), review (rating, content max). Giữ nhẹ: chỉ validate ràng buộc đã có ở server, hiện lỗi tiếng Việt ngắn dưới field.

### 4.3 Empty/loading states
- `admin/danh-muc/page.tsx` + `admin/kho/page.tsx`: thêm state `loading` + empty-state ("Chưa có...") + bắt lỗi fetch (pattern làm 1 lần, tái dùng).
- `san-pham/page.tsx` (~105-113): empty-state cho kết quả lọc/tìm kiếm không khớp ("Không tìm thấy sản phẩm nào").

---

## Giai đoạn 5 — Test bổ sung + verify cuối

### 5.1 Test mới (vitest, idempotent theo AGENTS.md — email/code theo timestamp, tự dọn)
- `vietqr/check`: auth paths (khớp/sai email, guest).
- booking: race 2 request cùng slot → 1 thành công; rebook sau cancel.
- invoice: gọi 2 lần → 1 hóa đơn, cùng số.
- order: double-complete → điểm cộng 1 lần.
- coupon: P2002 unique redemption → message thân thiện.
- ai: `toOrderForAI` không chứa email/phone/address.
- validators: unit nhanh cho schemas mới.
- listOrders/countOrders: phân trang đúng.

### 5.2 Verify toàn diện cuối phiên
1. `npx tsc --noEmit`
2. `npm test` (all green)
3. `npm run build` (build production OK)
4. `npm audit` — xác nhận next critical biến mất
5. E2E nếu môi trường cho phép (`npm run build` + `E2E_URL npm run test:e2e`); nếu không, ghi rõ trong báo cáo cuối.

### 5.3 Cập nhật `AUDIT_REPORT.md`
Thêm mục "Audit follow-up <ngày>" liệt kê mục đã fix / còn open (mục "để sau": mfaSecret encrypt-at-rest, CSP unsafe-inline, fail-closed Redis rate-limit, Render/Railway docs) để lần audit sau đối chiếu.

---

## Thứ tự thực hiện & rủi ro
1 → 2 → 3 → 4 → 5. Giai đoạn 1 và 2.5 (migration) là những điểm có rủi ro hồi quy cao nhất — sau mỗi bước đều chạy full `npm test`. Migration chỉ thêm unique mới (không đổi/xóa cột), an toàn rollback. Test DB dùng chung Postgres (ek) — mọi test mới giữ nguyên tắc tự dọn + email timestamp.