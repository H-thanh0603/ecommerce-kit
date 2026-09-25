# Multi-tenant (schema-per-tenant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến 1 app 1 shop (SQLite) thành 1 app nhiều shop trên Postgres — mỗi shop 1 custom domain, 1 schema Postgres, config trong DB, super-admin quản ở `/platform`.

**Architecture:** H1 — request-scoped Prisma: `resolveTenant(host)` (Node, cache 60s, đọc schema `platform`) → `AsyncLocalStorage { schema }` → export `prisma` là Proxy forward sang `PrismaClient` theo schema (`Map<slug, client>`, URL `?schema=<slug>` — mỗi client pool vĩnh viễn 1 search_path, không SET/RETURN connection giữa chừng). Proxy (Edge) chỉ truyền Host; không Prisma ở Edge. JWT thêm claim `tenantSlug` so với Host. Schema `platform` chứa `Tenant`/`TenantDomain`/`PlatformAdmin`; model commerce chạy trong mỗi schema tenant (không cột `tenantId`).

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts` Edge), Prisma 6.19 + PostgreSQL 16, jose (JWT), zod, vitest, AsyncLocalStorage (`node:async_hooks`).

**Spec:** `docs/multi-tenant-spec.md` (đã duyệt). Chốt của user: C custom domain, A config DB, A Postgres mới, B schema-per-tenant, kết hợp global admin + per-tenant users, C domain tay trước verify sau, V1 scope OK, **H1**.

**Spec deltas đã chốt khi viết plan** (không hỏi lại):
1. `DEFAULT_TENANT` fallback = `public` (không phải `shopa`) — schema `public` giữ data dev/hiện tại, chạy local không bắt buộc tạo tenant.
2. Platform models migrate vào **cả** mọi schema (một `schema.prisma`; chỉ platform client đọc bảng Tenant* từ schema `platform`) — chấp nhận bảng thừa trong tenant schema (YAGNI tách schema file).
3. Payments secret V1: giữ env chung (spec §8.1); client feature flags vẫn build-time (§8.2).

## Global Constraints

- Ngôn ngữ: comment/log/UI tiếng Việt, tech term tiếng English (AGENTS.md).
- Test DB tự idempotent: email/code duy nhất theo timestamp, xóa sau test; không dùng product p1–p12 (checkout tests) để trừ tồn.
- TDD: test RED trước production code mỗi task (Iron Law).
- Slug tenant: `^[a-z][a-z0-9_]{1,30}$`, blocklist `public`/`platform` — identifier schema chỉ đến từ DB lookup, không interpolate Host raw.
- KHÔNG import module chứa Prisma vào client component (build vỡ).
- Seed prod giữ gate `ALLOW_SEED=1` + password ≠ `admin123`.
- Verification cuối mỗi phase: `npx tsc --noEmit`, `npx vitest run`, `npm run lint` (baseline 12 error `react-hooks/set-state-in-effect` pre-existing — không tăng), `npm run build`.
- Commits nhỏ theo task: `feat(mt): …` / `test(mt): …` — không commit secret/`dev.db`/`.env`.
- CI sau cutover: service `postgres:16-alpine`, mọi `DATABASE_URL: file:./dev.db` → `postgresql://ek:ek@localhost:5432/ek_test?schema=public`.
- Local dev đã có Postgres chạy sẵn (`pg_isready` OK, `/var/run/postgresql:5432`) — không cần Docker.

## Review Focus

Input/failure mode spec ngầm định, người dùng thật gặp trước nhất — mỗi dòng có test Ghim trong task sở hữu:

1. **Host không trong DB → request rơi vào schema `public` (lọt data tenant khác)** — Task 2: `resolveTenant("khong-ton-tai.vn")` → `null`; Task 7: root layout `notFound()` khi production host lạ.
2. **Pool leak search_path: client A thấy data B sau khi share pool** — Task 4: test isolation 2 schema, insert A query B = 0, lặp **20 lần** (pool reuse).
3. **Session shopa dán sang host shopb vẫn nhận** — Task 5: `sessionMatchesTenant(payload_shopa, "shopb")` → false; `getSession` reject.
4. **`unstable_cache` key toàn cục → brand shop A hiển thị shop B** — Task 6: 2 schema brand khác, `getEffectiveSiteConfig` không lẫn kể cả cache-hit.
5. **Cron/IPN nền không có Host → purge sai schema/crash** — Task 8: retention dưới `runWithTenant` purge đúng schema; route cron wrap `withDefaultTenant`; test đọc source route chứa `withDefaultTenant`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| Create `src/server/tenant-context.ts` | ALS `{ schema }`: `runWithTenant`, `getTenantSchema` |
| Create `src/server/tenant.ts` | `slugSchema`, `parseHost`, `resolveTenant` (cache 60s), `setTenantLookup`, `resolveBaseUrl`, `withDefaultTenant` |
| Create `src/server/tenant.test.ts` | T1/T2 unit |
| Modify `src/server/db.ts` | Proxy `prisma` → `getClientForSchema` theo ALS; `Map<schema, PrismaClient>`; URL `?schema=` |
| Create `src/server/test-schema.ts` | Helper `baseDbUrl`, `ensureSchema`, `dropSchema` tái dùng (isolation/settings/cron tests) |
| Create `src/server/tenant-isolation.test.ts` | T3 integration 2 schema PG |
| Modify `prisma/schema.prisma` | provider `postgresql` (Task 1) + models Tenant/TenantDomain/PlatformAdmin (Task 3) |
| Create `src/server/platform-db.ts` | `platformDb` client `?schema=platform`, `createTenant`, `findTenantByHost` |
| Create `src/server/platform.test.ts` | T6 create/lookup/blocked slug |
| Modify `src/server/session.ts` | claim `t`/`tenantSlug`, `sessionMatchesTenant` |
| Modify `src/server/auth.ts` | `getSession` verify tenant; `loginUser`/`registerUser` set claim; mail link theo Host |
| Create `src/server/tenant-auth.test.ts` | T4 session/host |
| Modify `src/server/settings.ts` | cache key/tag theo schema; loader per-schema; revalidate theo tag schema |
| Create `src/server/tenant-settings.test.ts` | T7 brand không lẫn |
| Modify `src/app/layout.tsx` | `wireTenantLookup()` + resolve host → 404 production host lạ |
| Create `src/server/platform-auth.ts` | cookie `ek_platform`, JWT role `platform`, `requirePlatformAdmin` |
| Create `src/app/platform/**` + `src/app/api/platform/**` | login, list, tạo tenant |
| Modify `src/proxy.ts` | gate `/platform` theo cookie platform; giữ CSRF/Origin/`/admin` |
| Create `scripts/create-tenant.ts`, `scripts/migrate-all-schemas.ts`, `scripts/migrate-schema.sh`, `scripts/create-platform-admin.ts` | ops |
| Create `src/server/tenant-cron.test.ts`, `src/server/migrate-all.test.ts` | T5 |
| Modify `src/app/api/cron/**`, IPN routes | wrap tenant |
| Modify `.env.example`, CI, `AGENTS.md`, `DEPLOY.md`, `README.md`, `docs/multi-tenant-spec.md`, `scripts/backup.sh`, `scripts/smoke.sh`, `package.json` | ship docs/ops |

