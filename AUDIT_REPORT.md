# Pre-Launch Audit Report

- Repo / commit: `ecommerce-kit` @ `ce9078d2226ed9a184bfed327d5f989a3c6c3642` (2026-09-22)
- Ngày audit: 2026-09-22 · **Cập nhật sau đợt sửa: 2026-09-23**
- Auditor: AI agent (opencode) — đọc repo + config + CI + docs, evidence bằng file/line, không chạy deploy
- Checklist: `/home/nht/Downloads/PRELAUNCH_AUDIT_CHECKLIST_100PLUS.md` — file chứa **180 câu (Q1–Q180)**, không phải 200; báo cáo này trả lời **đủ 180/180** câu có thật, không bịa thêm mục.
- **Verdict ban đầu: NO-GO** — **Verdict sau fix (2026-09-23): CONDITIONAL GO** (xem §14)

---

## 0. Trạng thái sau đợt fix (2026-09-23)

Đã vá toàn bộ lỗi trong báo cáo theo phase. Chưa điền key/secret (user làm sau).

### Verification cuối

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | **sạch** |
| `npx vitest run` | **82/82** (28 files) |
| `npm run build` | **OK** |
| `npm run lint` | 15 problems (12 error pre-existing `react-hooks/set-state-in-effect` + 3 warning) — baseline trước fix là 17 (14 error) |
| `npm audit --omit=dev` | 4 high: `xlsx` (no fix) + `deepmerge-ts`→prisma (no fix) — CI allowlist known-excepted |

### Đóng BLOCKER

| Q | Hạng mục | Trạng thái |
|---|---|---|
| Q32 | Default admin / hint email | **FIXED** — seed prod require `ALLOW_SEED=1` + `ADMIN_PASSWORD`≠`admin123`; gỡ hint login; `.env.example` rỗng; CI dùng GitHub Secrets |
| Q34 | IDOR hóa đơn | **FIXED** — `canViewInvoice` + gate `/hoa-don/[number]` (admin hoặc chủ đơn) |
| Q75 | Điểm + coupon TOCTOU | **FIXED** — `spendPointsTx` + `assertCouponTx` trong tx; zod `pointsToUse`; `membership.test.ts` |
| Q145 | Backup/restore | **FIXED** — `scripts/backup.sh` (đã test chạy); DEPLOY §5 RPO/RTO + test restore; checklist |

### Đóng HIGH tiêu biểu

Q26 revoke (`tokenVersion`) · Q29 MFA (`mfa` flag OFF + `/admin/mfa` + login 2FA) · Q55 audit allowlist xlsx · Q60/Q151 privacy+ToS+footer · Q62 export/DELETE `/api/account`+UI · Q64 redact mail token · Q66/Q145 backup · Q70 Postgres port ẩn · Q78 seed guard · Q85 webhook retry · Q118 AI caps+sanitize · Q122 membership/momo/invoice/coupon/crypto/mfa/audit/session/retention tests · Q133 rollback · Q139 `/api/health` · Q148 AuditLog+OrderEvent actor · Q156 unsubscribe DELETE+List-Unsubscribe · Q53 rate-limit · Q44 JSON-LD/CSP/Origin · Q46 remotePatterns · Q83 idempotency `clientRequestId` · Q88 timeouts · Q95 favicon · Q96 dynamic ChatWidget+error/loading · Q101 labels · Q102 focus-visible · Q105 reduced-motion · Q56 Docker non-root+healthcheck+127.0.0.1 · Q126/Q129 CI lint+audit · Q147 INCIDENT.md · Q152 LICENSE/NOTICE · Q20 key rotation DEPLOY §7.

### Chưa / không làm (cần người hoặc ngoài scope)

- **Điền key prod** (user): `AUTH_SECRET`, `ADMIN_PASSWORD`, `XAI_API_KEY`, `VNPAY_*`, `MOMO_*`, `GHN_*`, `SMTP_*`, `SEPAY_API_KEY`, `CRON_SECRET`, optional S3/Sentry — xem §15.
- SPF/DKIM/DMARC (DNS tại nhà cung cấp mail).
- GitHub branch protection, gitleaks, staging/preview, load test, Lighthouse budget.
- Sentry DSN (cờ code chưa gắn SDK).
- Legal sign-off privacy/ToS (bản technical draft đã có).
- Lint pre-existing 12× `react-hooks/set-state-in-effect` (admin pages, localStorage hooks).
- `xlsx` CVE — route admin đã requireAdmin + magic-byte + 5MB; cân nhắc SheetJS tarball ≥0.20 hoặc exceljs sau.

---

## 1. Executive summary

Đây là e-commerce kit (Next.js 16 App Router + Prisma + SQLite/Postgres) triển khai được qua Vercel hoặc Docker/VPS, với module khuyến mãi, thanh toán VNPay/MoMo/SePay, hoàn tiền, hóa đơn VAT, chatbot AI và admin CRUD. Kiến trúc module theo AGENTS.md khá kỷ luật: mọi API admin đều gọi `requireAdmin()`, checkout dùng `prisma.$transaction` với guard trừ tồn kho, IPN có HMAC + số tiền + idempotent, và có 21 file unit test + E2E Playwright chạy trên CI. Không phát hiện secret nào trong git history; `.env` bị gitignore; cookie session HttpOnly+SameSite; không có SQL injection, không có open redirect, không có command injection.

Tuy nhiên audit phát hiện **4 BLOCKER**: (1) admin mặc định `admin@atelier.vn`/`admin123` vẫn là fallback của seed, xuất hiện trong README/.env.example/CI và login page còn **công khai email admin** cho khách chưa đăng nhập; (2) **trang hóa đơn `/hoa-don/[number]` công khai, số thứ tự tuần tự `INV-00001…` → ai cũng đọc được PII + đơn hàng của mọi khách** (IDOR); (3) **lỗ hổng điểm tích lũy: client gửi `pointsToUse` bao nhiêu cũng được, server tin ngay để tính discount mà không kiểm tra số dư** (`order.ts:166-167`) → user 0 điểm vẫn giảm giá thoải mái, lại **không có test cho membership**; (4) **hoàn toàn không có backup/restore/RPO-RTO** — mất volume SQLite là mất trắng, trong khi DEPLOY.md lại còn hướng dẫn "seed lại" (seed `deleteMany()` toàn bộ, không có guard production).

Ngoài ra còn 18 FAIL HIGH + 7 PARTIAL HIGH chưa mitigate: không revoke session khi đổi mật khẩu (JWT 14 ngày), không MFA cho admin, không error tracking/health endpoint/alert, thiếu rate-limit register/contact, privacy policy chỉ là placeholder trong khi đang gửi dữ liệu đơn hàng cho xAI/GHN, `npm audit` còn 1 critical + 5 high (`xlsx` không có fix), GHN hard-code **dev gateway**, webhook MoMo replay phát lại `order.paid`, refund API gateway là dead code, không rollback plan, không audit log admin. Theo đúng luật chấm của checklist — bất kỳ BLOCKER FAIL nào cũng = không launch — verdict là **NO-GO**. Ước lượng sửa tối thiểu để ra CONDITIONAL GO: vá 4 BLOCKER + close các HIGH còn lại (xem kế hoạch 24h/72h).

---

## 2. Launch verdict

**CONDITIONAL GO** (cập nhật 2026-09-23 — xem §0/§14). Lịch sử audit 2026-09-22: **NO-GO** — 4 BLOCKER FAIL (Q32, Q34, Q75, Q145).

### Thống kê ban đầu (180/180 câu, trước fix)

| Verdict | Số câu | Tỷ lệ |
|---|---:|---:|
| **PASS** | 37 | 20.6% |
| **PARTIAL** | 62 | 34.4% |
| **FAIL** | 53 | 29.4% |
| **N/A** | 22 | 12.2% |
| **UNKNOWN** | 6 | 3.3% |
| **Tổng** | **180** | 100% |

Theo luật checklist: PARTIAL ở nhóm security/privacy **không tính PASS** → tỉ lệ PASS thật của các câu áp dụng chỉ ≈ 37/(180−22) = **23.4%**.

### Breakdown theo severity (trên 53 FAIL + 6 UNKNOWN; PARTIAL HIGH liệt kê riêng vì không tính PASS)

- BLOCKER (FAIL): **4** — Q32, Q34, Q75, Q145
- HIGH (FAIL): **18** — Q8, Q26, Q29, Q55, Q60, Q62, Q64, Q66, Q70, Q78, Q118, Q122, Q124, Q133, Q139, Q148, Q151, Q156
- HIGH (PARTIAL, chưa mitigate): **7** — Q23, Q24, Q38, Q44, Q53, Q155, Q173
- MEDIUM (FAIL): **28**; MEDIUM (UNKNOWN): Q102, Q135 → tổng 30
- LOW (FAIL): **3** — Q94, Q105, Q147
- INFO (UNKNOWN — cần người): **4** — Q177–Q180
- Kiểm tra cộng: 4+18+28+3 = **53 FAIL**; +62 PARTIAL +37 PASS +22 N/A +6 UNKNOWN = **180** ✓

---

## 3. Điểm theo nhóm

| Nhóm | #câu | PASS | PARTIAL | FAIL | N/A | UNKNOWN | Risk |
|---|---:|---:|---:|---:|---:|---:|---|
| A. Hệ thống & phạm vi | 8 | 5 | 2 | 1 | 0 | 0 | Trung bình — thiếu sơ đồ, còn shadow dev UI |
| B. Secrets/config | 12 | 6 | 5 | 1 | 0 | 0 | Trung bình — không secret lộ, thiếu rotation |
| C. Authn | 12 | 2 | 6 | 3 | 1 | 0 | **Cao — admin mặc định, không revoke/MFA** |
| D. Authz | 10 | 3 | 4 | 1 | 2 | 0 | **Cao — IDOR hóa đơn public** |
| E. App security | 16 | 5 | 9 | 2 | 0 | 0 | **Cao — XSS JSON-LD, rate-limit hổng, CVE** |
| F. Privacy/data | 12 | 2 | 1 | 8 | 1 | 0 | **Cao — placeholder policy, không xóa/tồn trữ** |
| G. DB/migration | 10 | 0 | 6 | 2 | 2 | 0 | **Cao — exploit điểm, seedprod** |
| H. API/backend | 10 | 1 | 5 | 2 | 2 | 0 | Trung bình — không contract, không idempotency key |
| I. Frontend/UX | 10 | 3 | 4 | 1 | 2 | 0 | Trung bình — thiếu error/loading state |
| J. A11y/i18n | 8 | 3 | 1 | 3 | 0 | 1 | Trung bình — label/focus/dialog fail |
| K. Performance | 10 | 2 | 4 | 4 | 0 | 0 | Trung bình — không load test, AI không costcap |
| L. Testing | 10 | 1 | 4 | 4 | 1 | 0 | **Cao — money path điểm không test** |
| M. CI/CD/rollback | 10 | 1 | 3 | 4 | 1 | 1 | **Cao — không rollback/staging** |
| N. Observability/backup | 12 | 0 | 0 | 11 | 1 | 0 | **Cao — mù tịt + không backup** |
| O. Legal/content | 12 | 1 | 4 | 5 | 2 | 0 | **Cao — privacy placeholder, emailfail** |
| P. Mobile/store | 6 | 0 | 0 | 0 | 6 | 0 | N/A — web only |
| Q. AI/LLM | 8 | 2 | 4 | 1 | 1 | 0 | Trung bình — không cost cap/eval |
| R. Câu hỏi founder | 4 | 0 | 0 | 0 | 0 | 4 | Cần người trả lời |
| **Tổng** | **180** | **37** | **62** | **53** | **22** | **6** | (sau fix → CONDITIONAL GO) |

---

## 4. Top 10 rủi ro (theo impact)

1. **[BLOCKER] IDOR hóa đơn public** — `/hoa-don/[number]` không auth, số `INV-00001` tuần tự → enumerate toàn bộ PII/đơn hàng (`src/app/hoa-don/[number]/page.tsx:7-13`, `src/server/invoice.ts:17`).
2. **[BLOCKER] Admin mặc định `admin123` + login page lộ email admin** — seed/.env.example/README/CI đều dùng, chưa đổi = vào thẳng admin (`prisma/seed.ts:54-55`, `src/app/dang-nhap/page.tsx:34`).
3. **[BLOCKER] Exploit điểm tích lũy** — `pointsToUse` tin từ client, không kiểm tra số dư trước khi tính discount, không test membership → giảm giá tùy ý (`src/server/order.ts:166-167`, `src/app/api/orders/route.ts:30`).
4. **[BLOCKER] Không backup/restore** — zero docs, volume SQLite `ek-data` mất là mất sạch; DEPLOY checklist lại bảo "seed lại" (`prisma/seed.ts:29-52` deleteMany, `DEPLOY.md:62`).
5. **[HIGH] Session không revoke** — logout chỉ xóa cookie, đổi mật khẩu không kill JWT 14 ngày, admin role đóng băng trong token (`src/server/auth.ts:33-36,98-119`).
6. **[HIGH] Observability = 0** — không Sentry, không `/api/health`, không metrics, không alert → launch day mù (`grep health|sentry` = 0).
7. **[HIGH] Privacy policy placeholder + không có xóa/tồn trữ data** — trong khi đang gửi đơn hàng (email/phone/địa chỉ) cho xAI, GHN (`src/app/chinh-sach/page.tsx:22-24`, `src/server/ai.ts:85-92`).
8. **[HIGH] `npm audit`: 1 critical + 5 high, `xlsx` không có fix** — parser này nhận file admin upload (`package.json:30`, `src/server/excel.ts:26`).
9. **[HIGH] GHN hard-code dev gateway + MoMo replay refire webhook + refund gateway dead code** — vận hành/thanh toán sai vào ngày launch (`src/server/shipping.ts:20,73`, `src/app/api/payments/momo/ipn/route.ts:22-27`, `refundVnpay/refundMomo` không route nào gọi).
10. **[HIGH] Không rollback/staging/error tracking** — deploy = `git pull && rebuild`, lỡ bad release không có đường lui, lỗi prod không ai biết (`DEPLOY.md:23-26`, `.github/workflows/ci.yml` chỉ có CI).

---

## 5. BLOCKER (4)

- **[Q32] Admin mặc định `admin@atelier.vn`/`admin123` còn tồn tại + login page công khai email admin** — `prisma/seed.ts:54-55,222`, `.env.example:5-6`, `README.md:29`, `.github/workflows/ci.yml:33-34`, `src/app/dang-nhap/page.tsx:34` — **Fix:** bỏ hint trên login page; seed bắt buộc `ADMIN_PASSWORD` ở production (throw nếu mặc định); rotate password thật + xóa credential khỏi README/CI (dùng secret CI riêng cho E2E).
- **[Q34] IDOR: trang in hóa đơn public, số tuần tự** — `src/app/hoa-don/[number]/page.tsx:7-13` không `getSession`, `src/server/invoice.ts:17` `INV-${padStart(5,"0")}` — **Fix:** yêu cầu session admin hoặc signed token có TTL cho `/hoa-don/[number]`; đổi sang UUID/unguessable.
- **[Q75] Tiền: discount điểm không validate số dư + TOCTOU coupon** — `src/server/order.ts:166-167` (`discountFromPoints(input.pointsToUse)` trước khi biết số dư), spend chạy *sau* transaction `:292-293`, `coupon.ts:16-18` count-check ngoài tx — **Fix:** clamp `pointsToUse = Math.min(points, user.points)` + max/z.number().int().positive() trong zod, move spend vào transaction, re-check coupon count trong tx; thêm `membership.test.ts`.
- **[Q145] Không backup/restore/test restore/RPO-RTO** — grep `backup|restore|RPO` trong `*.md` = 0; `docker-compose.yml:12-13` volume không có snapshot — **Fix:** cron `sqlite3 .backup`/`pg_dump` offsite + mã hóa, ghi RPO/RTO, **test restore** ít nhất 1 lần trước launch.

