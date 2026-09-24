# Triển khai (deploy)

## 1. Chạy local (Postgres ek)

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

## 2. Docker — VPS 1 lệnh (Postgres trong compose, volume `ek-pg` persist)

Mặc định `docker compose up` đã gồm **app + Postgres 16** (`db` không còn sau
profile `pg` — provider `postgresql` là bắt buộc sau multi-tenant):

```bash
cp .env.example .env   # sửa AUTH_SECRET, ADMIN_PASSWORD, APP_URL=https://domain; BẮT BUỘC điền POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec app env NODE_ENV=production ALLOW_SEED=1 npx tsx prisma/seed.ts   # lần đầu, DB trống (schema public)
```

> Production **từ chối seed** nếu thiếu `ALLOW_SEED=1` hoặc `ADMIN_PASSWORD`
> còn là `admin123` — seed xóa toàn bộ dữ liệu nên chỉ chạy 1 lần lúc lập DB trống.

DB nằm trong volume `ek-pg`. Update bản mới (mọi schema, gồm cả tenant — xem §10):

```bash
git pull
docker compose up -d --build            # app tự `prisma migrate deploy` lúc start (chỉ schema public)
docker compose exec app npm run migrate:all   # phủ platform + mọi schema tenant
```

`app` ghi đè `DATABASE_URL` trỏ service `db` trong network compose — `.env` trên
host không cần đổi. Muốn app Docker bắt DB ngoài (Neon/…) thì sửa
`DATABASE_URL` trong `docker-compose.yml` hoặc chạy app khác đường (§3).

## 3. Postgres managed (Vercel/Neon/Supabase)

Repo đã mặc định PostgreSQL — mỗi môi trường chỉ cần trỏ `DATABASE_URL`
(`postgresql://…@host:5432/db?schema=public`) rồi migrate + seed:

```bash
# 1. Trỏ DATABASE_URL Postgres (env hoặc .env)
npx prisma migrate deploy        # baseline + các migration sau (schema public)
npm run migrate:all              # phủ platform + mọi schema tenant (xem §10)
npx tsx prisma/seed.ts
```

Postgres local nằm trong compose mặc định (§2) — không cần `--profile pg` nữa.
App Docker + DB managed: sửa `DATABASE_URL` trong `docker-compose.yml` (xem §2).

Vercel: thêm env `DATABASE_URL` (pooling, thêm `?pgbouncer=true` nếu dùng transaction
pooler — lưu ý `migrate deploy` cần direct connection), Build Command giữ mặc định
(`prisma generate && next build` đã có trong `package.json`).

## 4. Cron nhắc giỏ bỏ quên + dọn retention

Vercel: `vercel.json` đã khai báo cron hàng ngày (nhắc giỏ 01:00, retention 03:00),
chỉ cần thêm env `CRON_SECRET` (trùng giá trị gọi đi). VPS: thêm crontab:

```bash
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/abandoned-cart
0 3 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/retention
```

Retention tự xóa `PasswordReset` hết hạn/>7 ngày, redact body mail token sau 24h,
xóa `MailLog` >30 ngày.

## 5. Backup / restore (Q145 — RPO 24h, RTO ~1h)

`scripts/backup.sh` tự branch theo `DATABASE_URL`: `postgresql://` → `pg_dump -Fc`
(file `pg-*.dump`); `file:` → backup SQLite. Mặc định hiện nay là Postgres —
cron nhớ truyền `DATABASE_URL` vào env của script.

```bash
# Backup hàng ngày (cron 02:00 gợi ý — env có DATABASE_URL)
0 2 * * * cd /path/app && BACKUP_DIR=/var/backups/ek ./scripts/backup.sh

# Test restore (BẮT BUỘC ít nhất 1 lần trước launch):
docker compose stop app            # dừng ghi trước khi restore
# bỏ `?schema=…` (Prisma) — libpq/pg_restore từ chối query param lạ, như backup.sh
pg_restore --clean --if-exists -d "${DATABASE_URL%%\?*}" /var/backups/ek/pg-YYYYMMDDHHMMSS.dump
docker compose up -d
curl -s http://localhost:3000/api/health   # { ok: true, db: "up" }
```