---

### Task 1: Cutover Prisma sang PostgreSQL (giữ hành vi, 0 multi-tenant)

**Files:**
- Modify: `prisma/schema.prisma:3-6`, `prisma/migrations/migration_lock.toml`
- Modify: `.env` (local, không commit), `.env.example:1`
- Modify: `.github/workflows/ci.yml:18-23,44-48`
- Modify: `src/server/abandoned.test.ts:17-19` (raw SQL epoch-ms chỉ đúng SQLite)
- Modify: `AGENTS.md:8-9`, `DEPLOY.md` (backup/restore), `docker-compose.yml` (comment)
- Test: toàn suite hiện có (28 files, 82 tests) phải xanh trên PG

**Interfaces:**
- Consumes: local Postgres sẵn (`pg_isready` OK).
- Produces: `DATABASE_URL="postgresql://…@localhost:5432/ek?schema=public"`; migration baseline mới cho PG; contract: vitest chạy trên PG.

**Spec delta §4.4:** dùng URL param `?schema=` ngay (chuẩn Prisma) — nền cho H1 Task 4.

- [ ] **Step 1: Tạo DB + đổi env local**

```bash
createdb ek 2>/dev/null || psql -c 'CREATE DATABASE ek'
```

`.env` (không commit) đổi dòng 1:
```
DATABASE_URL="postgresql://postgres@localhost:5432/ek?schema=public"
```
`.env.example` đổi tương ứng (giữ comment Docker pg).

- [ ] **Step 2: Đổi provider + baseline migration mới**

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# Migration SQLite không chạy trên PG theo từng file cũ — squash baseline:
npx prisma migrate reset --force   # với provider mới → tạo baseline từ schema hiện tại
npx prisma generate
```

Nếu complain lock provider mismatch: xóa nội dung `prisma/migrations/` (git giữ history), sửa `migration_lock.toml` → `provider = "postgresql"`, rồi `npx prisma migrate dev --name baseline_postgres`. Migration file mới chứa toàn bộ `CREATE TABLE`.

- [ ] **Step 3: Sửa test raw-SQL SQLite-specific**

`src/server/abandoned.test.ts:17-19` — PG lưu `DateTime` là `timestamp`, không epoch-ms. Đổi:
```ts
// Thay raw SQL epoch-ms (chỉ đúng trên SQLite):
await prisma.cartLine.update({ where: { id: line.id }, data: { updatedAt: old } });
```
(Xóa comment epoch-ms/SQLite.)

- [ ] **Step 4: Chạy toàn suite — giữ 82/82**

```bash
npx prisma db push --force-reset && npx tsx prisma/seed.ts
npx tsc --noEmit && npx vitest run
```
Expected: tsc exit 0; vitest **82/82 PASS**.

- [ ] **Step 5: CI → Postgres service**

`.github/workflows/ci.yml` thêm vào job `verify`:
```yaml
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: ek
          POSTGRES_PASSWORD: ek
          POSTGRES_DB: ek_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
```
Đổi **mọi** `DATABASE_URL: file:./dev.db` (3 chỗ) → `DATABASE_URL: postgresql://ek:ek@localhost:5432/ek_test?schema=public`. Migrate step giữ `npx prisma migrate deploy` (DB trống).

- [ ] **Step 6: Docs PG là mặc định**

- `AGENTS.md` Lệnh: `npm run dev # chạy local (Postgres ek)`; "DB thật dev.db" → "DB thật Postgres (ek)".
- `DEPLOY.md`: backup `backup.sh` đã branch `postgresql://` — ghi rõ multi-schema cần `pg_dump` toàn schema (Task 11 update lại chi tiết); restore PG thay SQLite copy.
- `docker-compose.yml`: sửa comment "Mặc định: app + SQLite" → "Khuyến nghị: profile pg" (không đổi default compose — YAGNI).

- [ ] **Step 7: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run && npm run lint && npm run build
git add prisma/schema.prisma prisma/migrations .env.example .github/workflows/ci.yml \
  src/server/abandoned.test.ts AGENTS.md DEPLOY.md docker-compose.yml
git commit -m "feat(mt): cutover Prisma sang PostgreSQL (baseline, CI service, test raw-SQL PG)"
```

---

### Task 2: Tenant context + resolveTenant (host → schema) — TDD

**Files:**
- Create: `src/server/tenant-context.ts`, `src/server/tenant.ts`, `src/server/tenant.test.ts`

**Interfaces:**
- Produces:
  - `type TenantInfo = { slug: string; name: string }`
  - `parseHost(host: string): string` — strip `:port`, lowercase
  - `slugSchema: ZodString` — regex + blocklist
  - `setTenantLookup(fn: (host) => Promise<TenantInfo | null>): void`
  - `resolveTenant(host: string): Promise<TenantInfo | null>` — cache TTL 60s; `null` = unknown host
  - `runWithTenant<T>(schema: string, fn: () => T): T`; `getTenantSchema(): string` default `"public"`
- Consumes: — (pure; Task 4 nối Prisma)

- [ ] **Step 1: Viết failing tests**

`src/server/tenant.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseHost, resolveTenant, setTenantLookup, slugSchema } from "./tenant";
import { runWithTenant, getTenantSchema } from "./tenant-context";

describe("slugSchema", () => {
  it("chấp nhận slug hợp lệ, chặn public/platform/special char", () => {
    expect(slugSchema.safeParse("shopa").success).toBe(true);
    expect(slugSchema.safeParse("shop_1").success).toBe(true);
    expect(slugSchema.safeParse("public").success).toBe(false);
    expect(slugSchema.safeParse("platform").success).toBe(false);
    expect(slugSchema.safeParse("ShopA").success).toBe(false);
    expect(slugSchema.safeParse("1shop").success).toBe(false);
    expect(slugSchema.safeParse("shop-a").success).toBe(false);
    expect(slugSchema.safeParse("").success).toBe(false);
  });
});

describe("parseHost", () => {
  it("bỏ port, lowercase", () => {
    expect(parseHost("ShopA.vn:3000")).toBe("shopa.vn");
    expect(parseHost("localhost:3000")).toBe("localhost");
    expect(parseHost("shopa.localhost")).toBe("shopa.localhost");
  });
});