---

## 6. HIGH (FAIL: 18)

- [Q8] Shadow features/dev copy còn trên production path — `src/app/dang-nhap/page.tsx:34` (hint admin), `src/app/thanh-toan/page.tsx:276` ("MoMo·VNPay gắn tại src/server/payments.ts"), MailLog hiện token reset cho admin (`mail.ts:30`, `api/leads/route.ts:9`).
- [Q26] Không revoke session/logout server-side, không idle timeout, role đóng băng 14 ngày — `src/server/auth.ts:33-36`, `src/server/session.ts:22`.
- [Q29] Không MFA/2FA cho admin — grep `mfa|totp|2fa` = 0, schema User không trường 2FA.
- [Q55] Dependency CVE: `npm audit` 1 critical + 5 high; `xlsx@0.18.5` high ×2 không có fix, đang parse file admin upload — `package.json:30`, `src/server/excel.ts:26`.
- [Q60] Privacy policy là placeholder, không khớp practice — `src/app/chinh-sach/page.tsx:22-24`; chưa liệt kê xAI/GHN/gateway/SMTP (`src/server/ai.ts:85-92`, `shipping.ts:80-98`).
- [Q62] Không xóa tài khoản/anonymize/export — `tai-khoat` chỉ có logout (`src/app/tai-khoan/page.tsx:65-67`), không endpoint erasure.
- [Q64] PII/token trong log — `prisma/seed.ts:222` in **plaintext password**, reset token raw nằm vĩnh viễn trong `MailLog.body` (`mail.ts:63` + `mail.ts:30`).
- [Q66] Không backup = PII không được bảo vệ (xem Q145).
- [Q70] Truy cập DB prod không least-privilege — không docs truy cập DB, `docker-compose.yml:22-29` Postgres `ek/ek` + publish `5432:5432`.
- [Q78] Seed không guard production: `deleteMany()` toàn bảng không check `NODE_ENV` (`prisma/seed.ts:29-52`), `db:reset` = `--force-reset` (`package.json:14`), DEPLOY checklist lại bảo "seed lại" (`DEPLOY.md:62`) → theo docs là xóa sạch data prod.
- [Q118] Không cost cap AI — chat public, `messages` không giới hạn độ dài, chỉ 20 req/min/IP (`api/ai/chat/route.ts:19-22`, `src/server/ai.ts` không `max_tokens`).
- [Q122] Money path rủi ro không test — không `membership*.test.ts` (grep = 0) dù AGENTS.md bắt buộc test money; không coverage config (`vitest.config.ts`).
- [Q124] Fixture/default user có thể ship prod — seed fallback `admin123` chạy khi thiếu env (`prisma/seed.ts:55`).
- [Q133] Không rollback plan — `DEPLOY.md:23-26` chỉ có `git pull && docker compose up --build`, không previous image/tag.
- [Q139] Không error tracking (Sentry/vv) — grep `sentry|datadog|bugsnag` = 0 trong src.
- [Q148] Không audit log admin: settings/refund không ghi ai làm gì — `OrderEvent` không có actor (`schema.prisma:196-205`), `api/admin/refunds/route.ts:17-19` chỉ update status.
- [Q151] Không ToS; privacy placeholder (dẫn từ Q60); footer chưa link điều khoản (`Footer.tsx:44-52` chỉ `/chinh-sach`, `/lien-he`).
- [Q156] Email: không SPF/DKIM/DMARC (grep = 0), footer hứa "huỷ bất lúc nào" nhưng không có unsubscribe (`Footer.tsx:16` vs `api/newsletter` chỉ POST).

**PARTIAL HIGH (không tính PASS, cần close):** [Q23] reset không invalidate session cũ + token trên query string; [Q24] không rate-limit `register`/`contact`, không per-account lockout/captcha; [Q38] object-level fail ở hóa đơn/returns theo order code đoán được; [Q44] JSON-LD `</script>` break-out + CSP `unsafe-inline/eval`; [Q53] rate-limit thiếu signup/search/returns, key XFF spoofable; [Q155] GHN dev gateway hard-code (`shipping.ts:20,73`), URL payment mặc định sandbox nếu thiếu env (`vnpay.ts:30`, `momo.ts:18`), refund gateway dead code; [Q173] AI không max token/cost cap.

---

## 7. MEDIUM / LOW (tóm tắt)

**MEDIUM tiêu biểu:** thiếu sơ đồ kiến trúc (Q3), không tách staging (Q5/Q132), thiếu rotation key (Q20), password policy mỏng (Q22), JWT không `iss/aud` (Q28), không verify email (Q30), admin RSC phụ thuộc 1 lớp proxy (Q33), CSRF chỉ SameSite (Q45), SSRF webhook/image wildcard (Q46/Q…), upload không magic-byte (Q48), CSP yếu + `/uploads` không nhận security header (Q51), HTTPS redirect không app-level (Q52), body limit thiếu, container chạy root (Q56), không retention TTL (Q63), field encryption chưa có (Q65), không DPA subprocessor (Q67), không export data (Q69), migration up-only + docs `db push` lẫn (Q71), thiếu CHECK constraint (Q72), thiếu index `Order.userId`/search full-scan (Q73), admin orders không pagination (Q74), seed không guard production (Q78 — HIGH), SQLite pool/multi-instance (Q77), không OpenAPI/version (Q81), checkout không idempotency key (Q83), webhook outbound không retry (Q85), timeout giữa service thiếu (Q88), form validate không đồng nhất + infinite pending (Q91/Q92), favicon/meta thiếu (Q95/Q96), a11y label/focus/dialog (Q101/Q104), không performance budget/load test (Q109/Q114), SMTP đồng bộ block checkout (Q116), không IDOR test (Q120), CI thiếu lint/audit (Q126/Q129), không CD/artifact pin (Q130/Q131), không health/metrics/alert (Q141–Q144), không incident/status page (Q146/Q147), copyright/ảnh stock chưa chốt (Q153), canonical/hreflang thiếu (Q160), không launch comms/metric (Q161/Q162), AI prompt-injection/eval (Q169/Q175).

**LOW tiêu biểu:** cost bcrypt 10 (Q21), reset token query-string referrer (Q23 phần nhỏ), CSP không preload (Q51), `e.message` leak nhẹ (Q82), chỉ test Chrome (Q94), 404 có/500 không (Q96), localhost fallback khi thiếu `APP_URL` (Q97), reduced-motion thiếu (Q105), timezone display UTC-slice (Q107), code-split chat widget (Q111), cache header mặc định (Q112), E2E `sleep 8` race (Q123), cron timezone lock lỏng (Q87), status page (Q147), support SLA mờ (Q157), AI disclosure mỏng (Q176).

---

## 8. N/A (22) — có lý do

| Câu | Lý do N/A |
|---|---|
| Q27 | Không dùng OAuth/OIDC (auth自 local email+password, `src/server/auth.ts`) |
| Q35 | Single-tenant — schema không có tenant/org (`prisma/schema.prisma`) |
| Q42 | Không có impersonation/support-access feature (grep = 0) |
| Q68 | Không thu thập dữ liệu trẻ em/đặc biệt (e-commerce thời trang/nhà cửa, không age-gate nhưng không nhắm trẻ em) |
| Q76 | Không dùng soft-delete (chỉ hard delete) → không có xung đột unique & lọc deleted |
| Q80 | Không dùng read replica/multi-region (một app, một DB) |
| Q86 | Không có queue/job infra (chỉ 1 cron Vercel) → không có poison/DLQ để đánh giá |
| Q90 | Không có GraphQL |
| Q99 | Web thuần, không deep link/universal link mobile |
| Q100 | Không tuyên bố PWA/manifest → không đánh giá manifest |
| Q127 | Frontend + API cùng repo (Next monolith) → contract test tách repo không áp dụng |
| Q137 | Không có PR preview environment → không có rủi ro preview leak (thiếu preview = đánh ở Q132) |
| Q149 | Một service duy nhất, không stack >2 service nội bộ → không cần distributed tracing |
| Q154 | Không có trang giá/trial subscription; hạng thành viên đọc chung `site.ts` với code → không có trang-price để lệch |
| Q158 | Không cài analytics nào (grep gtag/posthog = 0) → không double count/PII analytics |
| Q163–Q168 (6 câu) | Không có mobile app/desktop/store listing trong repo |
| Q171 | Không có RAG/vector store (chat chỉ inject catalog đơn tenant) |

---

## 9. Chi tiết 180 câu (A → R)

Format: **Verdict · Severity** — Evidence (path:line) — Gap — Fix.

### A. Bản đồ hệ thống & phạm vi (Q1–Q8)

**Q1. Loại sản phẩm gì?** `PASS · INFO` — Evidence: `package.json:2` `"ecommerce-kit"`, `next:16.3.5`, 38 page + 47 route API trong `src/app/`, README.md mô tả "starter e-commerce". Gap: — Fix: —

**Q2. Critical user journeys?** `PASS · INFO` — Evidence: signup/login (`src/app/api/auth/*`), browse/search (`/san-pham`), cart (`/gio-hang`), checkout (`/thanh-toan` → `/api/orders`), payment IPN (`/api/payments/*`), admin (`/admin/*` 18 trang), export Excel (`/api/excel`). Gap: guest checkout không verify email. Fix: list journey trong runbook launch + smoke test (Q125).

**Q3. Sơ đồ kiến trúc/C4/README kiến trúc?** `PARTIAL · MEDIUM` — Evidence: `AGENTS.md:16-28` mô tả 4 module lõi bằng prose; `src/lib/modules.ts:12-112` registry module; không có file `docs/`, mermaid, drawio (glob = 0). Gap: không có data-flow/C4, không mô tả payment flow. Fix: thêm `docs/architecture.md` 1 trang (mermaid) chụp request→session→order→IPN→webhook.

**Q4. Liệt kê entrypoint?** `PASS · INFO` — Evidence: 47 `route.ts` API (`src/app/api/**`), 38 `page.tsx`, edge `src/proxy.ts:30-46` (Next 16 middleware), cron `vercel.json:3-8` `/api/cron/abandoned-cart`, webhooks inbound VNPay/MoMo/SePay, outbound `src/server/webhooks.ts`. Gap: không có doc tổng hợp entrypoint. Fix: bảng endpoints trong README.

**Q5. Môi trường local/preview/staging/prod?** `PARTIAL · MEDIUM` — Evidence: chỉ có local (`.env` + SQLite `prisma/dev.db`) và production-hướng (`DEPLOY.md`, `vercel.json`); CI dùng `file:./dev.db` (`.github/workflows/ci.yml:18`); không có staging/preview config. Gap: không tách môi trường thật, chung seed/admin. Fix: khai 2 env distinct (staging/prod), tối thiểu dùng branch/Vercel preview với DB riêng.

**Q6. Stack chính?** `PASS · INFO` — Evidence: TS 5 + Next 16 + React 19 (`package.json`), Prisma 6 + SQLite/Postgres (`prisma/schema.prisma:5-8`), Tailwind 4, jose JWT, bcryptjs, nodemailer, OpenAI SDK→xAI (`src/server/ai.ts:14`), Vercel/Docker (`vercel.json`, `Dockerfile`). Queue/cache: không (Upstash optional cho rate-limit `.env.example:37-39`). Gap: — Fix: —

**Q7. Generated/vendored/submodule chưa audit?** `PASS · LOW` — Evidence: không có submodule (`git ls-files` không có gitlink), `node_modules/` gitignore, chỉ có `xlsx` (thư viện bên thứ ba, đã đánh dấu ở Q55). Gap: không có `NOTICE` danh sách dependency (Q152). Fix: ghi chú dependency rủi ro trong README.

**Q8. Shadow features sót trên production path?** `FAIL · HIGH` — Evidence: login page công khai admin email + cách tìm password `src/app/dang-nhap/page.tsx:34`; dev note lộ path code trong UI khách `src/app/thanh-toan/page.tsx:276` ("MoMo·VNPay gắn tại src/server/payments.ts"); MailLog chứa token reset hiển thị admin `src/server/mail.ts:30` + `src/app/api/leads/route.ts:9`; hint dev `src/app/quen-mat-khau/page.tsx:22`. Gap: debug/dev hints còn live. Fix: xóa 3 dòng hint; chỉ hiện MailLog token khi `NODE_ENV!=production`.

### B. Secrets, config & môi trường (Q9–Q20)

**Q9. Secret commit trong git?** `PASS · INFO` — Evidence: `git ls-files` chỉ có `.env.example` (không track `.env`/`*.pem`/`credentials`); `git log --all --diff-filter=A` không file nhạy cảm; working tree không có `*.pem/id_rsa` (find = 0); `.env` local có `AUTH_SECRET` 66 ký tự (đủ entropy), `XAI_API_KEY` rỗng. Gap: — Fix: —

**Q10. .gitignore/.dockerignore chặn .env?** `PASS · INFO` — Evidence: `.gitignore:36-38` `.env`, `.env.*`, `!.env.example`; `.gitignore:63-64` `/prisma/*.db`; `.dockerignore` có `.env`, `prisma/dev.db`. Gap: `.gitignore` không chặn `*.tsbuildinfo` ngoài… có `*.tsbuildinfo` rồi; `test-results/` có ignore. Fix: — 

**Q11. .env.example đầy đủ, không chứa giá trị thật?** `PARTIAL · MEDIUM` — Evidence: `.env.example` liệt kê đủ biến (DB, AUTH, payment, GHN, SMTP, S3, SePay, cron) nhưng chứa `ADMIN_PASSWORD="admin123"` (`:6`) — giá trị này **thực sự hoạt động** như default credential của seed, và `AUTH_SECRET="doi-thanh-chuoi-ngau-nhien-khi-clone"` placeholder. Gap: example mang credential thật. Fix: để `ADMIN_PASSWORD=` rỗng + comment "bắt buộc đổi", seed throw khi rỗng ở production.

**Q12. DEBUG/stacktrace ra client?** `PARTIAL · LOW` — Evidence: không có `err.stack` trong response (grep `e.stack` = 0); Prisma log chỉ `["error"]` ở prod (`src/server/db.ts:8`); nhưng ~20 route trả `e.message` thô (`src/app/api/products/route.ts:42-44`, `api/ai/chat/route.ts:25` — message upstream AI). Gap: `e.message` có thể lộ nội bộ Prisma/provider. Fix: map lỗi sang mã ổn định, log chi tiết server-side.

**Q13. Secrets inject bằng env/CI secret chứ không hardcode?** `PASS · INFO` — Evidence: mọi secret đọc `process.env` (`session.ts:8`, `vnpay.ts:30`, `mail.ts:5-7`, `ai.ts:11`); Docker `env_file: .env` (`docker-compose.yml:6-7`); không hardcode key trong src (grep `sk-|api_key = "` = 0). Gap: — Fix: —

