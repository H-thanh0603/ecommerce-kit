# SPEC — Multi-tenant (schema-per-tenant)

> Trạng thái: **DRAFT chờ duyệt** · Ngày: 2026-09-23
> Quyết định đã chốt với user: custom domain (C), config per-tenant trong DB (A), Postgres mới 1–10 shop (A), schema-per-tenant (B), global platform admin + user per-tenant (kết hợp), domain gán tay trước / verify DNS sau (C), V1 scope OK, implementation **H1 — request-scoped Prisma**.

## 1. Mục tiêu (outcome)

1 app + 1 database Postgres phục vụ **nhiều shop**, phân biệt bằng **custom domain** (VD `shopa.vn`, `shopb.vn`):

1. 2 domain trỏ vào 1 app → catalog/giỏ/đơn/customer **tách hẳn** theo schema Postgres.
2. Super-admin platform: tạo shop, gán domain, vào được mọi shop (route `/platform`).
3. Admin/customer từng shop chỉ trong shop đó — login không tràn schema.
4. Dev local: `shopa.localhost:3000`.
5. Migration SQLite hiện tại → Postgres + seed 2 shop mẫu `shopa`/`shopb`.

**Không làm (YAGNI, ngoài V1):** marketplace cross-shop, billing SaaS, shop self-serve đăng ký, verify DNS/SSL tự động (B — làm sau), multi-region, DB-per-tenant.

**Users:** super-admin platform; shop-admin + customer per-tenant.

**Success criteria:** test chứng minh: 2 schema không đọc được data của nhau; Host khác nhau → `search_path` khác; login shopa không vào được data shopb; migration loop chạy trên mọi schema; `tsc` + `vitest` + `build` xanh.

## 2. Kiến trúc

```
Host: shopa.vn ──► src/proxy.ts ──► lookup Tenant(domain) [schema `platform`]
                                   ──► set tenant ctx (schema name)
                                   ──► prisma request-scoped: SET search_path = "shopa", public
Super-admin ──► /platform/* (Tenant, TenantDomain, PlatformAdmin) — luôn schema platform
Customer/admin ──► site thường — mọi query nằm trong schema tenant
```

| Hạng mục | Quyết định |
|---|---|
| DB | **Postgres** (dev + prod). Sau migrate: bỏ `file:./dev.db` khỏi workflow |
| Isolation | Schema-per-tenant: mỗi shop 1 schema Postgres chứa toàn bộ bảng commerce hiện tại |
| Tenant resolve | `proxy.ts`: Host → `TenantDomain` → schema name; local: `shopa.localhost` / `localhost` + env `DEFAULT_TENANT` |
| Prisma (H1) | `src/server/db.ts` wrap: AsyncLocalStorage `{ schema }` → mỗi query chạy sau `SET search_path` (session-level per request via interactive transaction **hoặc** per-query `$executeRaw("SET search_path…")` trước model call — xem §4.1) |
| Config site | `SiteSetting` + brand/theme/payments/features ở **mỗi tenant schema**; `site.ts` chỉ còn default; **payment secrets** chuyển sang DB per-tenant (env chỉ còn secret platform: `AUTH_SECRET`, `DATABASE_URL`…) — *ghi chú rủi ro, xem §7* |
| Global admin | Schema `platform`: `Tenant`, `TenantDomain`, `PlatformAdmin`; route `/platform` + feature flag |
| Per-tenant | Toàn bộ model commerce hiện tại (User, Product, Order, SiteSetting, AuditLog…) — **không thêm cột `tenantId`** (tách bằng schema) |
| Session | JWT thêm claim `schema`/`tenantSlug` — validate session phải confirm schema khớp Host (chống dán cookie chéo domain) |
| Payment IPN | Webhook không có session → resolve tenant theo `orderId`/`paymentRef` **hoặc** query param `?tenant=` (callback URL sinh ra lúc tạo payment đã mang domain shop → Host vẫn resolve được); fallback: map order prefix |
| Seed | `prisma/seed.ts` per-tenant; script `platform/seed` tạo `shopa`/`shopb` + domain + admin |
| Migration | `prisma migrate deploy` chỉ migrate schema `public`/đầu; script loop `for schema in $(list): CREATE SCHEMA IF NOT EXISTS; search_path=schema; prisma migrate deploy` (xem §4.4) |
| Local dev | `shopa.localhost` (browser tự resolve) + rewrites/env `DEFAULT_TENANT=shopa` cho `localhost` |