describe("resolveTenant", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("host không tồn tại → null (không rơi vào public)", async () => {
    setTenantLookup(async () => null);
    expect(await resolveTenant("khong-ton-tai.vn")).toBeNull();
  });

  it("host khớp → trả slug, cache 60s (lookup gọi 1 lần)", async () => {
    const lookup = vi.fn(async (host: string) =>
      host === "shopa.vn" ? { slug: "shopa", name: "Shop A" } : null,
    );
    setTenantLookup(lookup);
    expect(await resolveTenant("shopa.vn")).toEqual({ slug: "shopa", name: "Shop A" });
    expect(await resolveTenant("shopa.vn")).toEqual({ slug: "shopa", name: "Shop A" });
    expect(lookup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await resolveTenant("shopa.vn");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("localhost → DEFAULT_TENANT (fallback public), không gọi lookup", async () => {
    const prev = process.env.DEFAULT_TENANT;
    process.env.DEFAULT_TENANT = "public";
    const lookup = vi.fn(async () => null);
    setTenantLookup(lookup);
    expect(await resolveTenant("localhost")).toEqual({ slug: "public", name: "Default" });
    expect(lookup).not.toHaveBeenCalled();
    process.env.DEFAULT_TENANT = prev;
  });
});

describe("tenant-context", () => {
  it("default public; runWithTenant set trong scope async rồi thoát", async () => {
    expect(getTenantSchema()).toBe("public");
    const inside = await runWithTenant("shopa", async () => getTenantSchema());
    expect(inside).toBe("shopa");
    expect(getTenantSchema()).toBe("public");
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/server/tenant-context.ts`:
```ts
import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { schema: string };
const store = new AsyncLocalStorage<Ctx>();

export function runWithTenant<T>(schema: string, fn: () => T): T {
  return store.run({ schema }, fn);
}

export function getTenantSchema(): string {
  return store.getStore()?.schema ?? "public";
}
```

`src/server/tenant.ts`:
```ts
import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,30}$/, "slug tenant sai định dạng")
  .refine((s) => s !== "public" && s !== "platform", "slug dành riêng");

export type TenantInfo = { slug: string; name: string };

export function parseHost(host: string): string {
  return host.split(":")[0].toLowerCase();
}

type Lookup = (host: string) => Promise<TenantInfo | null>;
let lookup: Lookup = async () => null;
const cache = new Map<string, { value: TenantInfo | null; exp: number }>();
const TTL = 60_000;

export function setTenantLookup(fn: Lookup) {
  lookup = fn;
  cache.clear();
}

function isLocal(h: string): boolean {
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}

export async function resolveTenant(host: string): Promise<TenantInfo | null> {
  const h = parseHost(host);
  if (isLocal(h)) {
    return { slug: process.env.DEFAULT_TENANT || "public", name: "Default" };
  }
  const hit = cache.get(h);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await lookup(h);
  cache.set(h, { value, exp: Date.now() + TTL });
  return value;
}
```

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/tenant.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/server/tenant.ts src/server/tenant-context.ts src/server/tenant.test.ts
git commit -m "feat(mt): tenant context ALS + resolveTenant host→slug (TDD)"
```

---

### Task 3: Prisma platform models + platform client

**Files:**
- Modify: `prisma/schema.prisma` (cuối file — 3 model)
- Create: `src/server/platform-db.ts`, `src/server/platform.test.ts`

**Interfaces:**
- Produces:
  - Models: `Tenant { id, slug @unique, name, active, createdAt, domains[] }`, `TenantDomain { id, host @unique, tenantId, tenant }`, `PlatformAdmin { id, email @unique, passwordHash, createdAt }`
  - `platformDb: PrismaClient` — URL `PLATFORM_DATABASE_URL` (fallback `DATABASE_URL` set `?schema=platform`)
  - `createTenant({ slug, name, hosts }): Promise<Tenant>` — transaction, validate slug/host, chặn domain trùng
  - `findTenantByHost(host): Promise<TenantInfo | null>` — null nếu không thấy / `!active`
- Consumes: `slugSchema`, `parseHost`, `TenantInfo` (Task 2)

- [ ] **Step 1: Failing test**

`src/server/platform.test.ts`:
```ts
import { afterAll, describe, expect, it } from "vitest";
import { platformDb, createTenant, findTenantByHost } from "./platform-db";
import { slugSchema } from "./tenant";

const slug = `t${Date.now()}`;

describe("platform tenant", () => {
  it("create + findTenantByHost; slug sai bị chặn", async () => {
    const t = await createTenant({
      slug,
      name: "Test Shop",
      hosts: [`${slug}.test.vn`, `www.${slug}.test.vn`],
    });
    expect(t.slug).toBe(slug);
    expect(slugSchema.safeParse(slug).success).toBe(true);

    expect((await findTenantByHost(`${slug}.test.vn`))?.slug).toBe(slug);
    expect(await findTenantByHost("khong-co.test.vn")).toBeNull();

    await expect(createTenant({ slug: "public", name: "X", hosts: ["public.vn"] })).rejects.toThrow();
    await expect(createTenant({ slug: `${slug}_bad`, name: "X", hosts: ["bad.vn"] })).rejects.toThrow();
    // domain đã gán → reject
    await expect(
      createTenant({ slug: `${slug}_x`, name: "Y", hosts: [`${slug}.test.vn`] }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await platformDb.tenantDomain.deleteMany({ where: { tenant: { slug: { startsWith: slug } } } });
    await platformDb.tenant.deleteMany({ where: { slug: { startsWith: slug } } });
    await platformDb.$disconnect();
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/platform.test.ts` → FAIL (module not found / schema chưa có model).

- [ ] **Step 3: Schema + migrate**

Cuối `prisma/schema.prisma`:
```prisma
model Tenant {
  id        String         @id @default(cuid())
  slug      String         @unique
  name      String
  active    Boolean        @default(true)
  createdAt DateTime       @default(now())
  domains   TenantDomain[]
}

model TenantDomain {
  id       String  @id @default(cuid())
  host     String  @unique
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@index([tenantId])
}

model PlatformAdmin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

```bash
npx prisma migrate dev --name platform_models
npx prisma generate
```

- [ ] **Step 4: Implement platform-db**

`src/server/platform-db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import { parseHost, slugSchema, type TenantInfo } from "./tenant";

function platformUrl(): string {
  const base = process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Thiếu DATABASE_URL");
  const u = new URL(base);
  u.searchParams.set("schema", "platform");
  return u.toString();
}

export const platformDb = new PrismaClient({
  datasources: { db: { url: platformUrl() } },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export async function createTenant(input: { slug: string; name: string; hosts: string[] }) {
  const parsed = slugSchema.safeParse(input.slug);
  if (!parsed.success) throw new Error("Slug tenant không hợp lệ (chặn public/platform)");
  if (!input.name.trim()) throw new Error("Tên tenant bắt buộc");
  const hosts = input.hosts.map(parseHost).filter(Boolean);
  if (!hosts.length) throw new Error("Cần ít nhất 1 domain");
  return platformDb.$transaction(async (tx) => {
    for (const h of hosts) {
      if (await tx.tenantDomain.findUnique({ where: { host: h } })) {
        throw new Error(`Domain đã gán: ${h}`);
      }
    }
    return tx.tenant.create({
      data: {
        slug: parsed.data,
        name: input.name.trim(),
        domains: { create: hosts.map((host) => ({ host })) },
      },
      include: { domains: true },
    });
  });
}

export async function findTenantByHost(host: string): Promise<TenantInfo | null> {
  const row = await platformDb.tenantDomain.findUnique({
    where: { host: parseHost(host) },
    include: { tenant: true },
  });
  if (!row || !row.tenant.active) return null;
  return { slug: row.tenant.slug, name: row.tenant.name };
}
```

> **Bootstrap schema platform:** `?schema=platform` không tự `CREATE SCHEMA`. Step 5 chạy psql + migrate deploy vào platform (script Task 10 bọc lại).

- [ ] **Step 5: Bootstrap platform schema + GREEN**

```bash
BASE="$(node -e 'const fs=require("fs");const m=fs.readFileSync(".env","utf8").match(/DATABASE_URL="([^"]+)/);const u=new URL(m[1]);u.search="";console.log(u)")"
psql "$BASE" -c 'CREATE SCHEMA IF NOT EXISTS platform;'
DATABASE_URL="$BASE?schema=platform" npx prisma migrate deploy
npx vitest run src/server/platform.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/server/platform-db.ts src/server/platform.test.ts
git commit -m "feat(mt): platform models (Tenant/TenantDomain/PlatformAdmin) + createTenant/findTenantByHost (TDD)"
```

---

### Task 4: Prisma Proxy theo schema (H1 core) — isolation T3

**Files:**
- Modify: `src/server/db.ts` (11 dòng → ~40)
- Create: `src/server/tenant-isolation.test.ts`, `src/server/test-schema.ts`
- Modify: `src/server/tenant.ts` (export `wireTenantLookup`), `src/app/layout.tsx` (gọi wire — layout sửa đầy đủ Task 7; task này chỉ export)

**Interfaces:**
- Consumes: `getTenantSchema()` (Task 2), `findTenantByHost` (Task 3)
- Produces:
  - `export const prisma: PrismaClient` — Proxy resolve theo ALS (call site `import { prisma }` **không đổi**)
  - `export function getClientForSchema(schema: string): PrismaClient` — cache Map
  - `wireTenantLookup(): void` — `setTenantLookup(findTenantByHost)`
  - `src/server/test-schema.ts`: `baseDbUrl()`, `ensureSchema(slug)`, `dropSchema(slug)` (Task 6/8 import lại)

- [ ] **Step 1: Failing test isolation**

`src/server/test-schema.ts`:
```ts
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export function baseDbUrl(): string {
  const u = new URL(process.env.DATABASE_URL!);
  u.search = "";
  return u.toString();
}

function rootClient(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: baseDbUrl() } } });
}

export async function ensureSchema(slug: string) {
  const root = rootClient();
  await root.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${slug}"`);
  await root.$disconnect();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `${baseDbUrl()}?schema=${slug}` },
    stdio: "pipe",
  });
}