**Q14. Phân biệt config theo môi trường?** `PARTIAL · MEDIUM` — Evidence: một file `.env` duy nhất dùng cho local+VPS; CI set `DATABASE_URL=file:./dev.db` inline; không có `.env.staging`; sandbox URLs là default khi thiếu env (`vnpay.ts:30`, `momo.ts:18`) — lỡ quên set env ở prod → payment trỏ sandbox âm thầm. Gap: không có cơ chế detect "đang prod nhưng đang gọi sandbox". Fix: fail-fast nếu `NODE_ENV=production` mà URL còn chứa `sandbox/test-payment/dev-online`.

**Q15. Feature flag fallback an toàn?** `PASS · LOW` — Evidence: `src/server/settings.ts:131-137` `try/catch → return {}` (fallback file default); JSON parse guard `:105-112`; test `settings.test.ts`. Gap: fail-open tức DB chết thì quay về flag file (mặc định payment off — an toàn). Fix: giữ nguyên; ghi rõ hành vi trong docs.

**Q16. Fail-fast khi thiếu env?** `PARTIAL · MEDIUM` — Evidence: `session.ts:10-13` throw `AUTH_SECRET bắt buộc` ở production (tốt); cron fail-closed 500 khi thiếu `CRON_SECRET` (`cron/abandoned-cart/route.ts:6-7`); nhưng payment/mail/AI chỉ ném message thân thiện khi *chọn* dịch vụ (`payments.ts:48`, `ai.ts:13`), app vẫn boot với `APP_URL` rỗng → secret link/sitemap ra `localhost`. Gap: không check boot-time các biến bắt buộc theo feature đang bật. Fix: script `scripts/check-env.ts` chạy trước `next start`.

**Q17. CORS whitelist?** `PASS · LOW` — Evidence: không có config CORS nào (grep `Access-Control|cors(` = 0) → cùng origin mặc định, không `*` với credentialed. Gap: nếu sau này mở API cho subdomain cần whitelist. Fix: ghi chú; đừng bao giờ bật `*` + credentials.

**Q18. Allowed hosts/trusted proxies/cookie domain quá rộng?** `PARTIAL · MEDIUM` — Evidence: rate-limit tin **hop đầu** của `x-forwarded-for` (`src/server/rate-limit.ts:55-60`) → spoof được nếu không có proxy ghi đè; không có trusted-proxy config; cookie set mặc định host, path `/` (`auth.ts:21-31`) — hẹp, OK. Gap: XFF spoof → bypass rate-limit. Fix: tin XFF chỉ sau khi xác định reverse proxy (Vercel `x-real-ip`/platform headers) hoặc set limit theo session khi đã login.

**Q19. File tĩnh nhạy cảm bị serve?** `PASS · LOW` — Evidence: `public/` chỉ có svg + `uploads/` (`.gitignore` không track env/db); browser source map = 0 file (`find .next/static -name "*.map"` = 0); `robots.ts:5` disallow `/admin/`, `/api/`… Gap: `/uploads` nằm ngoài matcher security header (`proxy.ts:45`) — file upload không nhận `X-Content-Type-Options` (liên quan Q51). Fix: đưa `uploads` vào matcher hoặc set header tĩnh cho `/uploads/*`.

**Q20. Cơ chế rotate key + danh sách key live?** `FAIL · MEDIUM` — Evidence: grep `rotate|rotation` trong `*.md` + src = 0; key sống gồm AUTH_SECRET, VNPAY_HASH_SECRET, MOMO_SECRET_KEY, SEPAY_API_KEY, GHN_TOKEN, SMTP_PASS, webhook secrets (tự sinh `webhooks.ts:64`) — không có danh sách/luồng xoay. Gap: không biết key nào đang live, không biết cách xoay khi leak. Fix: mục "Key rotation" trong DEPLOY.md (ai giữ, xoay từng loại, downtime không).

### C. Xác thực (Q21–Q32)

**Q21. Password hash hiện đại?** `PASS · LOW` — Evidence: `src/server/auth.ts:8-10` `bcrypt.hash(password, 10)`; `bcryptjs@3.0.3` (`package.json:23`). Gap: cost 10 (khuyến nghị 12+), không Argon2. Fix: nâng rounds lên 12 khi tạo user mới (khi login thành công re-hash nếu rounds cũ).

**Q22. Chính sách mật khẩu server-side?** `PARTIAL · MEDIUM` — Evidence: chỉ check `password.length < 6` (`auth.ts:39`, reset `:99`); register route không zod, không validate email format (`api/auth/register/route.ts:5-10` `String(body.email||"")`); test phủ `auth.test.ts:57-60`. Gap: không max length, không email format, không strength. Fix: zod `.email().min(6).max(72)` cho register/reset.

**Q23. Reset password an toàn?** `PARTIAL · HIGH` — Evidence: token = 2 UUID gộp (~244 bit), bcrypt-hash trong DB, TTL 15 phút, cờ `used` (`auth.ts:83-91`, `schema.prisma:362-370`); response đồng nhất chống enumeration (`auth.ts:82,95`). Gap: (1) **không invalidate session cũ sau reset** (`resetPassword` `auth.ts:98-119` không đụng JWT); (2) token nằm trên **query string** email (`auth.ts:94`) → referrer/log/history; (3) cấp token mới không thu hồi token cũ (tối đa 5 token sống cùng lúc). Fix: thêm `tokenVersion/passwordChangedAt` vào User và verify trong JWT; đổi sang fragment `#token=` hoặc trao đổi 1-lần POST; revoke token cũ khi tạo mới.

**Q24. Rate limit/lockout login?** `PARTIAL · HIGH` — Evidence: login 8/phút, forgot 5, reset 8 (`api/auth/login/route.ts:6` v.v.), backend `rate-limit.ts` memory/Upstash. Gap: **`register` không rate-limit** (`register/route.ts` không import), `contact`/`returns` POST không limit; không per-account lockout (nhiều IP vẫn brute 1 tài khoản); không captcha; key theo XFF spoofable; fail-open Redis (`rate-limit.ts:49-51`). Fix: thêm `rateLimit` cho register/contact/returns; giới hạn theo email cho login (sau 20 fail/15 phút → cooldown).

**Q25. Session cookie flags?** `PASS · INFO` — Evidence: `auth.ts:21-31` `httpOnly:true, sameSite:"lax", path:"/", secure: NODE_ENV==="production", maxAge:14d`. Gap: không `__Host-` prefix. Fix (nice-to-have): `__Host-ek_session` khi HTTPS chắc chắn.

**Q26. Session expire + revoke?** `FAIL · HIGH` — Evidence: JWT tuyệt đối 14 ngày (`session.ts:22`), **logout chỉ `jar.delete` cookie** (`auth.ts:33-36`) không denylist; đổi mật khẩu không kill session (`auth.ts:115-118`); không idle timeout; `requireAdmin` đọc role **trong JWT** không đọc DB (`auth.ts:74-78`) → hạ quyền admin vẫn giữ access tối đa 14 ngày. Gap: không có server-side revocation. Fix: `tokenVersion` trong User + compare khi verify (đổi password → bump version); idle timeout 2h cho role admin.

**Q27. OAuth/OIDC state/nonce/redirect?** `N/A` — Không dùng OAuth/OIDC (auth local, `src/server/auth.ts`).

**Q28. JWT an toàn?** `PARTIAL · MEDIUM` — Evidence: HS256 + `exp` 14d + `iat` (`session.ts:18-24`); verify qua `jwtVerify` (`:29`); secret fail-fast prod (`:10-13`); payload chứa id/name/email/role (PII nhỏ, chấp nhận được). Gap: không `iss`/`aud`; role frozen trong token (Q26); secret dev mặc định đoán được → forge admin cookie **chỉ trên dev** (prod throw). Fix: `.setIssuer(APP_URL).setAudience("ek-session")`; đọc role từ DB cho admin check.

**Q29. MFA cho admin?** `FAIL · HIGH` — Evidence: grep `mfa|2fa|totp|otp|twoFactor|recovery` = 0; schema User không trường 2FA (`schema.prisma:10-28`). Gap: admin = cookie 14 ngày + password duy nhất, không 2FA. Fix: TOTP (otplib) bắt buộc cho role admin + 10 recovery code in-ra-lúc-bật.

**Q30. Email/phone verification?** `PARTIAL · MEDIUM` — Evidence: không có `emailVerified` (schema User); register login ngay (`auth.ts:52-53`); guest checkout nhận email bất kỳ (`orders/route.ts:21`). Gap: reset password = toàn quyền dựa trên sở hữu mailbox, chưa verify lần nào; contact/booking/returns nhận email không xác thực. Fix: verify email bắt buộc trước khi đặt lại password cho tài khoản có đơn hàng.

**Q31. Magic link/OTP entropy, TTL, không tái sử dụng?** `PARTIAL · MEDIUM` — Evidence: entropy đủ (2×UUID), TTL 15 phút, `used=true` sau khi xong (`auth.ts:83-118`). Gap: token cũ không bị thu hồi khi cấp mới; token lộ query-string (Q23). Fix: khi `forgot` → `updateMany({userId, used:false}, {used:true})` trước khi tạo mới.

**Q32. Default admin/demo user?** `FAIL · BLOCKER` — Evidence: seed fallback `admin123` in ra stdout (`prisma/seed.ts:54-55,222`); cùng credential trong `.env.example:5-6`, `README.md:29`, CI `ci.yml:33-34`, `e2e/auth.setup.ts:10-11`, `src/config/site.ts:119-122`; **login page hiển thị cho cả khách chưa đăng nhập**: `src/app/dang-nhap/page.tsx:34` `Admin: {siteConfig.admin.email} (mật khẩu ADMIN_PASSWORD trong .env).`. Gap: default credential còn hiệu lực trừ khi chủ động đổi; lộ target cho brute-force. Fix: (1) xóa dòng hint ngay; (2) seed throw nếu `ADMIN_PASSWORD` thiếu/rỗng khi `NODE_ENV=production`; (3) rotate password thật trước launch; (4) gỡ credential khỏi README/CI (CI dùng secret riêng).

### D. Phân quyền (Q33–Q42)

**Q33. Authz server-side mọi request đổi trạng thái?** `PARTIAL · MEDIUM` — Evidence: mọi API admin đều `requireAdmin()` — đối soát toàn bộ 6 route `/api/admin/*` + 16 route hỗn hợp đều có guard (`api/admin/settings/route.ts:8`, `api/orders/[id]/route.ts:9`, `api/upload/route.ts:7`…); không nơi nào tin `body.isAdmin` (grep `body.role|body.isAdmin` = 0). Gap: **trang admin RSC không tự check** — `src/app/admin/layout.tsx:3-10` chỉ render nav, các page truy vấn DB thẳng (`admin/don-hang/page.tsx:24`), toàn bộ phụ thuộc 1 lớp `proxy.ts:31-40`. Fix: thêm `requireAdmin()` + redirect trong `admin/layout.tsx` (defense-in-depth 2 lớp).

**Q34. IDOR/BOLA?** `FAIL · BLOCKER` — Evidence: **`/hoa-don/[number]` public**: `src/app/hoa-don/[number]/page.tsx:7-13` không session, `getInvoiceByNumber` trả invoice + order đầy đủ (`invoice.ts:35-38`), số `INV-00001` tuần tự (`invoice.ts:17`), lộ `buyerName/buyerTax/buyerAddress` + item/tổng (`page.tsx:19-32`); `proxy.ts` matcher bắt `/admin` chứ không bắt `/hoa-don`. An toàn: orders list scope theo session (`orders/route.ts:34-41`), addresses `userId: s.id` + delete `id AND userId` (`addresses/route.ts:43`), cart/wishlist/member theo `session.id`. Weak còn lại: `POST /api/returns` không login, chỉ ghép `ATL-xxxxx` đoán được + email (`returns/route.ts:7-15`, `returns.ts:17-19`, code tuần tự `order.ts:190`), không rate-limit. Gap: 1 IDOR công khai + 1 design weakness. Fix: `/hoa-don/[number]` bắt buộc `requireAdmin()` hoặc signed URL TTL; returns: yêu cầu session hoặc token trong email.

**Q35. Multi-tenant filter?** `N/A` — Single-tenant (không có tenantId/orgId trong schema; 1 SiteSetting).

**Q36. Role model tập trung?** `PARTIAL · MEDIUM` — Evidence: tập trung ở `requireAdmin()`/`readSessionToken` + `role` claim; không rải `if role==` lung tung (grep gọn). Gap: role trong JWT 14 ngày, không re-check DB (dẫn từ Q26/Q33). Fix: khi verify session, fetch role từ DB (cache 60s) cho admin routes.

**Q37. Admin routes tách/bảo vệ riêng?** `PASS · LOW` — Evidence: `/admin/*` page qua `proxy.ts:30-41` redirect `/dang-nhap` nếu không phải admin; `/api/admin/*` + method admin đều `requireAdmin` → 403/401; robots disallow `/admin/` (`robots.ts:5`). Gap: 1 lớp duy nhất cho page (Q33). Fix: thêm check ở layout như trên.

**Q38. Object-level + function-level authz?** `PARTIAL · HIGH` — Evidence: function-level OK (toàn bộ API có guard, Q33). Object-level **fail** ở hóa đơn (Q34) và yếu ở returns (Q34); invoices **API** có admin guard (`invoices/route.ts:7,14`) nhưng **trang in thì không**. Gap: trang con không kế thừa guard API. Fix: mọi route đọc resource theo id tuần tự phải verify ownership/sign.

**Q39. Webhook verify signature/timestamp?** `PARTIAL · MEDIUM` — Evidence: VNPay HMAC-SHA512 (`vnpay.ts:57-65,84`), MoMo HMAC-SHA256 (`momo.ts:71-81,94`), SePay **chỉ bearer key** không HMAC body/không timestamp (`sepay.ts:26-30`); outbound có HMAC + `X-EK-Timestamp` (`webhooks.ts:7-8,33-34`); so sánh đều `===` không `timingSafeEqual` (grep = 0); không replay window cho IPN (bù bằng amount + idempotent paid). Gap: SePay weak nhất; thiếu timestamp anti-replay. Fix: SePay lưu IP allowlist hoặc HMAC body nếu gateway hỗ trợ; dùng `timingSafeEqual`.

**Q40. File download/signed URL hết hạn, scoped?** `PASS · LOW` — Evidence: upload đặt tên server-generated trong `public/uploads` (`upload/route.ts:17`, `storage.ts:63-66`) — asset công khai **theo thiết kế** (ảnh SP); S3 dùng SigV4 PUT (`storage.ts:87-96`); không có download endpoint đọc file theo path user. Gap: file admin upload (nếu có ngoài ảnh SP) cũng public theo cùng đường. Fix: chỉ cho extension ảnh (đã có) — chấp nhận được; ghi chú.

**Q41. Mass assignment?** `PASS · INFO` — Evidence: register pick 3 field tay (`register/route.ts:6-10`), `role:"customer"` hardcode server (`auth.ts:49`), checkout zod closed + `userId: session?.id` (`orders/route.ts:19-32,59`), addresses copy allowlist (`addresses/route.ts:21-34`), không endpoint `user.update` từ API (grep = 0), points clamp Math.min (`membership.ts:31-32`). Gap: — Fix: —

**Q42. Impersonation có audit/time-box?** `N/A` — Không có feature impersonation (grep `impersonat|act-as` = 0). (Audit log admin nói chung xem Q148.)

### E. Bảo mật ứng dụng (Q43–Q58)

