# Triển khai (deploy)

## 1. Chạy local (SQLite)

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

## 2. Docker — VPS 1 lệnh (SQLite, volume persist)

```bash
cp .env.example .env   # sửa AUTH_SECRET, ADMIN_PASSWORD, APP_URL=https://domain
docker compose up -d --build
docker compose exec app env NODE_ENV=production ALLOW_SEED=1 npx tsx prisma/seed.ts   # lần đầu, DB trống
```

> Production **từ chối seed** nếu thiếu `ALLOW_SEED=1` hoặc `ADMIN_PASSWORD`
> còn là `admin123` — seed xóa toàn bộ dữ liệu nên chỉ chạy 1 lần lúc lập DB trống.

DB nằm trong volume `ek-data`. Update bản mới:

```bash
git pull
docker compose up -d --build   # migrate deploy tự chạy lúc start
```

## 3. Chuyển Postgres (Vercel/Neon/Supabase hoặc compose profile `pg`)

Migration trong repo là SQL của SQLite nên **không** chạy thẳng lên Postgres được.
Mỗi dự án khách làm 1 lần:

```bash
# 1. Trỏ DATABASE_URL Postgres
# 2. Đổi provider trong prisma/schema.prisma: sqlite -> postgresql
npx prisma migrate dev --name pg_baseline   # sinh migration Postgres mới
npx tsx prisma/seed.ts
```

Chạy kèm Postgres local:

```bash
docker compose --profile pg up -d
```

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

```bash
# Backup hàng ngày (cron 02:00 gợi ý)
0 2 * * * cd /path/app && BACKUP_DIR=/var/backups/ek ./scripts/backup.sh

# Test restore (BẮT BUỘC ít nhất 1 lần trước launch):
cp /var/backups/ek/sqlite-YYYYMMDDHHMMSS.db.gz /tmp/restore.db.gz
gunzip /tmp/restore.db.gz
# Dừng app, sao lưu DB hiện tại, copy restore → prisma/dev.db (hoặc path DATABASE_URL), start lại
docker compose stop app
cp prisma/dev.db prisma/dev.db.bak-$(date +%s)
cp /tmp/restore.db prisma/dev.db
docker compose up -d
curl -s http://localhost:3000/api/health   # { ok: true, db: "up" }
```

- **RPO = 24h** (1 backup/ngày — tăng tần suất nếu dữ liệu đổi nhanh).
- **RTO ≈ 1h** (copy file + health check; Postgres dùng `pg_restore`).
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
# giải nén backup mới nhất → prisma/dev.db (đọc mục 5)
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
| DATABASE_URL | ✔ | sqlite path hoặc postgres |
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
- [ ] `npx prisma migrate deploy` đã chạy (Docker tự chạy)
- [ ] VNPay: `VNPAY_TMN_CODE/HASH_SECRET`, khai báo IPN
  `https://domain/api/payments/vnpay/ipn` + ReturnUrl trên cổng
- [ ] GHN: `GHN_TOKEN/SHOP_ID`, bật `features.ghn` trên `/admin/cai-dat`
- [ ] Logo/favicon trong `public/`, cài đặt brand trên `/admin/cai-dat`
- [ ] Đã chạy `./scripts/backup.sh` + **test restore 1 lần** (ghi ngày: ______)
- [ ] `CRON_SECRET` + cron retention + abandoned đã bật
- [ ] Không còn credential mặc định trong repo (`ADMIN_PASSWORD` strong)
