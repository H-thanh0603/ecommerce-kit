# Incident runbook (Q146–147)

## Mức độ

| Sev | Mô tả | Response |
|---|---|---|
| SEV1 | Checkout/thanh toán hỏng, data loss, leak PII | Ngay — dừng deploy, mở war room |
| SEV2 | Một gateway lỗi, admin không vào được | &lt;1h |
| SEV3 | UI lỗi, mail fail (vẫn ghi DB) | &lt;24h |

## Đầu việc SEV1 (thứ tự)

1. **Dừng bleed**: `docker compose stop app` hoặc revert sang tag trước (DEPLOY §6).
2. **Preserve evidence**: `./scripts/backup.sh` ngay, đừng xóa log.
3. **Báo**: kênh Slack/Zalo của shop + (nếu có) status page.
4. **Đánh giá data**: nếu nghi leak credential → rotate toàn bộ §7 DEPLOY.
5. **Fix** trên branch → test (`npm test`, `./scripts/smoke.sh`) → deploy → ghi postmortem.

## Các tình huống thường gặp

| Triệu chứng | Khả năng | Hành động |
|---|---|---|
| `/api/health` fail `db: down` | volume/DB | check `docker compose logs app`, restore backup §5 |
| IPN MoMo/VNPay không vào | secret/domain | sync secret cổng + `APP_URL`, xem log IPN |
| Mail không gửi | SMTP | MailLog `failed` trong DB; sửa `SMTP_*`, vẫn không block checkout |
| Đơn trừ tồn sai | race | xem `OrderEvent`; test `vitest run` money path |
| CPU/RAM cao | cron loop / AI | `docker compose logs`, tắt feature trên `/admin/cai-dat` |
| Dependency CVE | `npm audit` | nâng patch; `xlsx` → cô lập route admin (xem AUDIT) |

## Ghi chép

- Ngày incident: ____ · Sev: ____ · Người hô: ____
- Root cause: ____
- Hành động chống tái diễn: ____ (ticket: ____)