## 3. Schema DB

### 3.1 Schema `platform` (mới)

```prisma
model Tenant {
  id        String   @id @default(cuid())
  slug      String   @unique   // tên schema Postgres: "shopa" (lowercase, [a-z0-9_])
  name      String             // tên hiển thị
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  domains   TenantDomain[]
}

model TenantDomain {
  id       String @id @default(cuid())
  host     String @unique      // "shopa.vn", "www.shopa.vn"
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model PlatformAdmin {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

### 3.2 Schema tenant (giữ nguyên `schema.prisma` hiện tại)

- Toàn bộ model commerce **giữ nguyên** (không đổi tên, không thêm `tenantId`).
- `datasource` đổi `provider = "postgresql"`; `url = env("DATABASE_URL")` (mặc định `?schema=public` — runtime override bằng `search_path`).
- `SiteSetting` giữ cùng shape; payment keys hiện ở `site.ts` → move thành override key `payments` (JSON) trong DB, schema admin `/admin/cai-dat` thêm ô khóa MoMo/VNPay (đọc/triển khai theo phase — V1 tối thiểu: brand/theme/features/payments enabled; secrets per-tenant nếu kịp, không thì env chung 1 phase sau — **cần chốt ở §8**).

### 3.3 Quy ước slug/schema

- `slug`: `^[a-z][a-z0-9_]{1,30}$` — **không** cho `public`, `platform`(chặn trùng system).
- Schema name = `Tenant.slug` tuyệt đối; Host không bao giờ chạm identifier raw (chỉ map qua DB lookup).

## 4. Cơ chế H1 — request-scoped Prisma

### 4.1 Tenant context

```ts
// src/server/tenant-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
type Ctx = { schema: string };           // "" = platform/public
export const tenantStore = new AsyncLocalStorage<Ctx>();
export function getTenantSchema(): string { ... default "public" }
export function runWithTenant<T>(schema: string, fn: () => T): T
```

### 4.2 Wrap Prisma — yêu cầu kỹ thuật

`src/server/db.ts` hiện export 1 `prisma` singleton. Với H1, **mọi connection** của 1 request phải luôn chạy với `search_path` đúng schema:

- **Cấm** `SET search_path` rồi trả connection về pool — tenant sau sẽ lọt schema cũ (lỗi isolation nghiêm trọng).
- Prisma 6 **không** có option `search_path` per-client trên engine cũ. Ba ứng viên khả thi (chọn 1 ở spike P0):

| | Phương án | Ưu | Nhược |
|---|---|---|---|
| **(a)** | **Driver adapter `@prisma/adapter-pg`**, mỗi schema 1 adapter/pool, pg config `options=-c search_path=<slug>` — set **ngay lúc mở connection**, sống cùng pool | Đúng chuẩn, pool cách ly, ít đụng call site (`getDb(schema)` trả client cached) | Thêm dependency, cần verify với Prisma 6.19 + Next |
| **(b)** | **Pool-per-schema**: `DATABASE_URL` + `?schema=<slug>` (Prisma tự set search_path theo URL param), cache `Map<slug, PrismaClient>` | Ít dependency nhất, chuẩn Prisma | Prisma vẫn trả client về pool đúng schema — OK vì client cố định/schema; cần confirm URL param hoạt động đủ lâu trên mỗi query |
| **(c)** | **Interactive transaction** bọc mọi query: `$transaction(tx => { SET search_path; … })` | Không cần pool mới | Sửa **mọi** call site → gần bằng H2, **loại** |

**Chốt đề xuất:** thử **(b) trước** (đơn giản nhất), fail thì **(a)**. Cả 2 giữ nguyên pattern `import { prisma }` → `import { db }` với `db` là Proxy/lấy theo `getTenantSchema()` từ AsyncLocalStorage, **0 thay đổi call site** ở 4 file lõi.

> **Spike P0 (bắt buộc trước khi code phase khác):** chứng minh (b) hoặc (a) hoạt động — test isolation T3 là bằng chứng pass.

### 4.3 Proxy resolve

```
proxy(req):
  host = req.headers.get("host")  // bỏ :port
  nếu host ∈ {localhost, 127.0.0.1, *.localhost}:
    slug = subdomain (shopa.localhost → shopa) || env DEFAULT_TENANT || "shopa"
  else:
    tenant = resolveTenant(host)  // Node helper, cache — xem dưới
    404 nếu không thấy hoặc !tenant.active
  set header x-tenant-host / x-tenant-slug cho downstream