export async function dropSchema(slug: string) {
  const root = rootClient();
  await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${slug}" CASCADE`);
  await root.$disconnect();
}
```

`src/server/tenant-isolation.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getClientForSchema, prisma } from "./db";
import { ensureSchema, dropSchema } from "./test-schema";
import { runWithTenant } from "./tenant-context";

const A = `iso_a_${Date.now()}`;
const B = `iso_b_${Date.now()}`;

describe("isolation 2 schema (T3)", () => {
  beforeAll(async () => {
    await ensureSchema(A);
    await ensureSchema(B);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(A);
    await dropSchema(B);
  }, 60_000);

  it("insert ở A không thấy ở B, lặp 20 lần (pool reuse không leak)", async () => {
    const ca = getClientForSchema(A);
    const cb = getClientForSchema(B);
    for (let i = 0; i < 20; i++) {
      const email = `iso${i}.${Date.now()}@iso.test`;
      await ca.user.create({ data: { email, name: "A", passwordHash: "x" } });
      expect(await cb.user.findUnique({ where: { email } })).toBeNull();
      expect(await ca.user.findUnique({ where: { email } })).not.toBeNull();
      await ca.user.delete({ where: { email } });
    }
  }, 60_000);

  it("ALS context chọn đúng client qua prisma proxy", async () => {
    const email = `proxy.${Date.now()}@iso.test`;
    await runWithTenant(A, () => prisma.user.create({ data: { email, name: "P", passwordHash: "x" } }));
    expect(await runWithTenant(B, () => prisma.user.findUnique({ where: { email } }))).toBeNull();
    expect(await runWithTenant(A, () => prisma.user.findUnique({ where: { email } }))).not.toBeNull();
    await runWithTenant(A, () => prisma.user.delete({ where: { email } }));
  }, 30_000);
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant-isolation.test.ts`
Expected: FAIL — `getClientForSchema` chưa tồn tại.

- [ ] **Step 3: Implement db.ts Proxy**

`src/server/db.ts` (thay toàn bộ):
```ts
import { PrismaClient } from "@prisma/client";
import { getTenantSchema } from "./tenant-context";

const globalForPrisma = globalThis as unknown as { prismaClients?: Map<string, PrismaClient> };

function baseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Thiếu DATABASE_URL");
  const u = new URL(raw);
  u.search = "";
  return u.toString();
}

export function getClientForSchema(schema: string): PrismaClient {
  const map = globalForPrisma.prismaClients ?? new Map();
  globalForPrisma.prismaClients = map;
  let c = map.get(schema);
  if (!c) {
    c = new PrismaClient({
      datasources: { db: { url: `${baseUrl()}?schema=${encodeURIComponent(schema)}` } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    map.set(schema, c);
  }
  return c;
}

function currentClient(): PrismaClient {
  return getClientForSchema(getTenantSchema());
}

// Proxy giữ nguyên call site `prisma.model.op()` — resolve client theo ALS schema hiện tại.
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
```

`src/server/tenant.ts` thêm (cuối file):
```ts
import { findTenantByHost } from "./platform-db";

export function wireTenantLookup() {
  setTenantLookup(findTenantByHost);
}
```
(Lưu ý import cycle: `tenant.ts` → `platform-db.ts` → `tenant.ts` — chỉ import type + function, runtime OK với ES module; nếu vitest báo cycle, chuyển `wireTenantLookup` sang `platform-db.ts`.)

- [ ] **Step 4: GREEN**

```bash
npx prisma generate
npx vitest run src/server/tenant-isolation.test.ts
```
Expected: PASS (beforeAll migrate ~1–2 phút lần đầu).

- [ ] **Step 5: Full suite không regression**

Run: `npx vitest run`
Expected: 82 cũ + tenant/platform/isolation mới — **0 fail**.

- [ ] **Step 6: Commit**

```bash
git add src/server/db.ts src/server/tenant-isolation.test.ts src/server/test-schema.ts src/server/tenant.ts
git commit -m "feat(mt): Prisma client per-schema qua ALS proxy + isolation test T3"
```

---

### Task 5: Session JWT mang tenantSlug — T4

**Files:**
- Modify: `src/server/session.ts` (sign/read + `sessionMatchesTenant`)
- Modify: `src/server/auth.ts` (`getSession` check; `loginUser`/`registerUser` set claim)
- Create: `src/server/tenant-auth.test.ts`

**Interfaces:**
- Consumes: `getTenantSchema()` (Task 2)
- Produces:
  - JWT claim `t` → `SessionPayload.tenantSlug?: string`
  - `sessionMatchesTenant(s, currentSlug): boolean` — thiếu claim (token cũ deploy) → `true`; lệch → `false`
  - `getSession()`: verify claim với `getTenantSchema()` **trước** load DB → null nếu lệch
  - Login/register set `tenantSlug: getTenantSchema()`

- [ ] **Step 1: Failing test**

`src/server/tenant-auth.test.ts` (pure predicate + roundtrip, không cần DB):
```ts
import { describe, expect, it } from "vitest";
import { readSessionToken, sessionMatchesTenant, signSession } from "./session";

describe("session tenant claim (T4)", () => {
  it("sign/read roundtrip giữ tenantSlug", async () => {
    const token = await signSession({
      id: "u1", name: "A", email: "a@x.vn", role: "customer",
      tokenVersion: 0, tenantSlug: "shopa",
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBe("shopa");
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(false);
    expect(sessionMatchesTenant(payload!, "shopa")).toBe(true);
  });

  it("session cũ không claim → chấp nhận (backward compat deploy)", async () => {
    const token = await signSession({
      id: "u2", name: "B", email: "b@x.vn", role: "customer", tokenVersion: 0,
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBeUndefined();
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(true);
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant-auth.test.ts` → FAIL (`tenantSlug` undefined / `sessionMatchesTenant` chưa export).

- [ ] **Step 3: Implement**

`src/server/session.ts`:
```ts
export type SessionPayload = UserSession & {
  id: string;
  tokenVersion?: number;
  tenantSlug?: string;
};

export async function signSession(user: SessionPayload) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tv: user.tokenVersion ?? 0,
    ...(user.tenantSlug ? { t: user.tenantSlug } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.email || !payload.role || !payload.id) return null;
    return {
      id: String(payload.id),
      name: String(payload.name || ""),
      email: String(payload.email),
      role: payload.role === "admin" ? "admin" : "customer",
      tokenVersion: Number(payload.tv || 0),
      tenantSlug: payload.t ? String(payload.t) : undefined,
    };
  } catch {
    return null;
  }
}

/** Session hợp lệ với tenant hiện tại? Thiếu claim (token cũ) → true. */
export function sessionMatchesTenant(s: SessionPayload, currentSlug: string): boolean {
  if (!s.tenantSlug) return true;
  return s.tenantSlug === currentSlug;
}
```

`src/server/auth.ts` — trong `getSession`, sau khi `readSessionToken` thành công, **trước** load DB:
```ts
import { getTenantSchema } from "@/server/tenant-context";
import { sessionMatchesTenant } from "@/server/session";

if (!sessionMatchesTenant(session, getTenantSchema())) return null;
```

`loginUser` + `registerUser` — thêm `tenantSlug: getTenantSchema()` vào object `session` trước `setSessionCookie`.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/tenant-auth.test.ts src/server/session-revoke.test.ts`
Expected: cả 2 PASS (session-revoke chạy context `public`, claim optional không break).

- [ ] **Step 5: Full suite + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/server/session.ts src/server/auth.ts src/server/tenant-auth.test.ts
git commit -m "feat(mt): JWT claim tenantSlug + getSession verify theo Host (T4)"
```

---

### Task 6: Settings cache theo tenant — T7

**Files:**
- Modify: `src/server/settings.ts:114-164` (`loadOverrides`/`saveSiteSettings`)
- Create: `src/server/tenant-settings.test.ts`

**Interfaces:**
- Consumes: `getTenantSchema`/`runWithTenant` (Task 2), `ensureSchema`/`dropSchema` (Task 4)
- Produces: loader per-schema với cache key `["site-setting-rows", schema]`, tag `` `${SETTINGS_TAG}:${schema}` ``; `saveSiteSettings` revalidate tag theo schema hiện tại.

- [ ] **Step 1: Failing test**

`src/server/tenant-settings.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "./tenant-context";
import { saveSiteSettings, getEffectiveSiteConfig } from "./settings";
import { ensureSchema, dropSchema } from "./test-schema";

const S1 = `set_a_${Date.now()}`;
const S2 = `set_b_${Date.now()}`;

describe("settings per-tenant (T7)", () => {
  beforeAll(async () => {
    await ensureSchema(S1);
    await ensureSchema(S2);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(S1);
    await dropSchema(S2);
  }, 60_000);

  it("brand shop A ≠ shop B, không lẫn cache", async () => {
    await runWithTenant(S1, () => saveSiteSettings({ brand: { name: "Shop AAA" } }));
    await runWithTenant(S2, () => saveSiteSettings({ brand: { name: "Shop BBB" } }));
    const a = await runWithTenant(S1, () => getEffectiveSiteConfig());
    const b = await runWithTenant(S2, () => getEffectiveSiteConfig());
    expect(a.brand.name).toBe("Shop AAA");
    expect(b.brand.name).toBe("Shop BBB");
    // Cache hit vẫn đúng
    const a2 = await runWithTenant(S1, () => getEffectiveSiteConfig());
    expect(a2.brand.name).toBe("Shop AAA");
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant-settings.test.ts`
Expected: FAIL — brand lẫn (cache key toàn cục) hoặc throw.

- [ ] **Step 3: Implement settings cache theo schema**

`src/server/settings.ts` — thay `loadOverrides` + `getSiteOverrides` + sửa `saveSiteSettings`:
```ts
import { getTenantSchema, runWithTenant } from "@/server/tenant-context";

const makeLoader = (schema: string) =>
  unstable_cache(
    async (): Promise<SiteOverrides> =>
      // runWithTenant: unstable_cache re-invoke ngoài request context vẫn query đúng schema
      runWithTenant(schema, async () => {
        const rows = await prisma.siteSetting.findMany();
        const out: SiteOverrides = {};
        for (const r of rows) {
          const v = safeParse(r.value);
          if (v === undefined) continue;
          if (["brand", "theme", "shipping", "features", "currency", "announcement", "consent"].includes(r.key)) {
            (out as Record<string, unknown>)[r.key] = v;
          }
        }
        return out;
      }),
    ["site-setting-rows", schema],
    { tags: [`${SETTINGS_TAG}:${schema}`] },
  );

const loaders = new Map<string, ReturnType<typeof makeLoader>>();

export async function getSiteOverrides(): Promise<SiteOverrides> {
  const schema = getTenantSchema();
  let l = loaders.get(schema);
  if (!l) {
    l = makeLoader(schema);
    loaders.set(schema, l);
  }
  try {
    return await l();
  } catch {
    return {};
  }
}
```

`saveSiteSettings` cuối hàm: `revalidateTag(`${SETTINGS_TAG}:${getTenantSchema()}`, "max")` thay `revalidateTag(SETTINGS_TAG, "max")`.

> **Bẫy Review Focus #4:** loader closure query qua `prisma` (ALS) — khi `unstable_cache` re-invoke **ngoài** ALS, `getTenantSchema()` về `public` → wrap thân bằng `runWithTenant(schema, …)` như trên.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/tenant-settings.test.ts src/server/settings.test.ts`
Expected: PASS cả 2.

- [ ] **Step 5: Commit**

```bash
git add src/server/settings.ts src/server/tenant-settings.test.ts
git commit -m "feat(mt): SiteSetting cache/tag theo tenant — brand không lẫn (T7)"
```

---

### Task 7: Root layout resolve host + mail link theo Host — Review Focus #1

**Files:**
- Modify: `src/app/layout.tsx` (wire lookup + 404 host lạ production)
- Modify: `src/server/tenant.ts` (thêm `resolveBaseUrl`)
- Modify: `src/server/auth.ts:171` (password reset base URL theo Host)
- Modify: `src/server/tenant.test.ts` (test `resolveBaseUrl`)
- Modify: `src/proxy.ts` — **không** đổi (Edge không DB; 404 Node-side)

**Interfaces:**
- Consumes: `wireTenantLookup`, `resolveTenant` (Task 2/4)
- Produces: `resolveBaseUrl(host: string | null): string` — host → `http(s)://host` (prod https, dev http); null → `APP_URL` fallback `http://localhost:3000`.

- [ ] **Step 1: Failing test**

Thêm vào `src/server/tenant.test.ts`:
```ts
describe("resolveBaseUrl", () => {
  it("host → base theo env; null → APP_URL fallback", async () => {
    const { resolveBaseUrl } = await import("./tenant");
    const prevNode = process.env.NODE_ENV;
    const prevApp = process.env.APP_URL;
    process.env.APP_URL = "http://fallback.vn";
    // test dev (NODE_ENV trong vitest = test)
    expect(resolveBaseUrl("shopa.vn")).toBe("http://shopa.vn");
    expect(resolveBaseUrl("shopa.vn:3000")).toBe("http://shopa.vn");
    expect(resolveBaseUrl(null)).toBe("http://fallback.vn");
    process.env.NODE_ENV = prevNode;
    process.env.APP_URL = prevApp;
  });
});
```
*(ghi chú: sửa test nếu vitest NODE_ENV là `test` — nhánh `production` test riêng bằng set env rồi restore.)*

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant.test.ts` → FAIL (`resolveBaseUrl` chưa export).

- [ ] **Step 3: Implement**

`src/server/tenant.ts` thêm:
```ts
export function resolveBaseUrl(host: string | null): string {
  if (host) {
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${parseHost(host)}`;
  }
  return process.env.APP_URL || "http://localhost:3000";
}
```

`src/server/auth.ts` `requestPasswordReset` — thay `const base = process.env.APP_URL || ...`:
```ts
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/server/tenant";

let host: string | null = null;
try {
  host = (await headers()).get("host");
} catch {
  /* ngoài request context (script/test) → fallback APP_URL */
}
const base = resolveBaseUrl(host);
```

`src/app/layout.tsx` (root, đầu hàm server component):
```ts
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveTenant, wireTenantLookup } from "@/server/tenant";

// trong component (async):
wireTenantLookup(); // idempotent — set lookup 1 lần module
const host = (await headers()).get("host") || "";
const tenant = await resolveTenant(host);
// localhost → luôn Default; production host lạ → null → 404 (Review Focus #1)
if (!tenant && process.env.NODE_ENV === "production") notFound();
```

> **Scope刻意 nhỏ:** chỉ đổi `auth.ts` (mail link click thật) + layout. Payment `APP_URL` (vnpay/momo/sitemap/robots) **giữ nguyên** — ghi DEPLOY.md: "mỗi tenant bật payment cần APP_URL riêng → phase sau resolve Host lúc tạo payment" (YAGNI mở rộng Task này).

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/tenant.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Full verify + commit**

```bash
npx vitest run && npm run lint && npm run build
git add src/app/layout.tsx src/server/tenant.ts src/server/auth.ts src/server/tenant.test.ts
git commit -m "feat(mt): resolve host ở root layout (404 host lạ) + mail link theo Host"
```

---

### Task 8: Cron/webhook wrap tenant — Review Focus #5

**Files:**
- Modify: `src/app/api/cron/retention/route.ts`, cron abandoned (glob tìm file), IPN routes (momo/vnpay/sepay `handle*Ipn` callers)
- Create: `src/server/tenant-cron.test.ts`
- Modify: `src/server/tenant.ts` (thêm `withDefaultTenant`)

**Interfaces:**
- Consumes: `runWithTenant`, `DEFAULT_TENANT`, `resolveTenant`
- Produces: `withDefaultTenant<T>(fn: () => T): T` = `runWithTenant(DEFAULT_TENANT || "public", fn)`; cron route wrap toàn bộ handler; IPN wrap `resolveTenant(host)` → `runWithTenant(slug, …)` fallback default khi null.

- [ ] **Step 1: Failing test**

`src/server/tenant-cron.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { runWithTenant } from "./tenant-context";
import { getClientForSchema } from "./db";
import { ensureSchema, dropSchema } from "./test-schema";
import { runRetentionPurge } from "./retention";
import { withDefaultTenant } from "./tenant";

const S = `cron_${Date.now()}`;

describe("cron under tenant context (T5)", () => {
  it("retention purge chạy đúng schema", async () => {
    await ensureSchema(S);
    try {
      const client = getClientForSchema(S);
      const u = await client.user.create({
        data: { email: `cron${Date.now()}@t.vn`, name: "C", passwordHash: "x" },
      });
      await client.passwordReset.create({
        data: {
          userId: u.id,
          tokenHash: "h",
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(Date.now() - 8 * 86400_000),
        },
      });
      const result = await runWithTenant(S, () => runRetentionPurge());
      expect(result.passwordResets).toBeGreaterThanOrEqual(1);
      expect(await client.passwordReset.count({ where: { userId: u.id } })).toBe(0);
      await client.user.delete({ where: { id: u.id } });
    } finally {
      await dropSchema(S);
    }
  }, 180_000);

  it("cron retention route wrap withDefaultTenant (đọc source)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/app/api/cron/retention/route.ts", "utf8");
    expect(src).toContain("withDefaultTenant");
  });

  it("withDefaultTenant chạy fn trong schema DEFAULT_TENANT/public", async () => {
    const prev = process.env.DEFAULT_TENANT;
    process.env.DEFAULT_TENANT = "public";
    const { getTenantSchema } = await import("./tenant-context");
    expect(withDefaultTenant(() => getTenantSchema())).toBe("public");
    process.env.DEFAULT_TENANT = prev;
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/tenant-cron.test.ts`
Expected: FAIL — `withDefaultTenant` chưa export; route chưa chứa (test 2/3).

- [ ] **Step 3: Implement**

`src/server/tenant.ts` thêm:
```ts
import { runWithTenant } from "./tenant-context";

export function withDefaultTenant<T>(fn: () => T): T {
  return runWithTenant(process.env.DEFAULT_TENANT || "public", fn);
}
```

`src/app/api/cron/retention/route.ts` — wrap call:
```ts
const { runRetentionPurge } = await import("@/server/retention");
const { withDefaultTenant } = await import("@/server/tenant");
const result = await withDefaultTenant(() => runRetentionPurge());
```

Tương tự cron abandoned-cart (glob `src/app/api/cron/**/route.ts` — wrap mọi route cron có truy vấn DB).

IPN routes (`src/app/api/payments/*/ipn/route.ts`, sepay webhook): wrap resolve theo Host:
```ts
const { resolveTenant, runWithTenant } = await import(...); // tenant + tenant-context
// hoặc import static
const host = req.headers.get("host") || "";
const tenant = await resolveTenant(host).catch(() => null);
const run = <T,>(fn: () => T) =>
  tenant ? runWithTenant(tenant.slug, fn) : withDefaultTenant(fn);
const result = await run(() => handleIpn(...)); // nội dung handler giữ nguyên
```

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/tenant-cron.test.ts src/server/retention.test.ts src/server/webhooks.test.ts`
Expected: PASS cả 3.

- [ ] **Step 5: Commit**

```bash
git add src/server/tenant.ts src/server/tenant-cron.test.ts src/app/api/cron src/app/api/payments
git commit -m "feat(mt): cron/IPN wrap tenant context — purge đúng schema (T5)"
```

---

### Task 9: Platform admin (`/platform`) + super-admin auth

**Files:**
- Create: `src/server/platform-auth.ts`, `src/server/platform-auth.test.ts`
- Create: `src/app/platform/page.tsx`, `src/app/platform/dang-nhap/page.tsx`
- Create: `src/app/api/platform/login/route.ts`, `src/app/api/platform/tenants/route.ts`
- Create: `scripts/create-platform-admin.ts`
- Modify: `src/proxy.ts` (gate `/platform`)

**Interfaces:**
- Consumes: `createTenant` (Task 3), `platformDb`
- Produces:
  - `PLATFORM_COOKIE = "ek_platform"`
  - `signPlatformSession({ id, email })` / `readPlatformSession(token)` — claim `role: "platform"`; token role `customer`/`admin` → `null`
  - `requirePlatformAdmin()` — cookie → JWT → load `PlatformAdmin` từ `platformDb`
  - `POST /api/platform/login` `{ email, password }` → set cookie
  - `POST /api/platform/tenants` `{ slug, name, hosts[] }` → 401 nếu thiếu session; gọi `createTenant`
  - UI: copy pattern form client từ `src/app/admin/cai-dat/page.tsx` + POST route pattern từ `src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Failing test**

`src/server/platform-auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readPlatformSession, signPlatformSession } from "./platform-auth";

describe("platform session", () => {
  it("sign/read roundtrip role platform", async () => {
    const tok = await signPlatformSession({ id: "pa1", email: "root@kit.vn" });
    expect(await readPlatformSession(tok)).toMatchObject({
      id: "pa1",
      email: "root@kit.vn",
      role: "platform",
    });
  });

  it("token customer role bị từ chối", async () => {
    const { signSession } = await import("./session");
    const customerTok = await signSession({
      id: "u", name: "U", email: "u@x.vn", role: "customer", tokenVersion: 0,
    });
    expect(await readPlatformSession(customerTok)).toBeNull();
    expect(await readPlatformSession(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/platform-auth.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/server/platform-auth.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";

export const PLATFORM_COOKIE = "ek_platform";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw === "dev-only-change-me" || raw === "doi-thanh-chuoi-ngau-nhien-khi-clone") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET bắt buộc trên production");
    }
  }
  return new TextEncoder().encode(raw || "dev-only-change-me");
}

export async function signPlatformSession(a: { id: string; email: string }) {
  return new SignJWT({ id: a.id, email: a.email, role: "platform" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readPlatformSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "platform" || !payload.id) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      role: "platform" as const,
    };
  } catch {
    return null;
  }
}
```

`requirePlatformAdmin()` ( cùng file hoặc `platform.ts` ): đọc cookie `PLATFORM_COOKIE` qua `next/headers`, `readPlatformSession`, load `platformDb.platformAdmin.findUnique({ where: { id } })` → trả admin hoặc null.

`src/proxy.ts` — thêm nhánh **trước** `/admin` gate (jose chạy Edge OK):
```ts
import { PLATFORM_COOKIE, readPlatformSession } from "@/server/platform-auth";

if (req.nextUrl.pathname.startsWith("/platform")) {
  const tok = req.cookies.get(PLATFORM_COOKIE)?.value;
  const s = await readPlatformSession(tok);
  if (!s && req.nextUrl.pathname !== "/platform/dang-nhap") {
    const url = req.nextUrl.clone();
    url.pathname = "/platform/dang-nhap";
    return securityHeaders(NextResponse.redirect(url));
  }
}
```

Login route `POST /api/platform/login`: bcryptjs compare với `platformDb.platformAdmin` → `cookies().set(PLATFORM_COOKIE, token, { httpOnly, sameSite: "lax", path: "/", secure: prod, maxAge: 12h })`.

`scripts/create-platform-admin.ts`:
```ts
import bcrypt from "bcryptjs";
import { platformDb } from "../src/server/platform-db";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Usage: tsx scripts/create-platform-admin.ts <email> <password≥8>");
  process.exit(1);
}
await platformDb.platformAdmin.upsert({
  where: { email },
  create: { email, passwordHash: await bcrypt.hash(password, 10) },
  update: { passwordHash: await bcrypt.hash(password, 10) },
});
console.log("OK platform admin:", email);
await platformDb.$disconnect();
```

UI:
- `src/app/platform/dang-nhap/page.tsx` — client form POST `/api/platform/login` (pattern `dang-nhap` page hiện có).
- `src/app/platform/page.tsx` — server component: `requirePlatformAdmin()` → redirect nếu null; list `platformDb.tenant.findMany({ include: { domains: true } })`; form client nhỏ POST `/api/platform/tenants` `{ slug, name, hosts }` (pattern fetch `admin/cai-dat`).
- `src/app/api/platform/tenants/route.ts` — POST: `requirePlatformAdmin()` → `createTenant` → JSON `{ ok, tenant }`; GET: list tenants.

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/platform-auth.test.ts src/server/platform.test.ts`
Expected: PASS.

- [ ] **Step 5: Tạo platform admin local + smoke tay**

```bash
npx tsx scripts/create-platform-admin.ts root@local.dev 'matkhau-manh-1'
# npm run dev → curl login:
curl -s -X POST http://localhost:3000/api/platform/login \
  -H 'content-type: application/json' \
  -d '{"email":"root@local.dev","password":"matkhau-manh-1"}' -c /tmp/p.cookie
curl -s -b /tmp/p.cookie http://localhost:3000/api/platform/tenants | head -c 200
```
Expected: login 200 + list tenants JSON.

- [ ] **Step 6: Commit**

```bash
git add src/server/platform-auth.ts src/server/platform-auth.test.ts \
  src/app/platform src/app/api/platform src/proxy.ts scripts/create-platform-admin.ts
git commit -m "feat(mt): /platform super-admin (login, list, create tenant) (T6)"
```

---

### Task 10: Script create-tenant + migrate-all-schemas — T5 idempotent

**Files:**
- Create: `scripts/create-tenant.ts`, `scripts/migrate-all-schemas.ts`, `scripts/migrate-schema.sh` (chmod +x)
- Create: `src/server/migrate-all.test.ts`
- Modify: `package.json` scripts

**Interfaces:**
- Consumes: `createTenant` (Task 3), `slugSchema`, `ensureSchema` pattern (Task 4 — script standalone tự `CREATE SCHEMA` + `migrate deploy`)
- Produces:
  - `npm run tenant:create -- <slug> <ten> <host1,host2>` — platform row → CREATE SCHEMA → migrate deploy schema đó → seed `DATABASE_URL=…?schema=<slug>`
  - `npm run migrate:all` — list active tenants + `public` + `platform` → `prisma migrate deploy` mỗi schema; **chạy 2 lần exit 0**

- [ ] **Step 1: Failing test T5**

`src/server/migrate-all.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("migrate-all-schemas (T5)", () => {
  it("chạy 2 lần liên tiếp đều exit 0 (idempotent)", () => {
    const opts = { stdio: "pipe" as const, timeout: 180_000 };
    expect(() => execSync("npx tsx scripts/migrate-all-schemas.ts", opts)).not.toThrow();
    expect(() => execSync("npx tsx scripts/migrate-all-schemas.ts", opts)).not.toThrow();
  }, 360_000);
});
```

- [ ] **Step 2: RED**

Run: `npx vitest run src/server/migrate-all.test.ts` → FAIL (script chưa tồn tại).

- [ ] **Step 3: Implement scripts**

`scripts/migrate-schema.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
SCHEMA="$1"
BASE="${DATABASE_URL%%\?*}"
DATABASE_URL="$BASE?schema=$SCHEMA" npx prisma migrate deploy
```
(`chmod +x scripts/migrate-schema.sh`)

`scripts/migrate-all-schemas.ts`:
```ts
import { execSync } from "node:child_process";
import { platformDb } from "../src/server/platform-db";

async function main() {
  const tenants = await platformDb.tenant.findMany({
    where: { active: true },
    select: { slug: true },
  });
  const schemas = ["public", "platform", ...tenants.map((t) => t.slug)];
  const base = (process.env.DATABASE_URL || "").split("?")[0];
  for (const s of [...new Set(schemas)]) {
    console.log(`migrate → ${s}`);
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: `${base}?schema=${s}` },
      stdio: "inherit",
    });
  }
  await platformDb.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

`scripts/create-tenant.ts`:
```ts
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createTenant } from "../src/server/platform-db";
import { parseHost } from "../src/server/tenant";

const [slug, name, hostsArg] = process.argv.slice(2);
if (!slug || !name || !hostsArg) {
  console.error("Usage: tsx scripts/create-tenant.ts <slug> <ten> <host1,host2>");
  process.exit(1);
}
const base = (process.env.DATABASE_URL || "").split("?")[0];

async function main() {
  await createTenant({ slug, name, hosts: hostsArg.split(",").map(parseHost) });
  const root = new PrismaClient({ datasources: { db: { url: base } } });
  await root.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${slug}"`);
  await root.$disconnect();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `${base}?schema=${slug}` },
    stdio: "inherit",
  });
  // Seed demo data cho shop mới
  execSync("npx tsx prisma/seed.ts", {
    env: { ...process.env, DATABASE_URL: `${base}?schema=${slug}` },
    stdio: "inherit",
  });
  console.log(`OK tenant ${slug} — domain: ${hostsArg}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

`package.json` scripts thêm:
```json
"tenant:create": "tsx scripts/create-tenant.ts",
"migrate:all": "tsx scripts/migrate-all-schemas.ts",
"platform:admin": "tsx scripts/create-platform-admin.ts"
```

- [ ] **Step 4: GREEN**

Run: `npx vitest run src/server/migrate-all.test.ts`
Expected: PASS (2 lần exit 0).

- [ ] **Step 5: Tạo 2 shop mẫu (V1 acceptance #1/#5)**

```bash
npm run tenant:create -- shopa "Shop A" "shopa.localhost,shopa.vn"
npm run tenant:create -- shopb "Shop B" "shopb.localhost,shopb.vn"
```

Verify tay (dev server đang chạy):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: shopa.localhost" http://localhost:3000/   # 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: shopb.localhost" http://localhost:3000/api/health  # 200
curl -s -H "Host: shopa.localhost" http://localhost:3000/ | grep -o 'Shop A' | head -1
curl -s -H "Host: shopb.localhost" http://localhost:3000/ | grep -o 'Shop B' | head -1
```
Expected: brand 2 shop khác nhau.

- [ ] **Step 6: Commit**

```bash
git add scripts/create-tenant.ts scripts/migrate-all-schemas.ts scripts/migrate-schema.sh \
  src/server/migrate-all.test.ts package.json package-lock.json
git commit -m "feat(mt): create-tenant + migrate-all-schemas idempotent (T5) + seed 2 shop"
```

---

### Task 11: Verification cuối + docs ship

**Files:**
- Modify: `docs/multi-tenant-spec.md` (§10 status DONE, ghi delta payment APP_URL)
- Modify: `DEPLOY.md` (multi-tenant runbook), `AGENTS.md`, `README.md`
- Modify: `scripts/backup.sh` (pg_dump multi-schema), `scripts/smoke.sh` (Host check)

**Interfaces:**
- Consumes: mọi task trước
- Produces: verification battery xanh; `npm run smoke` pass; docs consistent.

- [ ] **Step 1: Full verification battery**

```bash
npx tsc --noEmit
npx vitest run
npm run lint
npm run build
```
Expected: tsc 0; vitest ≥ 82 cũ + ~15 mới, **0 fail**; lint ≤ baseline 12; build OK. Nếu lint tăng → sửa (không thêm `react-hooks` mới).

- [ ] **Step 2: Smoke 2 tenant**

```bash
npm run build && npm start -- --port 3100 &
sleep 5
BASE_URL=http://localhost:3100 ./scripts/smoke.sh
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: shopa.localhost" http://localhost:3100/api/health  # 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: khong-co.vn" http://localhost:3100/ # dev: 200 default; production build: 404 (layout Task 7)
```

- [ ] **Step 3: Docs cập nhật**

- `DEPLOY.md` thêm section **Multi-tenant**: CNAME từng shop → server; sau `git pull` chạy `npm run migrate:all`; thêm tenant: `npm run tenant:create …`; backup `pg_dump` **toàn DB** (đủ mọi schema) hoặc loop `--schema=`; note payment callback vẫn `APP_URL` (phase sau).
- `AGENTS.md`: lệnh mới (`tenant:create`, `migrate:all`, `platform:admin`); "DB thật Postgres"; module `platform` không nằm 4 file lõi.
- `docs/multi-tenant-spec.md`: §10 phase → done + delta.
- `README.md`: quickstart multi-tenant 5 dòng.
- `scripts/backup.sh`: đã branch `postgresql://` bằng `pg_dump -Fc` — verify đủ (pg_dump mặc định dump **toàn database** mọi schema); ghi comment.
- `scripts/smoke.sh`: thêm optional check `TENANT_HOST` (curl `-H "Host: $TENANT_HOST" /api/health`).

- [ ] **Step 4: Commit + summary**

```bash
git add docs/multi-tenant-spec.md DEPLOY.md AGENTS.md README.md scripts/backup.sh scripts/smoke.sh
git commit -m "docs(mt): runbook multi-tenant + verification battery xanh"
git log --oneline -12
```

---

## Self-Review (plan tự soát)

1. **Spec coverage:** §2 arch (T2–T5), §3 platform schema (T3), §4 H1 (T4), §4.4 migrate-all (T10), §4.5 seed (T10), §5 auth (T5, T9), §6 settings (T6), §7 risks — pool leak (T4×20), slug injection (T2 blocklist + T3 validate), session share (T5), cache bleed (T6), cron no-host (T8), cutover PG (T1); §8.1–8.3 deltas header. Payment IPN tenant (T8). **Không requirement rơi ngoài.**
2. **Placeholder scan:** mọi step code/lệnh cụ thể; Task 9 UI chỉ định copy pattern `admin/cai-dat` + `api/admin/settings` có sẵn trong repo (không TBD).
3. **Type consistency:** `TenantInfo` T2→T3→T4; `SessionPayload.tenantSlug` T5; `getClientForSchema` T4→T6→T8; `withDefaultTenant<T>(fn: () => T): T` T8; `slugSchema` T2→T3. OK.
4. **Review Focus:** 5 dòng → T2/T7 (unknown host), T4 (pool×20), T5 (session), T6 (cache), T8 (cron route grep + purge). Đủ.