- **RPO = 24h** (1 backup/ngày — tăng tần suất nếu dữ liệu đổi nhanh).
- **RTO ≈ 1h** (`pg_restore` + health check).
- **Multi-schema:** `pg_dump -Fc` **mặc định dump toàn database** — đủ mọi
  schema (`public`, `platform`, mọi schema tenant), không cần loop `--schema=`.
  Muốn dump riêng 1 schema thì thêm `-n <schema>` (restore tương ứng `pg_restore`).
- Offsite: symlink/rclone `BACKUP_DIR` sang S3/NAS + mã hóa archive (`gpg -c`).
- Ghi log ngày test restore gần nhất vào mục checklist dưới.

## 6. Rollback (Q133 — &lt;15 phút)

```bash
# 1. Quay code về commit/tag trước
git checkout <PREV_SHA>          # hoặc git checkout v1.2.0
docker compose up -d --build     # migrate deploy lại (up-only — xem lưu ý)

# 2. Nếu schema đã migrate ngược code cũ không chạy được → restore backup
docker compose stop app
./scripts/backup.sh              # snapshot hiện tại phòng hờ
# restore backup mới nhất bằng pg_restore (đọc mục 5)
docker compose up -d
curl -s http://localhost:3000/api/health   # { ok: true, db: "up" }
```

- Giữ **3 image/tag gần nhất** (`docker tag app:prev app:N-1` trước mỗi deploy).
- Migration **up-only**: revert code đủ khi chưa có migration mới; nếu đã chạy
  migration thì cần SQL revert hoặc restore backup — ghi chú trong PR migration.
- Sau rollback: kiểm tra checkout test-local (`npx vitest run`) + health.

## 7. Key rotation (Q20)

| Key | Env | Khi xoay | Ảnh hưởng downtime |
|---|---|---|---|
| AUTH_SECRET | `AUTH_SECRET` | 90 ngày / nghi leak | Mọi session JWT hết hạn → user login lại |
| VNPAY_HASH_SECRET | `VNPAY_*` | theo cổng | Cập nhật IPN secret同步 trên cổng VNPay |
| MOMO_SECRET_KEY | `MOMO_*` | theo cổng | IPN fail tạm直到 cập nhật xong |
| SEPAY_API_KEY | `SEPAY_*` | theo bank | Webhook sepay fail tạm |
| GHN_TOKEN | `GHN_*` | theo GHN | Tạo vận đơn lỗi → dùng mã code |
| SMTP_PASS | `SMTP_*` | 90 ngày | Mail fail (vẫn ghi MailLog failed) |
| CRON_SECRET | `CRON_SECRET` | 90 ngày | Cron 401 → cập nhật crontab/vercel |
| Webhook out secret | DB `Webhook` | khi leak | Endpoint khách 401 → cấp lại UI admin |

Quy trình: sinh giá trị mới → cập nhật env + cổng bên ngoài → restart
(`docker compose up -d`) → smoke test (`./scripts/smoke.sh`). Lưu谁 giữ vault (1Password/…)
trong checklist team — **không commit key**.

## 8. Ma trận env bắt buộc (xem `.env.example` đầy đủ)