**Q43. SQL/NoSQL injection?** `PASS · INFO` — Evidence: toàn bộ truy vấn Prisma có parameter; đúng 1 raw SQL trong **test** với bound param (`abandoned.test.ts:19` `$executeRaw\`UPDATE … ${old.getTime()} … ${line.id}\``); search dùng `contains` có bind (`catalog.ts:65-67`); orderBy allowlist (`catalog.ts:70-73`). Gap: — Fix: —

**Q44. XSS?** `PARTIAL · HIGH` — Evidence: 3 chỗ `dangerouslySetInnerHTML` đều là JSON-LD qua `JSON.stringify` **không escape `<`** → `</script>` trong tên/mô tả SP (admin/excel nhập) thoát khỏi script tag → stored XSS toàn trang SP (`src/components/seo/JsonLd.tsx:13,35,49`, gọi ở `san-pham/[slug]/page.tsx:31`, `layout.tsx:49`); mô tả SP render plain text an toàn (`san-pham/[slug]/page.tsx:72`); không có `eval/innerHTML` (grep=0); CSP lại cho `unsafe-inline unsafe-eval` (`proxy.ts:22`) → mất lớp bảo vệ. Gap: breakout + CSP yếu. Fix: escape `\u003c` khi serialize JSON-LD; gỡ `unsafe-eval`.

**Q45. CSRF?** `PARTIAL · MEDIUM` — Evidence: không CSRF token, không Origin check (grep `csrf|checkOrigin` = 0); phòng thủ dựa hoàn toàn vào `SameSite=Lax` (`auth.ts:26`) + JSON content-type (preflight). Gap: browser cũ/same-site attacker vẫn được; không có lớp thứ 2. Fix: check `Origin`/`Sec-Fetch-Site` cho mọi POST mutate (5 dòng ở proxy hoặc helper).

**Q46. SSRF?** `PARTIAL · MEDIUM` — Evidence: admin webhook fetch URL đã lưu, chỉ check scheme `http/https`, **không block 127.0.0.1/169.254.169.254** (`webhooks.ts:28,53-59`) — admin-only nhưng vẫn probe mạng nội bộ; image optimizer `remotePatterns hostname:"**"` (`next.config.ts:7`) → `/_next/image?url=https://…` ép server fetch host bất kỳ (https). Các URL khác là env/constant (GHN/MoMo/VNPay/xAI). Gap: 2 bề mặt. Fix: block dải private IP ở webhook; thu hẹp `remotePatterns` về S3/R2 host.

**Q47. Path traversal?** `PASS · LOW` — Evidence: upload đổi tên `Date.now()-random + ext` do server sinh (`upload/route.ts:17`), ext allowlist (`:13-16`), không nhận path từ client; excel đọc in-memory không ghi file (`excel.ts:26-28`) → không zip-slip. Gap: — Fix: —

**Q48. Upload an toàn?** `PARTIAL · MEDIUM` — Evidence: admin-only (`upload/route.ts:7`), 3MB (`:12`), ext whitelist không SVG (`:13-16`), lưu `public/uploads` (webroot — chấp nhận cho ảnh SP). Gap: **không check magic bytes**/không đối chiếu MIME↔ext (`:19` chỉ pass `file.type` qua, không validate); không scan AV; `/uploads` không có security header (Q19). Fix: check magic bytes (JPEG/PNG/WebP/GIF) trước khi `saveImage`.

**Q49. Command/template/XXE injection?** `PASS · LOW` — Evidence: không `child_process/exec/spawn` trong src (grep chỉ ra `RegExp.exec` ở `sepay.ts:12` + transitive `cross-spawn` trong lockfile); không YAML/XML parser ngoài `xlsx`; theme insert vào CSS bị zod hex regex chặn (`settings.ts:17`). Gap: xlsx ReDoS thuộc Q55. Fix: —

**Q50. Open redirect?** `PASS · LOW` — Evidence: param `next` chỉ được **ghi** ở `proxy.ts:34-37` nhưng **không nơi nào đọc** (grep consumer = 0) — login hardcode push `/admin`/`/tai-khoan` (`dang-nhap/page.tsx:23-25`); payment return redirect về `APP_URL` + path cố định (`momo/return/route.ts:11-12,26`). Gap: dead code `next` gây hiểu nhầm. Fix: xóa hoặc implement có allowlist path nội bộ.

**Q51. Security headers?** `PARTIAL · MEDIUM` — Evidence: `proxy.ts:5-27` set `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS (prod), CSP + `frame-ancestors 'none'`. Gap: CSP `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (yếu, Q44); matcher **loại `/uploads`** → file upload không nhận header (`proxy.ts:45`); không COOP/CORP; HSTS không `preload`. Fix: include `uploads` vào matcher; bỏ `unsafe-eval`; thêm `preload`.

**Q52. HTTPS bắt buộc?** `PARTIAL · MEDIUM` — Evidence: HSTS chỉ khi `NODE_ENV=production` (`proxy.ts:10-12`); **không có redirect app-level http→https**; `APP_URL` default `http://localhost:3000` (`.env.example:7`) — nếu quên set ở VPS thì link reset/sitemap/payment callback ra http; Vercel tự terminate TLS (path deploy chính). Gap: VPS path không có documented reverse-proxy TLS. Fix: trong `check-env` bắt buộc `APP_URL` bắt đầu `https://` khi prod; ghi nginx redirect trong DEPLOY.md.

**Q53. Rate limit các endpoint nhạy cảm?** `PARTIAL · HIGH` — Evidence: **CÓ** login 8, forgot 5, reset 8, checkout 10, reviews 10, newsletter 8, bookings 8, AI 20/phút (các `route.ts` như trên). **THIẾU**: `register`, `contact`, `returns` POST, `products` GET (search), `coupons` POST. Gap: signup spam + search DoS + lead spam; key XFF spoofable; fail-open. Fix: thêm limit cho register (5/ph), contact (5/ph), search (60/ph).

**Q54. Request size/timeout/depth?** `PARTIAL · MEDIUM` — Evidence: limit duy nhất = upload 3MB (`upload/route.ts:12`); excel POST **không giới hạn size** (`excel/route.ts:26` `arrayBuffer()` thẳng); JSON parse `.catch(()=>({}))` — không depth/count limit; `messages` AI mảng tự do (`ai/chat/route.ts:19-20`). Gap: admin DoS qua excel, AI prompt phình. Fix: cap excel ≤ 5MB; zod `.max(50)` cho messages + max length mỗi content.

**Q55. Dependency CVE?** `FAIL · HIGH` — Evidence: `npm audit` — **1 critical + 5 high + 3 moderate**: `vitest` critical (dev-time, UI server file read/path traversal), `xlsx@0.18.5` **high ×2 (prototype pollution + ReDoS), fixAvailable: false**, `prisma/@prisma/config` + `deepmerge-ts` high (fix: prisma 6.12), `vite` high (fix: vitest 5), `esbuild` moderate. Lockfile tồn tại, version pin một phần (`next: 16.3.5` exact, còn lại `^`). Gap: `xlsx` runtime nhận file, không patch npm. Fix: (1) migrate `exceljs` hoặc SheetJS tarball ≥0.20; (2) `npm audit fix` cho prisma/vitest (dev); (3) thêm `npm audit --audit-level=high` vào CI (Q129).

**Q56. Container không root/slim?** `FAIL · MEDIUM` — Evidence: `Dockerfile` **không có `USER node`** → container runner chạy root; base `node:20-alpine` (slim nhưng mutable tag, không digest); không expose Docker socket (compose không mount `/var/run`); compose Postgres publish `5432:5432` với `ek/ek` (profile pg, `docker-compose.yml:22-29`). Gap: process root + DB port mở. Fix: `USER node` trước `CMD`; đừng publish 5432 (chỉ internal network).

**Q57. Deserialization không an toàn?** `PARTIAL · MEDIUM` — Evidence: không yaml.load/pickle (grep=0); `JSON.parse` chỉ trên DB settings (zod guard) + tool-args model (`ai.ts:78`); **`xlsx@0.18.5` prototype pollution** khi parse workbook lạ (admin upload) — thuộc nhóm này. Gap: PP qua excel. Fix: như Q55 (đổi thư viện) hoặc chạy parse trong worker có input sanitize.

**Q58. Admin/metrics/profiler/swagger public?** `PASS · LOW` — Evidence: không có swagger/graphql/metrics endpoint (grep=0); admin bị proxy + requireAdmin (Q33/Q37); Prisma log tắt bớt ở prod (`db.ts:8`). Gap: — Fix: —

### F. Dữ liệu, privacy, compliance (Q59–Q70)

**Q59. Inventory PII?** `PASS · INFO` — Evidence: schema — `User` email/name/passwordHash (`:11-15`), `Order` customer/email/phone/address/note (`:231-245`), `Address` (`:339-341`), `Booking/Lead/Newsletter` (`:437-441,:295-304`), `Invoice` buyerTax CCCD/tax (`:392-394`), `MailLog.body` (Q64), `PasswordReset.tokenHash`; **không lưu số thẻ** (grep cardNumber/cvv/pan = 0 — thanh toán qua gateway hosted). Gap: tax ID + MailLog chưa nêu trong policy (Q60). Fix: bảng PII vào privacy policy.

**Q60. Privacy policy khớp code?** `FAIL · HIGH` — Evidence: `chinh-sach/page.tsx:22-24` ghi rõ *"Khi triển khai production, gắn privacy policy pháp lý…"* = **placeholder thừa nhận**; chưa disclosure chuyển dữ liệu: đơn hàng đầy đủ (order object JSON) → **xAI** (`ai.ts:85-92,124-141`), tên/địa chỉ/SDT → **GHN** (`shipping.ts:80-98`), thanh toán → MoMo/VNPay/SePay, SMTP, Unsplash, Google Fonts. Gap: chính sách ≠ practice. Fix: viết privacy thật liệt kê subprocessor + mục đích + thời gian lưu; link từ footer.

**Q61. Cookie consent chặn tracker trước đồng ý?** `PASS · LOW` — Evidence: **không có tracker nào** (grep gtag/fbq/pixel/hotjar = 0) nên không có gì để chặn trước consent; vẫn có banner `ConsentBanner.tsx:5-41` (localStorage `ek.consent.v1`, dẫn NĐ 13/2023 `settings.ts:97-99`). Gap: consent chưa log (audit trail). Fix: ghi consent vào DB nếu sau này bật analytics.

**Q62. Quy trình xóa tài khoản/data?** `FAIL · HIGH` — Evidence: không endpoint/UI xóa account (grep delete.*account = 0); `tai-khoan` chỉ logout (`tai-khoan/page.tsx:65-67`); admin khách hàng chỉ liệt kê (`admin/khach-hang/page.tsx:4-42`); chỉ test mới `user.delete`. Gap: NĐ13/GDPR-style erasure + portability không có đường đi. Fix: admin tool "xóa/anonymize khách" (giữ Order, ẩn PII) + ghi vào privacy policy quy trình.

**Q63. Data retention TTL?** `FAIL · MEDIUM` — Evidence: cron duy nhất = abandoned-cart **không xóa gì** (`vercel.json:3-8`, `abandoned.ts:53-66`); `MailLog`/`PasswordReset`/`Lead`/`Newsletter` không purge (grep retention|purge = 0); `PasswordReset` chỉ set `used` không xóa (`auth.ts:115-118`). Gap: giữ vô hạn,尤其 MailLog chứa token (Q64). Fix: cron dọn `PasswordReset` >7 ngày, `MailLog.body` reset >24h.

**Q64. PII bị log?** `FAIL · HIGH` — Evidence: **`prisma/seed.ts:222` in admin password plaintext ra stdout/container log**; reset URL chứa **token raw** lưu vĩnh viễn `MailLog.body` (`mail.ts:30,63`) và đọc được qua admin API (`api/leads/route.ts:9`); `mail.ts:32,38,42` log `to=` (email) + subject. Không log body request/password (grep = tốt). Gap: token + password in log. Fix: bỏ in password ở seed; mask token trong MailLog (`…token=***`) hoặc purge sau 15 phút.

**Q65. Encryption in transit/at rest?** `PARTIAL · MEDIUM` — Evidence: in transit = TLS do platform (Vercel) / reverse proxy VPS (chưa doc, Q52); at rest: SQLite file `prisma/dev.db` không mã hóa, Postgres volume không encryption mention, field-level không có (password đã bcrypt — OK); JWT HMAC. Gap: disk/backup encryption chưa bàn. Fix: mã hóa backup (Q145) + ghi rõ TLS termination trong DEPLOY.md.

**Q66. Backup có kiểm soát?** `FAIL · HIGH` — Evidence: **không tồn tại backup** (Q145) → PII trong `ek-data` volume không có bản sao có kiểm soát/ma mã hóa. Gap: mất data + không có backup chứa PII được bảo vệ. Fix: như Q145 + encrypt-at-rest cho backup.

**Q67. Third-party DPA/subprocessors/residency?** `FAIL · MEDIUM` — Evidence: 10+ vendor outbound (bảng ở Q59/Q60: xAI, GHN, MoMo, VNPay, SePay, SMTP, Upstash, S3, VietQR, Unsplash, Google Fonts) — grep `DPA|subprocessor|residency` = 0 trong docs. Gap: không biết data resident đâu, ai sign DPA. Fix: bảng subprocessor trong privacy policy + link DPA từng vendor.

**Q68. Trẻ em/dữ liệu đặc biệt?** `N/A` — Sản phẩm thời trang/nhà cửa general audience, không chủ đích thu thập dữ liệu trẻ em/sức khỏe/sinh trắc học; không thấy trường PII đặc biệt trong schema (ngoại trừ tax ID của người trưởng thành).

**Q69. Export dữ liệu user (portability)?** `FAIL · MEDIUM` — Evidence: không endpoint export data cá nhân (grep export = chỉ Excel sản phẩm `excel.ts:4-23`); admin không có nút export khách. Gap: Art.20-style portability không có. Fix: `GET /api/account/export` trả JSON profile + đơn hàng của chính mình.

**Q70. Access prod DB least-privilege/SSO/audit?** `FAIL · HIGH` — Evidence: không doc truy cập DB (grep `sqlite3|psql|docker exec` trong md = 0); compose Postgres `POSTGRES_PASSWORD: ek` + `ports: "5432:5432"` (`docker-compose.yml:22-29`); dùng chung admin account app để vào DB; không SSO/audit DB access. Gap: 1 user `admin` share + port mở. Fix: chỉ truy cập qua SSH tunnel/docker exec; đổi mật khẩu PG mạnh; không publish port.

### G. Database, migration & toàn vẹn (Q71–Q80)

**Q71. Migration versioned/reversible?** `PARTIAL · MEDIUM` — Evidence: 17 migration versioned trong `prisma/migrations/` + `migration_lock.toml` (sqlite); Docker `migrate deploy` lúc boot (`Dockerfile:24`); CI `migrate deploy` (`ci.yml:18`). Gap: up-only (bình thường với Prisma) nhưng **README khuyến nghị `db push`** (`README.md:22`) bypass history; không có rollback/restore story; SQLite SQL không chạy thẳng lên Postgres (`DEPLOY.md:30`). Fix: thống nhất docs = `migrate deploy` cho mọi env giống prod; ghi rõ đường rollback = restore backup.