```

- **Ràng buộc:** `proxy.ts` chạy ở **Edge runtime** → **không** gọi được Prisma ở đây.
  → Proxy **chỉ** forward header Host/slug. Helper **`src/server/tenant.ts#resolveTenant(host)`** chạy ở **Node** (route handler / server component / instrumentation), query schema `platform`, **cache in-memory TTL ~60s** + invalidation khi super-admin đổi domain.
- `getDb()` (§4.2) gọi sau `resolveTenant` — mọi server entry phải resolve trước khi truy vấn; helper default khi chưa resolve: **`DEFAULT_TENANT` env** (cron/health) hoặc **reject** (route storefront — plan ghi chi tiết per-route).
- CSRF Origin check + `/admin` gate hiện có: **giữ nguyên**; `/admin` đọc session trên schema tenant (đã resolve).

### 4.4 Migration multi-schema

- `prisma migrate deploy` → chỉ apply vào schema đang `search_path` đầu.
- Script `scripts/migrate-all-schemas.ts`: list tenant từ platform DB → mỗi tenant: `CREATE SCHEMA IF NOT EXISTS "slug"` → chạy `prisma migrate deploy` với `DATABASE_URL=...?schema=slug` (Prisma `schema` URL param đổi default search_path — **đã hỗ trợ**: `?schema=shopa`).
  → **Note:** `?schema=` của Prisma set `search_path` cho client — với driver adapter cần confirm. Plan spike xác nhận.
- CI/deploy: chạy `migrate-all-schemas` thay `prisma migrate deploy` trực tiếp.

### 4.5 Seed

- `scripts/create-tenant.ts <slug> <name> <host>`: insert platform `Tenant`+`TenantDomain`, `CREATE SCHEMA`, migrate deploy schema đó, chạy `prisma/seed.ts` với `DATABASE_URL=...?schema=slug` (admin per-shop từ env `ADMIN_EMAIL/PASSWORD` per invocation).
- V1 seed 2 shop: `shopa` (host `shopa.localhost`, `shopa.vn`), `shopb`.

## 5. Auth & session

- JWT claims thêm `tenantSlug` + `tv` (đã có). `verifySession` so `tenantSlug` == resolveTenant(current host) — mismatch → coi như chưa đăng nhập.
- `/platform/*`: auth bằng `PlatformAdmin` (cookie riêng `platform_session`, schema platform) — **không** dùng User per-tenant.
- `/admin/*` hiện tại: giữ, nhưng chạy trên schema tenant (đã resolve trước).
- Rate-limit/audit/mail log: per-tenant (nằm trong schema) — không đổi code nhiều.

## 6. Cấu hình site per-tenant

- `getEffectiveSiteConfig()` — đã đọc `SiteSetting` qua `prisma` → **tự đúng** khi prisma đã trỏ schema (H1).
- `site.ts` giữ nguyên role "default khi DB chưa ghi".
- **Build-time `isEnabled()` client**: vẫn đọc file → **giới hạn V1**: UI ẩn/hiện mặc định theo file; flag DB chỉ ảnh hưởng server. (Đổi sang runtime client fetch = phase sau — **ghi vào §8**.)

## 7. Rủi ro & mitigations

