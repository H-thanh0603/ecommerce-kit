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
docker compose exec app npx tsx prisma/seed.ts   # lần đầu
```

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

## 4. Cron nhắc giỏ bỏ quên

Vercel: `vercel.json` đã khai báo cron hàng ngày, chỉ cần thêm env `CRON_SECRET`
(trùng giá trị gọi đi). VPS: thêm crontab:

```bash
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/abandoned-cart
```

## 5. Checklist production

- [ ] `AUTH_SECRET` ngẫu nhiên (script `new:project` đã tự sinh)
- [ ] Đổi `ADMIN_PASSWORD`, seed lại
- [ ] `APP_URL` đúng domain (VNPay ReturnUrl/IPN ăn theo)
- [ ] `npx prisma migrate deploy` đã chạy (Docker tự chạy)
- [ ] VNPay: `VNPAY_TMN_CODE/HASH_SECRET`, khai báo IPN
  `https://domain/api/payments/vnpay/ipn` + ReturnUrl trên cổng
- [ ] GHN: `GHN_TOKEN/SHOP_ID`, bật `features.ghn` trên `/admin/cai-dat`
- [ ] Logo/favicon trong `public/`, cài đặt brand trên `/admin/cai-dat`