**Q72. Schema constraint thật?** `PARTIAL · MEDIUM` — Evidence: có FK/`@unique`/NOT NULL đầy đủ (email/slug/code unique, `schema.prisma` nhiều chỗ); **không có CHECK nào** (grep CHECK migrations = 0): `price/stock/balance/total` chỉ NOT NULL (`migration.sql:28,34`); stock âm chỉ chặn ở app qua `updateMany stock:{gte}` (`order.ts:194-198`), admin warehouse set thẳng số (`warehouse.ts:22-27`). Gap: money/stock invariant không ở DB. Fix: thêm CHECK `stock>=0`, `balance>=0` (Prisma custom constraint/SQL post-migrate).

**Q73. Index hot path?** `PARTIAL · MEDIUM` — Evidence: có index Product/Order(email,status)/Coupon/… (`schema.prisma` @@index list); **thiếu `@@index([userId])` trên `Order`** (query `order.ts:26` filter userId qua OR), `PasswordReset.userId` (`:362-370` chỉ unique tokenHash), `Booking.userId`, `MailLog` **không index nào** (dedupe `order.ts:322-324` full scan), `CartLine.updatedAt` (cron abandoned `abandoned.ts:20-21` full scan), search `contains` = LIKE %…% full scan (`catalog.ts:67`). Gap: full scan dần dần. Fix: thêm 4 index trên + cân nhắc FTS/`searchText` snapshot.

**Q74. N+1/pagination bắt buộc?** `PARTIAL · MEDIUM` — Evidence: products paginate `Math.min(48,…)` (`catalog.ts:47-50`) + `include` items theo batch; **admin orders KHÔNG take/skip** (`order.ts:41-46`) — `admin/don-hang/page.tsx:24` render toàn bộ; `GET /api/orders` admin cũng trả hết. Gap: admin list phình vô hạn. Fix: `take: 100` + cursor cho admin orders.

**Q75. Transaction đúng chỗ cho tiền/tồn/trạng thái?** `FAIL · BLOCKER` — Evidence: checkout có `$transaction` tốt (seq+stock guard+order+coupon+gift+clear, `order.ts:188-282`); **NHƯNG**: (1) **discount điểm tính từ input client không kiểm tra số dư** — `order.ts:166-167` `pointsDiscount = discountFromPoints(input.pointsToUse)` chạy trước, `spendPoints` (clamp Math.min số dư) chỉ chạy **sau commit** `:292-293` → user 0 điểm gửi `pointsToUse:100000` vẫn được giảm (rate `vndPerPoint:10` → giảm 1.000.000đ), schema `z.number().optional()` không max (`orders/route.ts:30`); **không có test membership** (Q122); (2) coupon `maxUses` count-check **ngoài tx** (`coupon.ts:16-18`) → TOCTOU vượt hạn; (3) refund cap read-then-create không tx (`refunds.ts:22-25`); (4) MoMo IPN replay trả `ok:true` → route refire webhook `order.paid` (`momo.ts:100` + `api/payments/momo/ipn/route.ts:22-27`). Gap: 4 lỗ money-path. Fix: clamp+validate points trong zod & trong tx; re-check coupon count trong tx; refund cap trong tx; MoMo already-paid trả `ok:false` hoặc gate webhook theo transition.

**Q76. Soft-delete conflict?** `N/A` — Không dùng soft-delete (không `deletedAt/isDeleted`; mọi delete là hard, `seed.ts:29-52`, `coupon.ts:65`) → không có xung đột unique & không có query lọc deleted cần kiểm.

**Q77. Connection pool/timeout/leak?** `PARTIAL · MEDIUM` — Evidence: `db.ts:5-9` singleton Prisma, **không** `pool_timeout/connection_limit` (grep = 0); default `file:./dev.db` (SQLite single-writer) trong khi `.env.example:37` đã "cho nhiều replica" → mâu thuẫn; không doc giới hạn instance. Gap: multi-instance + SQLite = lock; Postgres không guidance pool. Fix: DEPLOY.md: "SQLite = 1 instance; lên >1 thì bắt buộc Postgres + connection_limit".

**Q78. Seed/demo chạy nhầm prod?** `FAIL · HIGH` — Evidence: `seed.ts` **không có guard NODE_ENV/DATABASE_URL** (grep NODE_ENV = 0), mở đầu là `deleteMany()` **toàn bộ 30+ bảng kể cả order/user/invoice** (`seed.ts:29-52`); `db:reset` = `prisma db push --force-reset && seed` (`package.json:14`); **DEPLOY.md:18 hướng dẫn `docker compose exec app npx tsx prisma/seed.ts` lần đầu** và checklist `:62` *"Đổi ADMIN_PASSWORD, **seed lại***"* → theo đúng docs sẽ **xóa sạch data production**; seed in password (`:222`). (Dockerfile CMD không auto-seed — bớt 1 đường.) Gap: guard + docs sai. Fix: `if (NODE_ENV==="production" && !process.env.ALLOW_SEED) throw`; sửa DEPLOY checklist thành "đổi password qua SQL/admin, KHÔNG seed lại"; tách `db:reset` khỏi script dùng tay.

**Q79. Zero-downtime migrate?** `PARTIAL · MEDIUM` — Evidence: Prisma up-only OK cho additive change; nhưng một số migration SQLite **rebuild table** (`PRAGMA foreign_keys=OFF` + RENAME, `20260921193348_refunds/migration.sql:14-48`) → lock; `migrate deploy` chạy **mỗi lần boot container** (`Dockerfile:24`) không phân biệt phase. Gap: không doc expand/contract, migration lớn sẽ lock shop. Fix: split migration additive→backfill→constraint; migrate chạy 1 lần job riêng trước khi app nhận traffic.

**Q80. Multi-region/replica read-your-write?** `N/A` — Không dùng read replica/multi-region (một app một DB; không có replica config nào trong repo).

### H. API, backend & integration (Q81–Q90)

**Q81. Contract/OpenAPI/versioning?** `FAIL · MEDIUM` — Evidence: không có file OpenAPI/proto (grep openapi = chỉ schema URL vercel.json); 47 route đều không `/v1` (glob `src/app/api/**`); client `fetch` tự do. Gap: breaking change không kiểm soát, không có contract test. Fix: tối thiểu export OpenAPI từ zod (`zod-to-openapi`) cho các route public; ghi "internal API, breaking = bump".

**Q82. Lỗi không lộ stack/query/path?** `PARTIAL · LOW` — Evidence: không `e.stack` trong response (grep=0) — tốt; nhưng trả `e.message` thô, nhất là AI route 500 (`api/ai/chat/route.ts:25`) và Prisma errors có thể mang tên bảng. Gap: message nội bộ + không có mã lỗi ổn định. Fix: mapping `{code:"E_INTERNAL"}` + log server.

**Q83. Idempotency key cho POST quan trọng?** `FAIL · MEDIUM` — Evidence: checkout không `Idempotency-Key` (chỉ rate-limit 10/ph, `orders/route.ts:45`) → double-POST tạo 2 đơn (mỗi đơn 1 seq riêng `order.ts:188-190`); IPN inbound idempotent OK theo sequential (`vnpay.ts:98`, `momo.ts:100`, `sepay.ts:35`) nhưng MoMo refire webhook (Q75.4); guest không clear cart pair-binding. Gap: duplicate order + duplicate webhook. Fix: idempotency key (hash cartId+items trong 5 phút) hoặc unique constraint theo client token.

**Q84. Pagination/filter/sort max page size?** `PARTIAL · MEDIUM` — Evidence: products `Math.min(48, …)` (`catalog.ts:47-50`); sort allowlist (`:70-73`); **admin orders không pagination** (Q74), `listProducts ids in (...)` không cap số id. Gap: admin + ids list. Fix: cap `ids.length ≤ 100`; paginate orders admin.

**Q85. Webhook outbound retry+backoff+signature; inbound verify+idempotent?** `PARTIAL · MEDIUM` — Evidence: outbound **có HMAC+timestamp** (`webhooks.ts:7-9`) nhưng **1 lần thử duy nhất**, timeout 8s, không retry/DLQ, không lưu kết quả (`:12-46`); inbound verify OK (Q39), idempotent mostly (trừ MoMo refire). Gap: mất event khi receiver chập 1 lần. Fix: retry 3 lần exponential + bảng `WebhookDelivery` log.

**Q86. Job/queue poison/DLQ/visibility?** `N/A` — Không có queue infra (deps không có BullMQ/Inngest; chỉ cron HTTP 1 job) → không có poison message/DLQ để đánh giá. (Rủi ro cron failure xem Q87.)

**Q87. Cron timezone/không trùng khi scale?** `PARTIAL · LOW` — Evidence: Vercel cron `0 1 * * *` UTC (`vercel.json:3-8`); VPS crontab example `0 8 * * *` (`DEPLOY.md:55`); dedupe gửi mail 72h qua MailLog tag (`abandoned.ts:44-48`) → chạy trùng 2 instance vẫn không spam mail; **không có leader lock**. Gap: job chạy 2 lần (tốn compute, an toàn mail nhờ dedupe); không doc timezone. Fix: ghi rõ UTC; thêm idempotency key theo ngày trong job.

**Q88. Timeout giữa service/retry jitter/circuit breaker?** `PARTIAL · MEDIUM` — Evidence: webhook outbound có `AbortSignal.timeout(8000)` (`webhooks.ts:37`); **GHN/MoMo/VNPay/xAI/S3 fetch không thấy timeout tường minh** (grep AbortSignal chỉ webhooks + rate-limit fetch?) — mail nodemailer không set `connectionTimeout`. Gap: vendor treo → treo request user (đặc biệt SMTP đồng bộ trong checkout, Q116). Fix: `AbortSignal.timeout` cho mọi outbound; SMTP `connectionTimeout: 5000`.

**Q89. Object storage private/signed URL ngắn?** `PASS · LOW` — Evidence: mặc định local `public/uploads` (asset ảnh SP **công khai theo thiết kế**, `storage.ts:17-19`); S3/R2 optional với SigV4 (`storage.ts:87-96`); không list public bucket (không có list endpoint); bucket policy ngoài repo. Gap: nếu dùng S3 public-read thì ảnh public — đúng nhu cầu. Fix: ghi chú trong DEPLOY (bucket chỉ public-read prefix `/uploads`).

**Q90. GraphQL depth/introspection?** `N/A` — Không có GraphQL (REST thuần).

### I. Frontend, UX, web client (Q91–Q100)

**Q91. Form validate client + server, lỗi rõ, không mất dữ liệu?** `PARTIAL · MEDIUM` — Evidence: checkout server zod đầy đủ (`orders/route.ts:19-31`), client `required` + giữ value khi lỗi (`thanh-toan/page.tsx:80-105` không reset); **nhưng**: login/register/contact server không zod (Q22), contact nhận "email" bất kỳ (`api/contact/route.ts:5-12`); lỗi checkout render **2 chỗ** (`thanh-toan/page.tsx:239` và `:271`); `place()` **không try/finally** → network fail làm nút "Đang ghi đơn…" **treo vĩnh viễn** (`:80-104`); submit login không try/catch (`dang-nhap/page.tsx:15-25`). Gap: infinite pending + validation lệch. Fix: try/finally everywhere; zod đồng nhất; gộp error slot.

**Q92. Loading/empty/error/offline?** `PARTIAL · MEDIUM` — Evidence: empty state tốt (8+ ví dụ: `gio-hang/page.tsx:16-19`, `ProductGrid.tsx:5-10`, admin `don-hang:74`); **không có** skeleton/`loading.tsx` (glob = 0), **không có `error.tsx`/`global-error.tsx`** (glob = 0) — trang home/list truy vấn DB không catch (`page.tsy:5-10`, `san-pham/page.tsx:15-18`) → 500 mặc định Next; không offline detection (grep = 0); wishlist `.catch(()=>setProducts([]))` lẫn loading vs empty (`yeu-thich:18`). Gap: spinner/treo + 500 thô. Fix: thêm `error.tsx` + `loading.tsx` cho 3 route chính; try/finally (Q91).

**Q93. Responsive thật?** `PASS · INFO` — Evidence: hamburger mobile `Header.tsx:55-61,123-149`, grid `md:/lg:` toàn site (`HomeView.tsx:25,78`, `thanh-toan/page.tsx:130,154`, `ProductGrid.tsx:13`), nav ẩn desktop ở mobile (`Header.tsx:67`). Gap: admin nav chưa kiểm mobile kỹ. Fix: — 

**Q94. Cross-browser?** `FAIL · LOW` — Evidence: Playwright chỉ `channel: "chrome"` (`playwright.config.ts:5-8`); không có evidence test Safari iOS/Firefox/Edge (config/spec không mention). Gap: không có bằng chứng test. Fix: chạy thêm `npx playwright test --project=webkit` smoke hoặc checklist test tay Safari/Firefox trước launch.

**Q95. Favicon/title/meta/OG còn placeholder?** `PARTIAL · LOW` — Evidence: title/description/OG vi thật từ DB (`layout.tsx:22-36`), fonts vi subsets (`:10-20`); **favicon = default create-next-app** (`src/app/favicon.ico` 25931 B cùng timestamp scaffold); **không `metadataBase`**, không twitter card, không OG image (grep metadataBase = 0). Gap: share link ra trỏ sai/ icon Next. Fix: thay favicon brand; thêm `metadataBase: APP_URL` + `twitter` + `ogImage`.

**Q96. 404/500 branded?** `PARTIAL · LOW` — Evidence: `not-found.tsx:5-10` có "404 / Không tìm thấy trang / Về trang chủ" (OK); **không có `error.tsx`/`global-error.tsx`** (Q92). Gap: 500 = default shell Next, không về home. Fix: thêm `error.tsx` branded có nút retry/home.

**Q97. Hardcode localhost/staging trong client prod?** `PASS · LOW` — Evidence: mọi `http://localhost:3000` đều là fallback server-side `process.env.APP_URL ||` (`vnpay.ts:31`, `momo.ts:40`, `auth.ts:93`, `robots.ts:4`, `sitemap.ts:5`, `JsonLd.tsx:3`); client components không hardcode URL (grep trong `components/` = chỉ APP_URL-less fetch relative). Gap: deploy thiếu `APP_URL` → sitemap/payment URL ra localhost âm thầm. Fix: fail-fast env (Q16/Q52).

**Q98. Source map prod public?** `PASS · INFO` — Evidence: `next.config.ts` không set `productionBrowserSourceMaps` (default off); `find .next/static -name "*.map"` = **0**; server `.map` chỉ trong build output (không serve public). Gap: — Fix: —

**Q99. Deep link/universal link verify domain?** `N/A` — Web thuần, không có mobile app/ applink (không file `assetlinks.json`/`apple-app-site-association` vì không có app).

**Q100. PWA/manifest?** `N/A` — Không khai báo PWA/manifest (glob manifest = 0) → không có gì để sai; (icon mặc định đã ghi ở Q95).

### J. Accessibility & i18n (Q101–Q108)

**Q101. Semantic HTML/label/focus/div giả button?** `FAIL · MEDIUM` — Evidence: **0 `htmlFor` trong toàn repo** (grep = 0) — input chỉ có placeholder (`dang-nhap:38-41`, `lien-he:40-43`, `thanh-toan:155-159`); `outline-none` **xóa focus ring** không thay thế (`Header.tsx:90,131`, `NewsletterForm.tsx:26`) và **0 `focus-visible`** (grep=0); button/div: **tốt** — 0 `<div onClick>` (grep=0), ~50 onClick đều trên `<button>/<Link>`; newsletter feedback chỉ `sr-only` → người sighted **không thấy xác nhận** (`NewsletterForm.tsx:29`). Gap: label association + focus visibility. Fix: thêm `<label htmlFor>` cho 6 form chính; đổi `outline-none` → `focus-visible:ring`.

