# Upgrade P0-P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa correctness P0, tách pricing khỏi checkout, chặn leak tenant/cache/pool.

**Architecture:** Pricing pure tách khỏi transaction. Tenant seam scope theo schema + LRU. Payment sau transaction chuyển thành pending-retry, không hoàn tồn tự động.

**Tech Stack:** Next 16.3.5, Prisma 6 + PostgreSQL, Vitest, Zod, jose

**Spec:** Phát hiện: `src/server/order.ts:111-329` god-module + pay sau commit throw mất đơn; `src/server/settings.ts:168` thiếu whitelist payments/home; `src/server/catalog.ts:24-34` cache chung tenant; `src/server/db.ts:42-60` pool vô hạn; flags dual-source dễ nhầm.

## Global Constraints

- Lõi 4 module: `catalog/coupon/cart/order` — không logic chéo, facade `commerce.ts` chỉ re-export.
- Module mới 1 file `src/server/<ten>.ts` + flag `site.features` + đăng ký `src/lib/modules.ts`.
- Test DB Postgres (ek) idempotent, email/code duy nhất theo timestamp, tự dọn, nạp lại tồn. File checkout song song dùng SP riêng (p1 commerce-order, p2 giftcard).
- Không raw SQL datetime. Backdate qua `prisma.xxx.update({ data: { updatedAt } })`.
- `npx tsc --noEmit` sạch. `npm test` giữ xanh (hiện 117 pass).
- Tiền/tồn/webhook bắt buộc có test.
- Tenant <10: LRU đơn giản đủ, không thêm infra.
- Payment fail: giữ đơn pending cho thử lại, không hủy + hoàn tồn tự động.

## Review Focus

- clientRequestId trùng đua 2 POST song song → mong trả 1 đơn idempotent:true.
- Host forged/lạ → mong fallback schema public, không rò tenant.
- Coupon hết lượt ngay trước commit → mong chặn trong tx, không TOCTOU.
- VNPay/MoMo chưa cấu hình → mong lỗi rõ trước trừ tồn.
- Đổi admin payments/home → mong storefront hiệu lực ngay sau revalidateTag, không cần rebuild.

---

### Task 1: Whitelist payments/home trong settings loader

**Files:**
- Modify: `src/server/settings.ts:158-176`
- Test: `src/server/settings.test.ts`

**Interfaces:**
- Consumes: `siteSettingsInput`, `mergeSiteConfig` hiện có.
- Produces: `getSiteOverrides(): Promise<SiteOverrides>` trả đủ `payments,home`.

- [ ] **Step 1: Write the failing test**

```ts
// trong settings.test.ts, thêm test:
const saved = await saveSiteSettings({ payments: { cod: { enabled: false, label: "COD off" } }, home: { eyebrow: "Test Home" } });
expect(saved.payments.cod.enabled).toBe(false);
const eff = await getEffectiveSiteConfig();
expect(eff.payments.cod.enabled).toBe(false);
expect(eff.home.eyebrow).toBe("Test Home");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/settings.test.ts`
Expected: FAIL ở `eff.payments`

- [ ] **Step 3: Write minimal implementation**

```ts
if (["brand", "theme", "shipping", "features", "currency", "announcement", "consent", "payments", "home"].includes(r.key)) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/settings.test.ts`
Expected: PASS. Chạy `npx tsc --noEmit` sạch.

- [ ] **Step 5: Commit**

```bash
git add src/server/settings.ts src/server/settings.test.ts
git commit -m "fix(settings): load payments/home overrides"
```

### Task 2: Scope cache catalog theo tenant

**Files:**
- Modify: `src/server/catalog.ts:24-34`
- Test: `src/server/tenant-settings.test.ts` mẫu mock unstable_cache

**Interfaces:**
- Consumes: `getTenantSchema()` từ `src/server/tenant-context.ts:20-22`, `runWithTenant`.
- Produces: `listCategories()` trả đúng theo schema.

- [ ] **Step 1: Write the failing test**

```ts
// mock unstable_cache keyed theo keyParts+tags, tạo 2 tenant category khác nhau, gọi xen kẽ
// assert trả khác nhau — cache key ["categories"] chung hiện tại sẽ FAIL
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/tenant-settings.test.ts`
Expected: FAIL (trả cùng cache)

- [ ] **Step 3: Write minimal implementation**

```ts
const makeCategoriesLoader = (schema: string) => unstable_cache(
  async () => runWithTenant(schema, async () => {
    const rows = await prisma.category.findMany({ include: { _count: { select: { products: { where: { published: true } } } } }, orderBy: { name: "asc" } });
    return rows.map(toCategory);
  }),
  ["categories", schema],
  { tags: [`catalog:${schema}`], revalidate: 60 },
);
```