| Rủi ro | Mới/Cũ | Mitigation |
|---|---|---|
| Edge middleware không chạy Prisma | Mới | Resolve tenant ở Node (§4.3); proxy chỉ truyền host |
| `search_path` lọt connection pool | Mới | Per-schema pool/adapter (§4.2) — spike phase 0 |
| Payment secrets từng shop trong DB | Mới (đổi từ env) | V1: giữ env chung + per-tenant override `payments` JSON đọc được; **chốt §8** |
| Slug schema injection | Mới | Chỉ map Host→slug qua DB; validate `^[a-z][a-z0-9_]+$`; blocklist `public` |
| Session cookie share chéo domain | Mới | JWT claim tenantSlug so với Host; cookie `__Host-`/`__Secure-` từng domain (đơn: cookie thường + check claim là đủ V1) |
| Webhook/IPN không có Host shop | Mới | Callback URL luôn sinh từ shop origin (Host resolve OK); fallback `?tenant=` |
| `unstable_cache` key `site-setting-rows` giữa 2 tenant | Mới | Cache key/tag thêm `tenantSlug` |
| E2E/test hiện tại assume SQLite | Cũ | Chuyển vitest sang Postgres (docker/CI service); giữ file DB cho unit test thuần? → **Postgres bắt buộc cho mọi test DB** |
| `db:push`/`db:reset` | Cũ | Script sang multi-schema; `db:reset` = drop mọi tenant schema + recreate |
| Rollback | — | Git revert + migrate script idempotent (`IF NOT EXISTS`) |

## 8. Câu hỏi mở (chốt trước khi code — ngoài spike)

1. **Payment/MoMo/VNPay secret per-tenant hay env chung V1?** (đề xuất: env chung V1, override DB phase sau)
2. **Client feature flags (`isEnabled` build-time)** giữ nguyên V1? (đề xuất: **giữ**, ghi rõ docs)
3. **App URL default** khi chưa có Host (cron/health): env `DEFAULT_TENANT=shopa`.

## 9. Test plan (TDD — RED trước)

| # | Test | Bằng chứng |
|---|---|---|
| T1 | `resolveTenant("shopa.vn")` → schema `shopa`; unknown host → null/404 | unit, mock platform DB |
| T2 | Slug hợp lệ/chặn `public`/trùng | unit zod |
| T3 | **Isolation:** insert Product trong schema A → query schema B không thấy | integration Postgres 2 schema |
| T4 | Session tenantSlug ≠ host → reject | unit verifySession |
| T5 | `migrate-all-schemas` idempotent chạy 2 lần | script + e2e nhẹ |
| T6 | Seed/create-tenant tạo đủ Tenant+Domain+Schema+admin | integration |
| T7 | `getEffectiveSiteConfig` trả brand khác nhau cho 2 tenant | integration (unstable_cache key) |
| T8 | Có sẵn: 82 test cũ **vẫn xanh** (chuyển sang Postgres) | vitest toàn bộ |

Giữ quy ước AGENTS.md: test tự dọn, product riêng mỗi file checkout.

## 10. Plan tách phase — ✅ DONE (ship 2026-09-24, T1–T11)

- **P0 Spike:** ✅ (b) pool-per-schema `?schema=` qua ALS — pass, isolation test T3 xanh.
- **P1 DB:** ✅ provider postgres, platform models, `resolveTenant`, `tenant-context`, `db.ts` wrap, T1–T4.
- **P2 Proxy/auth:** ✅ proxy truyền host, session `tenantSlug`, `/platform` login+CRUD tenant.
- **P3 Migration/seed:** ✅ `migrate-all-schemas`, `create-tenant`, seed shopa/shopb, T5–T6.
- **P4 Settings/cache:** ✅ `unstable_cache` key per-tenant, `/admin/cai-dat` OK, T7.
- **P5 Cutover:** ✅ vitest→Postgres, `.env.example`, DEPLOY.md runbook (§10), smoke 2 domain local, T8 full (116 tests).

**Delta khi ship:** payment IPN/Return + sitemap/robots **vẫn đọc env `APP_URL`**
(chưa resolve theo Host lúc tạo payment) — mỗi tenant bật payment online cần
`APP_URL` riêng hoặc đợi phase sau; mail link + tenant resolve đã theo Host.
(YAGNI đã ghi ở §7/Task 7 — xác nhận còn nguyên khi ship.)

**Definition of done spec:** ✅ user “OK” → plan → code T1–T11 xanh.

---
*Cập nhật AUDIT_REPORT/DEPLOY/README khi V1 ship — nằm trong P5.*