**Q102. Contrast AA?** `UNKNOWN · MEDIUM` — Evidence: không có axe/Lighthouse/đo contrast nào trong repo (grep contrast/axe = 0); theme brand từ DB (`settings.ts:17` hex) — không thể kết luận PASS/FAIL mà không đo. Gap: thiếu evidence. Fix: chạy Lighthouse/axe trên home + checkout, ghi kết quả vào docs.

**Q103. Alt ảnh/icon button accessible name?** `PASS · INFO` — Evidence: `SmartImage.tsx:20` **bắt buộc prop `alt: string`**, truyền vào `<Image alt>` (`:31`), fallback `aria-label={alt}` (`:26`); call site đều có alt thật (`gio-hang:35`, `HomeView:44`); icon button có `aria-label` (8 chỗ: `Header.tsx:58,100,109,112`, `AddToCart:86`, `ProductCard:51`, `ChatWidget:40`). Gap: — Fix: —

**Q104. Modal trap focus + ESC?** `FAIL · MEDIUM` — Evidence: grep `role="dialog"|aria-modal|Escape|onKeyDown|focus trap` = **0**; ChatWidget panel là `<div>` overlay thuần, chỉ đóng bằng nút (`ChatWidget.tsx:36-65`), focus không di chuyển. Gap: không dialog semantics. Fix: implement focus trap + ESC cho ChatWidget (hoặc dùng `<dialog>` native).

**Q105. prefers-reduced-motion?** `FAIL · LOW` — Evidence: `globals.css` (47 dòng) **không có** `@media (prefers-reduced-motion)` (grep = 0); animation có thật: `ProductCard.tsx:31` `transition duration-500 group-hover:scale-105`, `:58` translate/opacity, `HomeView.tsx:85,159`. Gap: người dị ứng motion vẫn bị animate. Fix: 1 block media query tắt transition/animation.

**Q106. i18n/encoding/plural/date?** `PASS · INFO` — Evidence: sản phẩm tiếng Việt theo thiết kế — `<html lang="vi">` (`layout.tsx:47`), OG `locale vi_VN` (`:34`); tiền `Intl.NumberFormat("vi-VN","VND")` (`format.ts:5-11`, `site.ts:124-126`); UTF-8 mặc định. Gap: date xem Q107. Fix: —

**Q107. Timezone nhất quán?** `PARTIAL · LOW` — Evidence: money/relative time OK (dùng `Date.now()` diff cho abandoned); **display date cắt UTC ISO**: `map.ts:193` `toISOString().slice(0,10)` → đơn tối UTC+7 hiển thị lệch ngày ở admin (`admin/don-hang/page.tsx:55` render thẳng); `toLocaleString("vi-VN")` **không truyền timeZone** → phụ thuộc TZ server (`admin/dat-lich/page.tsx:26`). Gap: lệch ngày/tz. Fix: `toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})`; formatter dùng `sv-SE`/`vi-VN` date-parts không slice UTC.

**Q108. RTL/font/overflow text dài?** `PASS · LOW` — Evidence: thị trường VN (LTR) → RTL không áp dụng; font `Be_Vietnam_Pro`/`Noto_Serif` subsets vi (`layout.tsx:10-20`); overflow: grid + truncate các card SP (ví dụ `ProductCard`). Gap: chưa audit kỹ overflow chuỗi rất dài (tên SP admin nhập). Fix: test 1 case tên 200 ký tự.

### K. Performance & scale (Q109–Q118)

**Q109. Ngân sách hiệu năng/Lighthouse evidence?** `FAIL · MEDIUM` — Evidence: grep Lighthouse/WebPageTest/budget trong repo = 0; không artifact CI perf. Gap: không có evidence LCP/INP/CLS. Fix: chạy Lighthouse trên home/PDP/checkout, commit screenshot + budget vào docs; ngưỡng checklist LCP<2.5s.

**Q110. Ảnh WebP/AVIF/đúng size/lazy?** `PASS · INFO` — Evidence: `next/image` qua `SmartImage` có `fill` + `sizes` default `"(max-width:768px) 100vw, 50vw"` (`SmartImage.tsx:29-36`) + `priority` cho hero (`HomeView.tsx:42-48`) + thumbs `sizes="80px"` (`gio-hang:35`); Next optimizer xuất webp/avif mặc định. Gap: remote host `**` (Q46) — perf không allowlist. Fix: —

**Q111. JS/CSS critical path code-split?** `PARTIAL · LOW` — Evidence: **0 `next/dynamic`/`React.lazy`** (grep=0); `ChatWidget` `"use client"` luôn bundle qua `AppChrome.tsx:38`; nặng nhất (xlsx, openai) đã ở server (`excel/route`, `ai.ts`) — good; landing không bundle library lớn. Gap: chat widget + providers (`providers.tsx` 4 client provider) load từ đầu. Fix: `next/dynamic` ChatWidget sau interaction.

**Q112. Cache-Control/ETag/CDN?** `PARTIAL · LOW` — Evidence: **không** `headers()` custom trong `next.config.ts` (chỉ security qua proxy); data cache `unstable_cache(..., {revalidate:60, tags})` cho catalog/settings (`catalog.ts:24-34`, `settings.ts:114,162`) + `revalidateTag` khi ghi; user pages dùng cookie → dynamic (an toàn, không cache chéo user); CDN = default của Vercel (không config edge cache explicit). Gap: static asset cache policy chưa assert; không doc. Fix: thêm `headers()` `/_next/static: immutable`.

**Q113. API hot path p95 + index + cache?** `PARTIAL · MEDIUM` — Evidence: catalog cache 60s + index product tốt; **không đặt p95 target nào** (grep p95/latency = 0); các chỗ đắt chưa cache: admin orders full scan (Q74), search LIKE full scan (Q73), MailLog scan (Q73). Gap: không đo + thiếu index. Fix: thêm index (Q73) + ghi p95 target (ví dụ <300ms list SP) vào runbook.

**Q114. Load test kịch bản launch?** `FAIL · MEDIUM` — Evidence: không có k6/Artillery/artillery config (glob = 0); E2E là functional không phải load. Gap: chỉ "chạy được trên laptop/CI 1 worker". Fix: script k6 100 VU × 10 phút trên checkout+PDP trước launch.

**Q115. Pagination bắt buộc, không GET /all?** `PASS · LOW` — Evidence: public `GET /api/products` paginate cap 48 (`catalog.ts:47-50`); không endpoint `/all` cho public (glob); danh mục số lượng nhỏ. Gap: admin orders unbounded (đã ghi Q74/Q84). Fix: —

**Q116. Background work nặng không block request?** `FAIL · MEDIUM` — Evidence: **SMTP gửi đồng bộ trong luồng checkout** — `events.ts:17-24` `await mailOrderCreated` gọi từ `order.ts:288` **trước khi `createOrder` return** → response chờ SMTP (mail không throw nhưng vẫn chờ, `mail.ts:25-44`); abandoned cron gửi tuần tự `await sendMail` mỗi cart (`abandoned.ts:56-64`) — cron thì chấp nhận được. Gap: latency checkout theo SMTP + timeout vendor (Q88). Fix: `await Promise.resolve().then(send)` fire-and-forget (đã có MailLog) hoặc queue tối thiểu in-process.

**Q117. Cold start serverless chấp nhận được?** `PARTIAL · MEDIUM` — Evidence: deploy Vercel khả năng (`vercel.json`), **nhưng** default DB = SQLite `file:./dev.db` — Vercel FS **thường ephemeral** (chính repo cảnh báo về upload: `storage.ts:8` "Vercel filesystem mất sau mỗi deploy") trong khi DEPLOY chỉ nói chung chung "Vercel: thêm env DATABASE_URL" (`DEPLOY.md:46-48`) + "migration SQLite không chạy thẳng lên Postgres" (`:30`); không đo cold start. Gap: deploy sai env = mất DB; không có measurement. Fix: DEPLOY.md tách rõ 2 đường: (A) VPS+SQLite+volume, (B) Vercel+Postgres bắt buộc — checklist chặn nhầm lẫn.

**Q118. Giới hạn AI/LLM quota không cháy bill?** `FAIL · HIGH` — Evidence: AI chat **public** (không auth, `ai/chat/route.ts` không `getSession`), chỉ rate-limit **20 req/ph/IP** (`:7`); `messages` không giới hạn số lượng/độ dài (`:19-20`); **không `max_tokens`, không cost cap, không budget** (grep max_tokens|budget = 0 trong `ai.ts`); IP key spoofable (Q18); agent loop ≤6 bước nhưng chat 1-lần vẫn nhận prompt MB. Gap: burn XAI bill ngày 1. Fix: zod `messages.array().max(20)` + content `.max(4000)`; `max_tokens: 512`; daily budget theo IP/user; bật `aiChatbot` flag **off** mặc định đến khi có cap.

### L. Testing & chất lượng (Q119–Q128)

**Q119. Test happy path critical journey?** `PASS · INFO` — Evidence: 21 unit test files phủ checkout/stock/coupon/giftcard/payment (`src/server/*.test.ts`); E2E Playwright: mua COD full flow (`e2e/shop.spec.ts:10-33`), search không dấu (`:35-38`), admin login+trang đơn (`admin.spec.ts`), giftcard/returns/webhook (`ops.spec.ts`); CI chạy cả unit + E2E (`ci.yml:24-31`). Gap: không E2E login-sai/404/payment redirect. Fix: thêm 1 spec negative login.

**Q120. Test authz/IDOR?** `FAIL · MEDIUM` — Evidence: chỉ có `requireAdmin` chặn customer ở **unit** (`auth.test.ts:82-90`); grep `401|403|ownership` trong test = **0** — **không test** "user A không xem đơn/địa chỉ/hóa đơn user B"; E2E không test anonymous vào `/admin` bị redirect (`admin.spec.ts:9-10` chỉ test admin **đã login** thấy heading). Gap: đúng chỗ rủi ro cao nhất (và đã có bug thật Q34) lại không có test. Fix: unit test invoice page guard + E2E anonymous `/admin` → `/dang-nhap`.

**Q121. Regression payment/webhook/migration?** `PARTIAL · LOW` — Evidence: **payment/webhook có** — `vnpay.test.ts` (IPN 97/01/04/02/00), `momo.test.ts` (checksum/amount/idempotent), `sepay.test.ts`, `webhooks.test.ts` (signing), `refunds.test.ts`; **migration regression không có test** (không test schema sau migrate); MoMo refire bug (Q75) lọt vì test không cover route dispatch. Gap: migration + route-level payment dispatch. Fix: test "replay IPN không refire webhook"; smoke test sau migrate trong CI.

**Q122. Chỗ rủi ro có test?** `FAIL · HIGH` — Evidence: AGENTS.md:40-41 bắt buộc test "coupon, guard hết hàng, IPN, VAT, gift card, returns" — **đều có**; **NHƯNG điểm tích lũy (membership) — money path — KHÔNG test** (glob `membership*.test.ts` = 0) dù là nơi có bug tính tiền thật (Q75); không coverage config (`vitest.config.ts` không block coverage, không cài `@vitest/coverage-v8`). Gap: rủi ro tiền cao nhất không có test. Fix: viết `membership.test.ts` (0 điểm không được giảm, clamp số dư, round-trip grant/spend) + bật coverage threshold cho `src/server`.

**Q123. E2E CI ổn định, không ignore flaky?** `PARTIAL · LOW` — Evidence: CI cài Chrome + chạy E2E trên PR (`ci.yml:26-31`), config `workers:1`, `retries: CI?1:0`, `fullyParallel:false` (`playwright.config.ts:5-8`) — ổn định nhưng **`sleep 8` thay vì healthcheck** (`ci.yml:30`) → race thỉnh thoảng fail. Gap: readiness check. Fix: thay sleep bằng poll `GET /api/health` (liên kết Q144).

**Q124. Fixture/test user ship vào prod?** `FAIL · HIGH` — Evidence: seed fallback admin123 chạy thật nếu env thiếu (`seed.ts:55`), seed in password (`:222`); E2E dùng env `ADMIN_*` với default admin123 (`e2e/auth.setup.ts:10-11`); CI hardcode `admin123` trong workflow (`ci.yml:33-34`) — ai đọc repo cũng biết. Gap: giống Q32/Q78 — default user có thể lên prod. Fix: như Q32 + tách credential CI vào GitHub Secrets.

**Q125. Smoke test post-deploy?** `FAIL · MEDIUM` — Evidence: không có script smoke/deploy check (grep smoke = 0); health endpoint cũng không (Q144). Gap: deploy xong không ai verify. Fix: `scripts/smoke.sh` gọi home + login + 1 API sau deploy;加入 pipeline.

**Q126. Typecheck/lint/format gate CI?** `PARTIAL · MEDIUM` — Evidence: CI có `npx tsc --noEmit` + `npm test` + `build` (`ci.yml:24-31`); **không có `npm run lint`** (script local `package.json:9` nhưng workflow không gọi), **không format check**, **không npm audit** (Q129). Gap: lint không gate. Fix: thêm `npm run lint` + `npm audit --audit-level=high` vào `ci.yml`.

**Q127. Contract test FE–API tách repo?** `N/A` — Frontend + API cùng repo Next monolith (không tách repo) → contract test dạng Pact/openapi-diff không áp dụng (thin gaps đã ghi ở Q81).

**Q128. Failure path graceful (DB/mailer/S3 down)?** `PARTIAL · MEDIUM` — Evidence: **mail graceful có test** (`mail.test.ts`: SMTP sai → status failed, không throw — `mail.ts:25-44`); **S3 graceful** (`storage.ts:62-101` fallback local/`ok:false`); **DB**: layout catch `listCategories().catch(()=>[])` (`layout.tsy:39-42`) nhưng **home + PDP không catch** (`page.tsx:5-10`, `san-pham/page.tsx:15-18`) + không `error.tsx` → 500 mặc định, không branded; client fetch nuốt lỗi im lặng (`thanh-toan:49` `.catch(()=>{})` → hiện empty như bình thường). Gap: DB down = 500 thô ở route chính. Fix: error.tsx + catch ở 2 page + phân biệt "empty" vs "error".

### M. CI/CD, release & rollback (Q129–Q138)

**Q129. CI test+lint+audit trước merge/deploy?** `PARTIAL · MEDIUM` — Evidence: `ci.yml` có tsc/test/build/E2E; **thiếu lint + npm audit** (Q126/Q55); không có deploy job. Gap: PR merge mà lint fail/CVE cao vẫn vào. Fix: thêm 2 bước trên.

**Q130. Deploy có pipeline, không tay?** `FAIL · MEDIUM` — Evidence: không workflow deploy (glob `.github/workflows` = chỉ `ci.yml`); đường deploy VPS = `DEPLOY.md:23-26` **`git pull && docker compose up -d --build` tay**; Vercel auto-deploy theo branch (implicit, không config trong repo). Gap: 100% thủ công cho VPS, không có gì repeatable. Fix: GitHub Action deploy sau tag/release (digest image), hoặc ít nhất script `deploy.sh` versioned.