Các điểm ghi catalog đổi `revalidateTag("catalog")` thành `revalidateTag(`catalog:${getTenantSchema()}`)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/tenant-settings.test.ts src/server/catalog`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/catalog.ts src/server/tenant-*.test.ts
git commit -m "fix(catalog): scope categories cache per tenant"
```

### Task 3: Payment fail giữ pending + retry

**Files:**
- Modify: `src/server/order.ts:208-329`, `src/app/api/orders/route.ts:47-84`
- Test: `src/server/commerce-order.test.ts` (SP p1 riêng)

**Interfaces:**
- Consumes: `processPayment(method, {code,total,ip})` từ `src/server/payments.ts:76-82`.
- Produces: `createOrder` không throw sau commit; trả `{payUrl?, needsRetry:true}` khi build URL fail.

- [ ] **Step 1: Write the failing test**

```ts
// mock buildVnpayUrl throw, gọi createOrder vnpay với p1line
await expect(createOrder({ ...base, paymentMethod: "vnpay", items: p1line })).resolves.toMatchObject({ status: "pending" });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/commerce-order.test.ts`
Expected: FAIL (hiện throw ở order.ts:322)

- [ ] **Step 3: Write minimal implementation**

```ts
if (input.paymentMethod === "vnpay" || input.paymentMethod === "momo") {
  const pay = await processPayment(input.paymentMethod, { code: mapped.code, total: mapped.total, ip: input.ip });
  if (!pay.ok) return Object.assign(mapped, { payUrl: undefined, needsRetry: true });
  payUrl = pay.payUrl;
}
```

Thêm route `POST /api/orders/[id]/retry-pay` gọi `processPayment` lại theo code+total.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/commerce-order.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/order.ts src/app/api/orders/route.ts src/app/api/orders/\[id\]/retry-pay/route.ts
git commit -m "fix(order): keep pending on pay-url fail + retry route"
```

### Task 4: Tách pricing pure khỏi createOrder

**Files:**
- Create: `src/server/pricing.ts`
- Modify: `src/server/order.ts:152-206`
- Test: `src/server/pricing.test.ts`

**Interfaces:**
- Consumes: `discountAmount`, `quoteShipping`, `assertCoupon`, `quoteGift`, `quoteBundle`, `discountFromPoints`.
- Produces: `quoteTotals({subtotal, ship, off, pointsDiscount, giftAmount, bundleDiscount}): {total}` + `quoteOrder` async.

- [ ] **Step 1: Write the failing test**

```ts
import { quoteTotals } from "@/server/pricing";
expect(quoteTotals({ subtotal: 600_000, ship: 30_000, off: 60_000, pointsDiscount: 10_000, giftAmount: 20_000, bundleDiscount: 0 }).total).toBe(540_000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/pricing.test.ts`
Expected: FAIL (module chưa có)

- [ ] **Step 3: Write minimal implementation**

```ts
export function quoteTotals(a: { subtotal: number; ship: number; off: number; pointsDiscount: number; giftAmount: number; bundleDiscount: number }) {
  return { total: Math.max(0, a.subtotal + a.ship - a.off - a.pointsDiscount - a.giftAmount - a.bundleDiscount) };
}
```

Chuyển đoạn tính `order.ts:152-206` sang `pricing.ts`, `createOrder` gọi lại. Thay `await import` coupon/gift/bundle bằng static import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/pricing.test.ts src/server/commerce-order.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/pricing.ts src/server/pricing.test.ts src/server/order.ts
git commit -m "refactor(order): extract pricing pipeline"
```

### Task 5: Pool tenant LRU max 10

**Files:**
- Modify: `src/server/db.ts:42-60`
- Test: `src/server/tenant-isolation.test.ts`

**Interfaces:**
- Consumes: `getTenantSchema()`, `DATABASE_URL`.
- Produces: `getClientForSchema(schema)` giữ fail-closed + evict LRU, export `__poolSizeForTest` nếu cần.

- [ ] **Step 1: Write the failing test**

```ts
for (let i = 0; i < 12; i++) getClientForSchema(`t${i}`); // cần mark provisioned trước
expect(poolSize()).toBeLessThanOrEqual(10);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/tenant-isolation.test.ts`
Expected: FAIL (map tăng vô hạn)

- [ ] **Step 3: Write minimal implementation**

```ts
const MAX_CLIENTS = 10;
// get: xóa-insert lại để mark recent; set vượt max thì forgetClient key đầu
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/tenant-isolation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/db.ts src/server/tenant-isolation.test.ts
git commit -m "fix(db): LRU tenant clients max 10"
```

### Task 6: Server chỉ dùng isFeatureOn

**Files:**
- Modify: `src/lib/features.ts`, `src/config/site.ts:193`
- Test: `rg "isEnabled" src/server` rỗng

- [ ] **Step 1: Liệt kê vi phạm** `rg -n "isEnabled|isModuleOn" src/server`
- [ ] **Step 2: Thay server-side sang isFeatureOn, giữ isEnabled chỉ client**
- [ ] **Step 3: Verify** `npx tsc --noEmit` + grep lại sạch
- [ ] **Step 4: Commit** `chore(flags): server uses isFeatureOn only`

### Task 7: Pagination + VN timezone + lowstock nhất quán

**Files:**
- Modify: `src/server/order.ts:14-47,334-360,362-424`
- Test: `src/server/lowstock.test.ts`, mới `src/server/shopStats.test.ts`

**Interfaces:**
- Consumes: `LOW_STOCK_THRESHOLD`, `toProduct`, `productInclude`.
- Produces: `listOrders(filter, {page,pageSize})`, `shopStats()` days theo Asia/Ho_Chi_Minh.

- [ ] **Step 1: Write failing tests** — page 2 phân trang; days VN; lowRows dùng chung threshold
- [ ] **Step 2: Run** mong FAIL
- [ ] **Step 3: Implement** — thêm `{page,pageSize}` skip/take; `Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"})`; `lowRows` dùng `LOW_STOCK_THRESHOLD`; gộp alertLowStock N+1 thành 1 findMany
- [ ] **Step 4: Run** mong PASS
- [ ] **Step 5: Commit** `fix(shop): pagination + VN timezone + lowstock threshold`

### Task 8: Verify toàn bộ

- [ ] **Step 1:** `npx tsc --noEmit` sạch
- [ ] **Step 2:** `npm test` pass
- [ ] **Step 3:** `npm run build` pass