| Var | Bắt buộc prod? | Ghi chú |
|---|---|---|
| AUTH_SECRET | ✔ | ngẫu nhiên ≥32 byte |
| APP_URL | ✔ | https://domain |
| DATABASE_URL | ✔ | `postgresql://…@host:5432/db?schema=public` |
| ADMIN_PASSWORD | khi seed | ≥12 ký tự, không `admin123` |
| ALLOW_SEED | seed 1 lần | xóa sau seed |
| CRON_SECRET | ✔ | gọi cron + smoke |
| VNPAY_*/MOMO_* | nếu bật COD→online | `assertProdGateway` fail-fast |
| GHN_* | nếu bật `features.ghn` | |
| SMTP_* | khuyến nghị | thiếu → ghi DB MailLog |
| XAI_API_KEY / OPENAI_* | nếu bật AI | |
| S3_* / SENTORY_DSN | optional | ảnh + error tracking |

## 9. Checklist production

- [ ] `AUTH_SECRET` ngẫu nhiên (script `new:project` đã tự sinh)
- [ ] Đổi `ADMIN_PASSWORD` thành password mạnh — **KHÔNG seed lại**
      (seed `deleteMany()` toàn bảng = xóa sạch data prod; đổi password
      bằng cách tạo admin mới hoặc UPDATE SQL, không chạy seed)
- [ ] `APP_URL` đúng domain (VNPay ReturnUrl/IPN ăn theo)
      — Multi-tenant: mail link đã tự theo Host, nhưng **mỗi tenant bật
      payment cần `APP_URL` riêng → phase sau resolve Host lúc tạo payment**
      (vnpay/momo/sitemap/robots vẫn giữ `APP_URL` — YAGNI Task 7)
- [ ] `npx prisma migrate deploy` đã chạy (Docker tự chạy) + `npm run migrate:all`
      sau mỗi `git pull` khi có schema tenant (§10)
- [ ] VNPay: `VNPAY_TMN_CODE/HASH_SECRET`, khai báo IPN
  `https://domain/api/payments/vnpay/ipn` + ReturnUrl trên cổng
- [ ] GHN: `GHN_TOKEN/SHOP_ID`, bật `features.ghn` trên `/admin/cai-dat`
- [ ] Logo/favicon trong `public/`, cài đặt brand trên `/admin/cai-dat`
- [ ] Đã chạy `./scripts/backup.sh` + **test restore 1 lần** (ghi ngày: ______)
- [ ] `CRON_SECRET` + cron retention + abandoned đã bật
- [ ] Không còn credential mặc định trong repo (`ADMIN_PASSWORD` strong)

## 10. Multi-tenant (schema-per-tenant Postgres)

Mỗi shop = 1 schema Postgres, nhận diện theo **Host** (custom domain). App +
DB vẫn 1 instance.

- **DNS:** trỏ CNAME từng shop (`shopa.vn`, `www.shopa.vn` → server/app) —
  thêm Host trên reverse proxy trước app (compose bind `127.0.0.1:3000`).
- **Sau `git pull`:** migrate **mọi** schema (app lúc start chỉ tự chạy
  `prisma migrate deploy` cho `public`):

  ```bash
  npm run migrate:all        # hoặc: docker compose exec app npm run migrate:all
  ```

- **Thêm shop mới:**

  ```bash
  npm run tenant:create <slug> <ten> <host1,host2>
  # VD: npm run tenant:create shopc "Shop C" shopc.vn,www.shopc.vn
  ```

  Tự làm: row `Tenant`/`TenantDomain` (schema `platform`) → `CREATE SCHEMA`
  → migrate schema đó → seed + set brand. Idempotent fail sạch nếu slug/domain trùng.

- **Super-admin `/platform`:** `npm run platform:admin <email> <password≥8>`
  rồi đăng nhập `/platform` (tách session với admin từng shop).
- **Backup:** `scripts/backup.sh` → `pg_dump -Fc` **toàn database** — đã đủ mọi
  schema (public + platform + tenant); restore 1 file bằng `pg_restore` (§5).
- **Payment callback (VNPay/MoMo) vẫn dùng env `APP_URL`** — mỗi tenant bật
  payment cần `APP_URL` riêng; resolve Host lúc tạo payment = phase sau
  (YAGNI — mail link đã tự theo Host).