**Q131. Artifact immutable?** `FAIL · MEDIUM` — Evidence: `Dockerfile:2` `FROM node:20-alpine` **mutable tag, không digest**; không có release tag/image registry (git log không tag); deploy "code trên nhánh hiện tại" — không pin commit SHA trong runtime. Gap: build lại = khác nhau tùy thời điểm. Fix: pin digest base image + build image theo commit SHA, deploy bằng SHA.

**Q132. Staging gần prod?** `FAIL · MEDIUM` — Evidence: không có staging/preview env (không config, không docs; Q5); CI seed data demo trên SQLite riêng — không phải data shape prod. Gap: đổi migration/SMTP/payment lần đầu = trên production. Fix: 1 Vercel preview + Postgres branch (Neon) hoặc docker profile staging tối thiểu.

**Q133. Rollback plan < X phút?** `FAIL · HIGH` — Evidence: grep `rollback` trong *.md = **0**; DEPLOY chỉ có forward `git pull && rebuild` (`:23-26`); không image registry để quay lại; migration up-only chạy khi boot (`Dockerfile:24`) → revert code chưa đủ nếu schema đã đổi. Gap: không có đường lui. Fix: ghi runbook 1 trang: `git checkout <prev SHA> && compose up -d --build` + điều kiện khi nào cần restore backup; giữ N image gần nhất.

**Q134. Migration + deploy thứ tự an toàn?** `PARTIAL · MEDIUM` — Evidence: Docker `migrate deploy` **trong cùng lệnh boot** trước `npm start` (`Dockerfile:24`) — đúng thứ tự expand-trước khi serve, nhưng **mỗi boot đều migrate** + không có phase expand/contract riêng cho change breaking; CI migrate trên SQLite dev. Gap: migration lớn + code 1 bước. Fix: tách job migrate chạy 1 lần (release phase) rồi start app.

**Q135. Production deploy có approval/protected branch?** `UNKNOWN · MEDIUM` — Evidence: repo **không chứa** evidence về branch protection/required review (đây là setting GitHub server-side, không trong git); `ci.yml` chạy trên `push: main` + PR nhưng không có environment approval. Gap: không xác minh được từ code. Fix: người audit tay vào Settings→Branches xác nhận `main` require PR + review; thêm GitHub Environment `production` với required reviewer.

**Q136. Secrets CI least-privilege, không log secret?** `PARTIAL · MEDIUM` — Evidence: repo không có secret value thật (Q9); nhưng **`admin123` hardcode trong `ci.yml:33-34`** (credentialpublic vì là default đã publish ở README); không có secret scanning (gitleaks) trong CI; Actions chỉ dùng quyền default checkout. Gap: credential + thiếu secret scan. Fix: move `ADMIN_*` sang GitHub Secrets; thêm gitleaks step.

**Q137. Preview env PR che index/auth?** `N/A` — Không cấu hình PR preview environment nào trong repo (không Vercel preview config, không deploy workflow) → không có bề mặt leak index/auth qua preview. (Thiếu preview nói chung đã đánh FAIL ở Q132.)

**Q138. Feature flag mặc định an toàn?** `PASS · LOW` — Evidence: payment gateway **default OFF** — `momo.enabled:false`, `vnpay.enabled:false`, `zalopay.enabled:false` (`site.ts:100-102`), `ghn:false` (`site.ts` features); COD/bankTransfer on (an toàn, không gọi vendor); `aiChatbot:true` nhưng không key thì 503 (`ai.ts:7-9`, route 503) — fail-closed theo hướng an toàn tiền. Gap: AI flag on khi thiếu key → widget hiện nhưng 503 (UX, không phải rủi ro tiền). Fix:默认 `aiChatbot:false` cho cleaner launch.

### N. Observability, incident & backup (Q139–Q150)

**Q139. Error tracking bật trên prod?** `FAIL · HIGH` — Evidence: grep `sentry|datadog|bugsnag|otlp|captureException` trong src = **0**; dependency không có error tracker (`package.json`); log = 4 dòng `console.*` (`mail.ts:32,38,42`, `rate-limit.ts:50`). Gap: lỗi prod không ai biết cho đến khi khách báo. Fix: cài Sentry (`@sentry/nextjs`) với PII scrub, sample 100% ngày launch.

**Q140. Structured log request id/user id?** `FAIL · MEDIUM` — Evidence: không JSON log, không `x-request-id`/traceId cho HTTP (grep requestId = chỉ MoMo gateway field `momo.ts:30,44,117`); log free-text console; user id không xuất hiện trong log. Gap: không correlate request lỗi. Fix: middleware sinh `x-request-id`, wrap logger JSON `{ts,level,reqId,userId,route,msg}`.

**Q141. Metrics latency/error/saturation?** `FAIL · MEDIUM` — Evidence: không `/api/metrics`, không prom-client, không provider metrics (grep = 0); chỉ có KPI business trong admin (`order.ts:384-399`). Gap: không biết error rate/DB conn. Fix: tối thiểu Sentry performance + Vercel analytics / 1 exporter.

**Q142. Uptime/synthetic check?** `FAIL · MEDIUM` — Evidence: không config uptime (grep uptimerobot|betterstack|pingdom = 0); không health endpoint để check (Q144). Gap: sập都不知道. Fix: BetterStack/UptimeRobot ping `/`, `/dang-nhap` + 1 API products mỗi 1 phút.

**Q143. Alert có người nhận thật?** `FAIL · MEDIUM` — Evidence: không alert route (chỉ mail low-stock nội bộ `order.ts:309-336`, mail fail ghi DB `mail.ts:39-43` — không pager); không docs oncall. Gap: không ai nhận alert. Fix: nối Sentry/uptime alert vào Slack/Zalo + tên người nhận (Q146/Q177).

**Q144. Health/readiness endpoint tách biệt?** `FAIL · MEDIUM` — Evidence: glob `**/health*` = **0**; grep `health|liveness|readiness` = 0; compose không `healthcheck:` (`docker-compose.yml`). Gap: LB/cron/E2E phải `sleep 8` (Q123) vì không có health. Fix: `GET /api/health` trả `{ok, db: ping}` 200/503; compose healthcheck.

**Q145. Backup tự động/mã hóa/offsite/test restore/RPO-RTO?** `FAIL · BLOCKER` — Evidence: grep `backup|restore|RPO|RTO|snapshot|sao lưu` trong **tất cả** `*.md` = **0**; volume `ek-data`/`ek-pg` không có snapshot job (`docker-compose.yml`); không script dump; DEPLOY checklist (`:59-68`) không mục backup; trong khi seed có thể wipe (Q78). Gap: mọi thứ. Fix (tối thiểu trước launch): cron hàng ngày `sqlite3 .backup`/`pg_dump -Fc` → offsite encrypt (rclone/S3), **test restore 1 lần**, ghi RPO=24h, RTO=1h vào DEPLOY.md.

**Q146. Incident response 1 trang?** `FAIL · MEDIUM` — Evidence: grep `incident|oncall|runbook` = 0; không ai được chỉ định (Q177). Gap: launch day không biết khi nào rollback/khi nào notify khách. Fix: 1 file `INCIDENT.md`: IC, kênh, trigger rollback (Q133), template thông báo khách.

**Q147. Status page / kênh thông báo sự cố?** `FAIL · LOW` — Evidence: không có status page/twitter/notion (grep = 0). Gap: sự cố dài không có kênh. Fix: tối thiểu Zalo/Facebook page shop + mẫu thông báo.

**Q148. Audit log admin (đổi quyền/xóa/hoàn tiền)?** `FAIL · HIGH` — Evidence: **không model AuditLog** (schema hết `SiteSetting:453-457`); `OrderEvent` chỉ `{orderId,kind,message}` **không actor** (`schema.prisma:196-205`, `order-events.ts:6-11`) — status đổi ghi "Chuyển trạng thái → X" mà không biết ai (`order.ts:62-63`); **settings save không log** (`api/admin/settings/route.ts:23-34`); **refund approve không log actor** (`api/admin/refunds/route.ts:17-19`); product/coupon/gift mutations không log. Gap: không truy vết ai hoàn tiền/đổi giá. Fix: model `AuditLog{actorId,action,entity,before,after,at}` ghi ở mọi route admin mutate; thêm `actorId` vào OrderEvent.

**Q149. Tracing phân tán >2 service?** `N/A` — Một service Next duy nhất (vendor ngoài là HTTP call đơn, không phải service nội bộ sở hữu) → distributed tracing không áp dụng (performance xem Q113/Q141).

**Q150. Budget alert cloud/anomaly spend?** `FAIL · MEDIUM` — Evidence: không config budget/alert nào trong repo (grep budget|billing alert = 0); Vercel/AWS/GCP settings ngoài repo — không có evidence. Gap: LLM (xAI) + egress + image optimizer wildcard (Q46) có thể burn không ai biết. Fix: bật Vercel spend alert + xAI spending cap; alert email cho chủ shop.

### O. Legal, content, support, business (Q151–Q162)

**Q151. ToS/Privacy/cookie/impressum?** `FAIL · HIGH` — Evidence: `/chinh-sach` chỉ 3 mục (Vận chuyển/Đổi trả/Bảo mật) và mục Bảo mật là **placeholder thừa nhận** (`chinh-sach/page.tsx:11-24`); **không có ToS** (glob dieu-khoan = 0); footer không link chính sách đầy đủ (`Footer.tsx:44-52`); consent banner có nhưng policy thật không. Gap: bán hàng online VN thiếu ToS/privacy thật = rủi ro pháp lý + NĐ13. Fix: viết ToS + Privacy + Cookie policy (gọi subprocessor Q67), link footer + thanh toán.

**Q152. License third-party/NOTICE?** `FAIL · MEDIUM` — Evidence: không file `LICENSE*/NOTICE*/THIRD-PARTY*` (glob = 0); `package.json` không field `license`; font OFL + ảnh Unsplash + Next scaffold SVG không có attribution doc. Gap: không rõ quyền dùng kit + dependency. Fix: thêm LICENSE cho repo + NOTICE liệt kê font/ảnh/library.

**Q153. Copyright/trademark/ảnh/font quyền production?** `PARTIAL · MEDIUM` — Evidence: font Google `Be_Vietnam_Pro`/`Noto_Serif` (OFL — OK nếu không vi phạm điều khoản; `layout.tsx:10-20`); ảnh Unsplash (`src/data/catalog.ts:10+` — license cho phép dùng commercial nhưng cần tuân Unsplash guidelines khi auto-download; đang hotlink qua URL); brand "Atelier"/logo = placeholder (`site.ts:16-20` hotline `1900 1234`, email `hello@atelier.vn`); SVG next/vercel scaffold còn trong `public/`. Gap: brand placeholder + chưa chốt Trademark + ảnh stock chưa thay bằng ảnh khách hàng. Fix: thay logo/brand thật; dùng ảnh owned khi launch; ghi nguồn ảnh.

**Q154. Trang giá/hạn mức khớp billing code?** `N/A` — Không bán subscription/trial/kế hoạch giá (e-commerce bán SP); hạng thành viên (Đồng/Bạc/Vàng, `site.ts:82-88`) là loyalty đọc cùng config với code `membership.ts:4-16` → không có trang-price để lệch. (Thiếu trang giải thích điểm là UX — ghi ở Q161 content.)

**Q155. Payment: test mode tắt, webhook secret, thất bại/duplicate, hóa đơn?** `PARTIAL · HIGH` — Evidence **tốt**: VNPay HMAC-SHA512 + amount + idempotent paid (`vnpay.ts:84,94-98`), MoMo HMAC-SHA256 + amount (`momo.ts:94-100`), SePay key + amount floor (`sepay.ts:26-38`), test IPN đầy đủ (Q121), hóa đơn VAT có test (`invoice.test.ts`), COD/bank transfer nội bộ. Evidence **xấu**: (1) **GHN hard-code dev gateway** `https://dev-online-gateway.ghn.vn` ở cả fee lẫn create — **không env override** (`shipping.ts:20,73`) → bật `features.ghn` ở prod vẫn gọi dev; (2) URL payment **mặc định sandbox nếu thiếu env** (`vnpay.ts:30`, `momo.ts:18`, refund `:156,:131`) — không fail-fast khi prod; (3) **`refundVnpay`/`refundMomo` không route nào gọi** (grep = chỉ definition) — admin UI lại hứa "gọi API hoàn" (`admin/hoan-tien/page.tsx:64-65`) → hoàn tiền chỉ là ledger nội bộ, **không trả tiền thật**; (4) MoMo replay refire webhook (Q75); (5) refund API functions dead nhưng test chỉ test chữ ký (`refunds.test.ts:61,76`). Gap: 5 thứ. Fix: env `GHN_BASE_URL` + fail-fast sandbox URL ở prod; wire refund gateway API vào route admin hoặc sửa UI nói rõ "ledger đối soát, hoàn tay trên gateway".

**Q156. Email: SPF/DKIM/DMARC/from/unsubscribe/token?** `FAIL · HIGH` — Evidence: grep `SPF|DKIM|DMARC` = **0** (docs+code); `from: SMTP_FROM || SMTP_USER` (`mail.ts:18`) chưa verify domain; **không unsubscribe** — footer hứa "huỷ bất cứ lúc nào" (`Footer.tsx:16`) nhưng newsletter chỉ POST (`api/newsletter/route.ts`), mail body không link out (`mail.ts:46-64`), không List-Unsubscribe header; reset token nằm trong link email (bản chất OK) nhưng **lưu lại trong MailLog** (Q64); abandoned-cart = marketing-ish không có opt-out. Gap: deliverability + hứa hẹn sai + pháp lý. Fix: setup SPF/DKIM/DMARC cho domain; thêm `List-Unsubscribe` + trang `/huy-dang-ky`; purge token MailLog.

**Q157. Support path/SLA/mailbox người trực?** `PARTIAL · LOW` — Evidence: trang `/lien-he` có form + hotline/địa chỉ/email từ config + *"phản hồi trong giờ làm việc"* (`lien-he/page.tsx:30-36`); **không có SLA số** (ví dụ <2h); form `contact` **không rate-limit** (Q53); lead chỉ hiện admin không email notify admin. Gap: không rõ ai trực launch day (thuộc Q177). Fix: thêm rate-limit + mail notify ADMIN_EMAIL khi có lead; ghi SLA cụ thể.

**Q158. Analytics event đúng tên/không double count/không PII?** `N/A` — Không cài bất kỳ analytics nào (grep gtag|posthog|fbq|plausible = 0; `layout.tsx` không Script) → không có event để sai tên, không double count, không gửi PII. (Nếu sau này bật —届时 kiểm lại + consent Q61.)

**Q159. Robots/sitemap chặn admin?** `PASS · LOW` — Evidence: `robots.ts:3-8` disallow `/admin/`, `/api/`, `/tai-khoan/` + trỏ sitemap; `sitemap.ts:4-18` list home/categories/products/articles; không file static trùng. Gap: sitemap **capped 48 SP** (`sitemap.ts:7`) → catalog lớn bị under-index; staging không tồn tại để chặn (Q132). Fix: paginate hết products trong sitemap.

**Q160. Canonical/hreflang/schema.org?** `PARTIAL · MEDIUM` — Evidence: **schema.org có** — Organization/Product/Breadcrumb JSON-LD (`JsonLd.tsx:5-45`, gắn `layout.tsx:49`, `san-pham:31`); **canonical/thường `metadataBase` hreflang = 0** (grep = chỉ S3 internals). Gap: duplicate URL + OG relative không resolve. Fix: `metadataBase` + `alternates.canonical` per page.

**Q161. Launch comms: changelog/help/banner/kill-switch copy?** `FAIL · MEDIUM` — Evidence: không changelog, không help center/FAQ (glob = 0), không in-app banner config (announcement field có trong settings `site.ts`/`settings.ts` nhưng không có mẫu launch), không kill-switch runbook (payment switch Q155/ngoài). Gap: launch day không có nội dung thông báo. Fix: soạn 3 copy: banner sự cố, email khách ảnh hưởng, social post; ghim vào INCIDENT.md.

**Q162. Định nghĩa "launch thành công" bằng metric?** `FAIL · MEDIUM` — Evidence: grep `SLO|error budget|success metric|activation` = **0**; admin chỉ có KPI doanh thu (`order.ts:384-399`). Gap: "deploy xong" = thành công theo suy nghĩ mặc định. Fix: ghi 5 metric: uptime 99.9% tuần 1, checkout success rate, time-to-first-order, error rate <1%, support tickets <N/ngày.

### P. Mobile / store / desktop (Q163–Q168)

**Q163. Bundle id/signing key?** `N/A` — Không có source mobile app trong repo (web thuần Next.js).

**Q164. Store listing/privacy labels?** `N/A` — Không phát hành app store.

**Q165. Log/crashlytics/cert pinning?** `N/A` — Không có app mobile/crashlytics.

**Q166. Force-update/kill-switch client?** `N/A` — Web không cần force-update client; kill-switch web liên quan cờ feature (Q138/Q155).

**Q167. Backup keystore/Play upload key?** `N/A` — Không có keystore (không app).

**Q168. Offline/bad network không corrupt local DB?** `N/A` — Không có local DB mobile; (web offline behavior xem Q92 — chưa làm, đã FAIL/PARTIAL).

### Q. AI / LLM / Agent (Q169–Q176)

**Q169. Prompt injection cách ly system/user?** `PARTIAL · MEDIUM` — Evidence: system prompt + catalog inject riêng, user `messages` append sau (`ai.ts:19-37,36,121`); agent tools **read-only + draft** (`ai.ts:42-75`), guardrail text "Không tự ghi DB" (`:117-119`); **nhưng** user-controlled messages không được sanitize/cắt (Q118) → vẫn inject được nội dung vào ngữ cảnh (ảnh hưởng hành vi reply, không gọi được tool ghi do allowlist). Gap: injection breadth. Fix: tách channel rõ + limit length + (tốt hơn) dùng structured API messagesroles chính thức của SDK.

**Q170. Tool calling allowlist + HITL?** `PASS · LOW` — Evidence: 4 tool cố định, không có tool ghi DB/hủy tiền (`ai.ts:42-75`); draft trả về text để admin bấm lưu (`:108,117-119`) = human-in-the-loop; agent yêu cầu `requireAdmin` (`api/ai/agent/route.ts:14-15`). Gap: `JSON.parse` output model không schema-validate (`ai.ts:78`) — chấp nhận được vì re-coerce String/Number. Fix: zod parse tool args.

**Q171. RAG tenant isolation?** `N/A` — Không có RAG/vector store; context = catalog đơn tenant inject thủ công (single-tenant, Q35).

**Q172. Không secret trong prompt/log prompt PII?** `PASS · LOW` — Evidence: key chỉ server (`ai.ts:11-14`), client không thấy (grep XAI trong components = chỉ hint text); **không log prompt/response** (ai.ts không console). Gap: agent **gửi PII đơn hàng (email/phone/address) cho xAI** qua tool results (`ai.ts:85-92`) — không phải leak secret nhưng là data flow phải disclosure (đã FAIL ở Q60/Q67). Fix: privacy policy liệt kê xAI; cân nhắc redact PII trước khi gửi.

**Q173. Rate limit + max token + cost cap?** `PARTIAL · HIGH` — Evidence: rate limit 20/ph/IP **có** (`ai/chat:7`, `agent:8`); **max token = 0 chỗ** (grep max_tokens = 0), **cost cap = 0** (grep budget = 0), messages unbounded (Q118). Gap: thiếu 2/3 lớp. Fix: `max_tokens`, daily quota per IP, xAI platform spending cap (ngoài code).

**Q174. Fallback model lỗi/timeout/hallucinate?** `PARTIAL · MEDIUM` — Evidence: key missing → 503 message hướng dẫn cấu hình (`chat/route.ts:13-17`); flag off → 404; **model lỗi → trả `e.message` 500** (`:25`) và ChatWidget **pending treo** không try/finally (`ChatWidget.tsx:24-31`); không guard "không bịa giá" ở runtime ngoài prompt text (`ai.ts:19-37` nói "Không bịa giá" nhưng không verify output với DB). Gap: UX failure + no verification. Fix: try/finally + friendly message; (giá đã inject catalog nên giảm bớt rủi ro).

**Q175. Evaluation set/red-team tối thiểu?** `FAIL · MEDIUM` — Evidence: không file test AI (glob `*ai*.test.ts` = 0 — chỉ mail.test false-positive), không eval dataset, không red-team doc. Gap: đổi prompt/model không biết hồi quy. Fix: 10 câu eval cố định (giá SP, từ chối ngoài phạm vi, injection "ignore instructions") chạy CI optional.

**Q176. Disclosure user đang nói chuyện AI?** `PARTIAL · LOW` — Evidence: nút widget ghi **"Chat AI"** (`ChatWidget.tsx:70`) — có nhắc AI; panel title "Hỏi {brand}" (`:39`) không cảnh báo "câu trả lời có thể sai/thông tin tham khảo". Gap: disclaimer đầy đủ. Fix: 1 dòng footer panel: *"Trợ lý AI — thông tin tham khảo, liên hệ hotline để chắc chắn."*

### R. Câu hỏi "sếp/founder phải trả lời" (Q177–Q180)

**Q177. Ai là incident commander ngày launch? SĐT?** `UNKNOWN · INFO` — Code không trả lời được. Grep trong docs không có tên oncall (Q146). → **Cần người:** chỉ định 1 IC + 1 backup, ghim SĐT vào INCIDENT.md.

**Q178. Risk nào chấp nhận được bằng văn bản?** `UNKNOWN · INFO` — Không có risk acceptance doc trong repo. → **Cần người:** ký nhận nếu chấp nhận: chưa pentest (Q…), chưa load test (Q114), chưa MFA (Q29 — *khuyến nghị không nhận vì dính admin*).

**Q179. Thị trường mục tiêu kéo theo luật nào?** `UNKNOWN · INFO` — Code chỉ dẫn NĐ 13/2023 ở consent banner (`settings.ts:97-99`, `ConsentBanner.tsx:7`) → giả định VN; nhưng không có văn bản xác nhận phạm vi (NĐ13 vs GDPR vs PCI-scope) ; payment qua gateway hosted nên PCI phần lớn outsourced. → **Cần người:** xác nhận bán VN hay xuyên biên giới → quyết định depth privacy/Q62/Q69.

**Q180. Kế hoạch traffic x10 trong 1 giờ?** `UNKNOWN · INFO` — Không load test (Q114 FAIL), không autoscale story (SQLite 1 instance Q77), không CDN config explicit (Q112), không rate limit search (Q53) → code nghiêng về "chịu đựng kém" nhưng quyết định scale/kill-switch là của người. → **Cần người:** câu trả lời + chuẩn bị hạ tầng trước (Postgres managed, CDN cache, rate limit search) — các phần code đã liệt kê ở trên.

---

## 10. Việc phải làm trước launch (24h) — chặn deploy

1. **[Q32/Q124]** Xóa hint admin trên `dang-nhap/page.tsx:34`; đổi `ADMIN_PASSWORD` thật; seed throw khi thiếu env ở production; gỡ credential khỏi README + `ci.yml` (GitHub Secrets).
2. **[Q34]** `requireAdmin()` hoặc signed-TTL cho `/hoa-don/[number]`; đổi số hóa đơn sang random/unsignable.
3. **[Q75/Q122]** Clamp `pointsToUse` theo số dư trong zod + trong transaction; move coupon count-check vào tx; viết `membership.test.ts` đỏ→xanh.
4. **[Q145/Q78]** Backup tự động + **test restore 1 lần**; sửa `DEPLOY.md:62` (không "seed lại" prod); thêm guard `NODE_ENV=production` vào `seed.ts`.
5. **[Q55]** Gỡ/thay `xlsx` (exceljs hoặc SheetJS ≥0.20) hoặc vô hiệu import Excel tạm; `npm audit fix` cho prisma/vitest.
6. **[Q139/Q144]** Cài Sentry + `/api/health` (sửa luôn `sleep 8` CI).
7. **[Q155]** `GHN_BASE_URL` env + fail-fast nếu prod còn URL sandbox/dev; quyết định wire refund gateway hoặc sửa copy admin.
8. **[Q60/Q151]** Privacy policy thật tối thiểu (subprocessor xAI/GHN/gateway) + link footer — chặn kiểu "launch rồi tính".

## 11. Việc 72h

1. **[Q26/Q29/Q33]** `tokenVersion` để revoke session + kill session khi đổi mật khẩu; `requireAdmin()` trong `admin/layout.tsx`; bật TOTP cho admin.
2. **[Q53/Q24]** Rate-limit register/contact/returns/search + per-account fail lock login.
3. **[Q44/Q51/Q45]** Escape JSON-LD (`\u003c`), bỏ `unsafe-eval`, include `/uploads` vào header matcher, Origin-check POST.
4. **[Q148]** AuditLog cho admin mutations (settings/refund/price/stock) + actor trên OrderEvent.
5. **[Q133/Q130/Q131/Q132]** Runbook rollback 1 trang + pin base image digest + ít nhất 1 staging/preview environment.
6. **[Q140–Q143]** Structured log + uptime monitor + alert vào kênh có người (Q177).
7. **[Q118/Q173]** AI: max token + messages cap + daily quota; hoặc tắt `aiChatbot` default đến khi xong.
8. **[Q116]** Mail ngoài luồng checkout (fire-and-forget có catch).
9. **[Q62/Q63/Q64/Q69]** Admin xóa/anonymize khách; cron purge PasswordReset/MailLog token; bỏ in password seed; export JSON cho user.
10. **[Q156]** SPF/DKIM/DMARC + unsubscribe/List-Unsubscribe.

## 12. Việc sau launch 14 ngày

1. [Q120/Q121] Test IDOR/ownership + replay-IPN-route + coverage gate cho `src/server`.
2. [Q71–Q74] Index `Order.userId`/`MailLog`/`CartLine.updatedAt`, pagination admin orders, CHECK constraint stock/balance.
3. [Q81–Q85] OpenAPI rút từ zod + webhook retry/DLQ + checkout idempotency key.
4. [Q91–Q96] error.tsx/loading.tsx, try/finally toàn form, favicon/metadataBase/OG image.
5. [Q101–Q105] label htmlFor, focus-visible ring, dialog focus trap + ESC, prefers-reduced-motion.
6. [Q109/Q114] Lighthouse budget + k6 load test 100 VU.
7. [Q126/Q129/Q136] CI: lint + npm audit + gitleaks.
8. [Q152/Q153/Q159/Q160] LICENSE/NOTICE, brand thật, sitemap full catalog, canonical/metadataBase.
9. [Q175/Q169] AI eval set 10 câu + red-team injection tối thiểu.
10. [Q20/Q135/Q162] Key rotation runbook, xác nhận branch protection, định nghĩa launch success metric.

## 13. Câu hỏi còn treo cho người

1. **[Q177]** Ai là Incident Commander ngày launch + số điện thoại? (không có trong repo)
2. **[Q178]** Rủi ro nào chấp nhận bằng văn bản? Gợi ý **không nhận** Q32/Q34/Q75/Q145 (đã là BLOCKER); nếu nhận Q114/Q109/Q29 cần chữ ký + lý do.
3. **[Q179]** Thị trường: bán VN (NĐ13) hay EU/GDPR/HIPAA? Ảnh hưởng trực tiếp độ sâu của Q60/Q62/Q69/Q67.
4. **[Q180]** Kịch bản x10 traffic: ai quyết định scale lên Postgres managed + bật rate limit search + CDN? Ngân sách tăng thêm?
5. **[Q5/Q132/Q135]** Staging/branch protection/production approval đang config ở đâu (GitHub/Vercel settings — ngoài repo, audit không xác minh được)?
6. **[Q146/Q143/Q157]** Kênh alert + ai trực mailbox support ngày launch + SLA cam kết (giờ nào thì có người trả lời)?
7. **[Q155]** Refund VNPay/MoMo: mong đợi là **ledger nội bộ tự đối soát** hay **gọi API hoàn thật**? (hiện dead code nhưng UI hứa)
8. **[Q67]** DPA/data residency với xAI, GHN, SMTP provider — ai đứng tên ký?
9. **[Q150/Q20]** Ngân sách cloud/LLM alert gửi về đâu? Ai giữ key rotation?
10. **[Q162]** "Launch thành công" định nghĩa bằng metric nào sau 7 ngày?

---

## 14. Verdict cuối (2026-09-23)

**CONDITIONAL GO** — 4 BLOCKER đã đóng (Q32, Q34, Q75, Q145); HIGH phần lớn đã vá trong repo.
Điều kiện còn lại **ngoài code** (user/host làm trước khi public):

1. Điền key prod (§15) + bật gateway nếu bán online.
2. `./scripts/backup.sh` + **test restore 1 lần** + ghi ngày.
3. SPF/DKIM/DMARC DNS; GitHub secrets `ADMIN_EMAIL`/`ADMIN_PASSWORD`; branch protection.
4. Sign-off privacy/ToS; logo/favicon brand thật.
5. (Khuyến nghị) Sentry DSN, staging, load test, quyết định thay `xlsx`.

Lịch sử: audit 2026-09-22 = **NO-GO** (4 BLOCKER) → fix xong 2026-09-23.

---

## 15. Danh sách key cần điền (user làm sau)

| Env | Bắt buộc? | Ghi chú |
|---|---|---|
| `AUTH_SECRET` | ✔ | ≥32 bytes ngẫu nhiên (`openssl rand -base64 48`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | khi seed | password ≥12, không `admin123`; `ALLOW_SEED=1` 1 lần |
| `APP_URL` | ✔ | `https://domain` |
| `DATABASE_URL` | ✔ | sqlite hoặc postgres |
| `CRON_SECRET` | ✔ | gọi cron + smoke |
| `XAI_API_KEY` | nếu bật AI chat | |
| `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` / `VNPAY_*` URL prod | nếu bật VNPay | `assertProdGateway` fail-fast nếu sandbox ở prod |
| `MOMO_PARTNER_CODE` / `MOMO_ACCESS_KEY` / `MOMO_SECRET_KEY` / `MOMO_*` URL | nếu bật MoMo | |
| `SEPAY_API_KEY` | nếu dùng SePay | |
| `GHN_TOKEN` / `GHN_SHOP_ID` / `GHN_BASE_URL` | nếu bật `features.ghn` | |
| `SMTP_HOST/PORT/USER/PASS/FROM` | khuyến nghị | thiếu → ghi MailLog DB |
| `S3_*` / `SENTRY_DSN` | optional | ảnh CDN / error tracking |

Không commit `.env` — chỉ `.env.example`.

---

*Hết báo cáo — 180/180 câu. Verdict cuối: **CONDITIONAL GO** (2026-09-23; lịch sử NO-GO 2026-09-22 — 4 BLOCKER đã đóng).*
