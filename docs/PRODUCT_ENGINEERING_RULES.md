# PRODUCT ENGINEERING RULES — "hiến pháp" cho ecommerce-kit

> Bộ rule rút gọn từ Carbon Design System, GOV.UK Design System, NN/G và OWASP
> (Business Logic / API Security Top 10 / Cornucopia), được ánh xạ vào kiến trúc
> repo này. Agent (AI + người) đọc trước khi làm UI admin, API, hay logic tiền/tồn.
>
> Ký hiệu: **MUST** = bắt buộc, vi phạm là bug. **SHOULD** = nên làm, lệch cần lý do.

## Nguyên tắc duy nhất

> Mỗi quyết định UI xuất phát từ task; mỗi dữ liệu phải có meaning; mỗi action có
> business rule; mỗi business rule quan trọng được backend enforce; mỗi mutation
> quan trọng có auditability; mỗi expensive operation có scalability strategy.

Chuỗi tư duy: `USER GOAL → UX → UI → API contract → BUSINESS RULE → DOMAIN → DB/QUEUE → OBSERVABILITY + AUDIT`. Không phải `"làm dashboard đẹp" → React → API → DB`.

---

## I. DATA (biểu đồ, KPI, số liệu)

| ID | Rule |
|----|------|
| DATA-001 | **MUST** chọn chart theo câu hỏi kinh doanh, không theo sở thích. Xu hướng theo thời gian → line/bar; so sánh category → bar; Top-N → **horizontal bar**; tỷ trọng 2–4 nhóm → pie chấp nhận được; quan hệ 2 biến → scatter. |
| DATA-002 | **MUST NOT** dùng pie/donut để so sánh định lượng nhiều nhóm, **MUST NOT** dùng 3D chart. |
| DATA-003 | **MUST** ranking sort theo đúng metric đang xếp (doanh thu/sold DESC). **MUST NOT** sort alphabetically hay theo thứ tự DB. Widget ranking phải ghi rõ metric: "Bán chạy (theo số lượng bán)". |
| DATA-004 | **MUST** KPI trả lời đủ: *bao nhiêu — so với cái gì — kỳ nào*. KPI doanh thu admin MUST có mốc so sánh (hôm qua/tháng trước). |
| DATA-005 | **MUST** mọi số liệu có time range hiển thị. Không để "Doanh thu: 2.4B" không biết của ngày/tuần/tháng/lifetime nào. |
| DATA-006 | **MUST** tiền hiển thị qua helper `money()` (`src/lib/format.ts`), đúng VND, không bao giờ in số thô. |
| DATA-007 | **MUST** phân biệt phần trăm tương đối (%) và điểm phần trăm (pp). Conversion 8%→10% là +2pp, không phải +2%. |
| DATA-008 | **MUST NOT** bóp trục làm phóng đại xu hướng (baseline ≠ 0 với revenue/conversion). |
| DATA-009 | **SHOULD** dashboard là overview: KPI → xu hướng → Top 5/10 → "Cần chú ý". **MUST** có mục *actionable exceptions* (việc chờ xử lý) — dashboard trả lời "tôi cần làm gì tiếp theo?", không chỉ "hệ thống có bao nhiêu dữ liệu". Nhớ link "Xem tất cả". |
| DATA-010 | **MUST** metric tài chính có định nghĩa rõ (Thực thu = đơn completed ≠ Ghi nhận = trừ huỷ) và hiển thị đúng chỗ, không gộp chung thành "Doanh thu". |

Hiện trạng repo: dashboard `/admin` (src/app/admin/page.tsx) có KPI so-sánh-kỳ + section
"Cần chú ý" (hoàn tiền/trả hàng/đánh giá chờ + tồn thấp). Thống kê nằm ở
`src/server/shop-stats.ts` — một nguồn sự thật, frontend không tự tính lại revenue.

## II. TABLE & FORM (admin UI)

| ID | Rule |
|----|------|
| UI-001 | **MUST** server-side pagination/filter/sort cho bảng dữ liệu. Pattern chuẩn: list function nhận `page/pageSize` (cap pageSize) trả `{items,total,pages}`, filter + `q` giữ trong URL (form GET). Không kéo toàn bộ bảng về filter trong RAM. |
| UI-002 | **MUST** default sort phản ánh công việc: đơn → mới nhất; tồn kho → stock ASC; đánh giá → chờ duyệt trước. Không mặc định A→Z vô nghĩa. |
| UI-003 | **MUST** cột số right-align + `tabular-nums`; text left-align; ngày nhất quán định dạng. |
| UI-004 | **MUST NOT** để ID làm thông tin chính của dòng — ID là identifier, tên + trạng thái + tiền mới là nội dung chính. |
| UI-005 | **MUST** status hiển thị bằng chữ (label tiếng Việt), màu chỉ phụ trợ — không dùng chip màu trần. |
| UI-006 | **MUST** mỗi screen có 1 primary action duy nhất; các action còn lại secondary. Button nói *hành động + đối tượng* ("Tạo sản phẩm", "Duyệt hoàn tiền"), không "Submit/OK". |
| UI-007 | **MUST** action dùng liên tục (Edit, Duyệt, In) hiển thị visible; `⋮` chỉ cho action thứ yếu. Action destructive đặt tách khỏi action chính (danger zone), không kề cạnh Save. |
| UI-008 | **MUST** phân tầng confirm (chống confirmation fatigue): toggle/rename → không; delete/hoàn tiền/đổi quyền → confirm với **preview hậu quả** ("Xóa X? sẽ ảnh hưởng Y"); bulk delete/financial → strong confirm kèm số lượng. |
| UI-009 | **MUST** bulk action khi admin lặp cùng 1 thao tác ≥ vài chục lần — qua 1 endpoint batch (vd `POST /api/orders/bulk-status`), KHÔNG loop fetch từ client. Response trả kết quả từng item; UI báo rõ partial-fail ("Thành công 94 / Lỗi 6: EK-XXX — lý do"), không all-or-nothing giả tạo. |
| UI-010 | **MUST** loading đúng loại: chuyển trang → skeleton; action nhỏ → trạng thái nút (busy); chạy lâu → progress/label. **MUST** optimistic UI chỉ cho thao tác nhanh + rollback được (toggle), không cho delete/payment/refund. |
| UI-011 | **MUST** giữ filter/sort/page trong URL và quay về đúng trạng thái sau khi mở chi tiết — không reset về trang 1. |
| UI-012 | **MUST NOT** dùng tabs cho thông tin cần so sánh trực tiếp. |
| UI-013 | **MUST** form sản phẩm có ảnh chính rõ ràng + alt text; giá/kho có đơn vị và ngữ nghĩa rõ (VND, available vs reserved nếu có). |
| UI-014 | **MUST** validation 3 tầng: client (UX, dùng schema chung `src/lib/validators.ts`) → API (zod/validate tay, business rule) → DB constraint. Client validation chỉ là UX, không phải security. |
| UI-015 | **MUST** error message cho user trả lời: chuyện gì sai, sửa thế nào; không lộ message Prisma nội bộ (dùng `publicError()` — `src/server/errors.ts`). |

## III. BACKEND (business logic & API)

| ID | Rule |
|----|------|
| BE-001 | **MUST** authorization enforce ở server cho MỌI route: `requireAdmin()` đầu handler, user-owned route filter theo session (`userId`/`email` trong `where`). Ẩn nút ở frontend không phải security. Deny by default. |
| BE-002 | **MUST NOT** tin dữ liệu business từ client: giá, giảm giá, ship, điểm, quyền — server tự tính lại (`quoteOrder`, `pricing.ts`). Client chỉ gửi ý định (productId, quantity, couponCode). |
| BE-003 | **MUST** mutation tiền/tồn chạy trong `$transaction` với **conditional update** (`updateMany where stock >= n` rồi check `count`), không read-then-write. Xem `src/server/order.ts` (checkout, cancel, complete). |
| BE-004 | **MUST** state machine cho trạng thái đơn: định nghĩa ở `ORDER_TRANSITIONS` (`src/types/index.ts`), **backend chặn transition trái phép**, UI chỉ render transition hợp lệ. `completed`/`cancelled` là trạng thái kết thúc — đơn hoàn tất đi luồng trả hàng/hoàn tiền. |
| BE-005 | **MUST** idempotency cho payment/webhook: `markPaid` dùng `updateMany where paymentStatus: { not: "paid" }`, check `count` để chỉ bắn `order.paid` đúng 1 lần (momo/vnpay/sepay/vietqr đều theo pattern này). Checkout có `clientRequestId` unique. |
| BE-006 | **MUST** verify signature gateway bằng constant-time compare (`safeEqual`) + đối chiếu amount trước khi ghi. |
| BE-007 | **MUST** rate limit mọi endpoint đắt hoặc external: login, checkout, upload, search suggest, export/import, IPN (engine: `src/server/rate-limit.ts`, in-memory + Upstash khi có env). Xét cả *cost/request*, không chỉ số request. |
| BE-008 | **MUST** audit log cho hành động tiền/quyền: `logAudit()` (`src/server/audit.ts`) với actorEmail/action/entity/before/after. Hành động đổi trạng thái đơn ghi `OrderEvent`. |
| BE-009 | **MUST** API list trả đúng use case, phân trang DB-side (`skip/take`), không trả 50k record cho frontend filter. |
| BE-010 | **SHOULD** tránh N+1: batch query (`Promise.all`, `findMany + Map`) thay vì query trong loop. |
| BE-011 | **MUST** index cho pattern filter/sort thực tế (`@@index([status, createdAt])`...). UX requirement → query pattern → index. |
| BE-012 | **SHOULD** operation nặng (export toàn bảng, import lớn, report) không chặn UX vô hạn: sync chấp nhận được ở free-tier nếu có rate limit + giới hạn kích thước; lớn hơn thì chuyển background job + thông báo. Export **MUST** đủ dữ liệu (lặp trang, không cắt theo 1 pageSize). |
| BE-013 | **MUST** lỗi business trả status đúng (400 business, 401 chưa đăng nhập, 403 hết quyền, 404); route quan trọng dùng `apiErrorResponse(code, message, status)` (`src/server/errors.ts`) — `code` máy đọc được (`ORDER_TRANSITION_INVALID`, `BULK_STATUS_INVALID`…) + `requestId` in log để trace. Không trả 500 cho lỗi đoán trước được, không lộ message Prisma nội bộ (`publicError()`). |
| BE-014 | **SHOULD** mọi response/security-sensitive event đủ để reconstruct: actor, resource, action, outcome (`AuditLog`/`OrderEvent`/Sentry). Không log secret/token. |
| BE-015 | **MUST** validate file upload: type/magic bytes + max size (xem excel route chặn `PK\x03\x04`, 5MB). Backend validate MIME/content, không tin extension. |

## IV. DATABASE

| ID | Rule |
|----|------|
| DB-001 | **MUST** DB enforce phần DB enforce được: `@unique` (email, code, coupon redemption…), FK, NOT NULL. Business rule phức tạp hơn → server. |
| DB-002 | **SHOULD** định nghĩa invariant rõ: `total >= 0`, `stock >= 0`, SKU unique… và enforce bằng conditional update hoặc constraint thay vì hy vọng UI đúng. |
| DB-003 | **SHOULD** xóa dữ liệu có lịch sử đơn bằng soft-delete/ẩn (`deleteProduct` fallback ẩn khi còn order); dữ liệu nhạy cảm theo retention thì xóa hẳn. |
| DB-004 | **MUST NOT** ghi ngày giờ bằng raw SQL — Prisma serialize đúng mọi DB. Backdate trong test bằng `prisma.xxx.update`. |

## V. SECURITY (bổ sung AGENTS.md)

| ID | Rule |
|----|------|
| SEC-001 | Admin: session JWT + **role re-read từ DB mỗi request** + tokenVersion revoke (`requireAdmin`) — không tin claim trong token. |
| SEC-002 | **MUST NOT** đặt secret vào client bundle. Chỉ `NEXT_PUBLIC_*` public config được tới frontend. |
| SEC-003 | Deny by default: route không có guard = bug, không phải mặc định an toàn. |
| SEC-004 | Multi-tenant: mọi truy cập tenant qua ALS (`withTenantHandler`), không resolve được Host → fail-closed default tenant. |

## VI. AI ADMIN (khi thêm tính năng AI, `src/server/ai.ts`)

| ID | Rule |
|----|------|
| AI-001 | AI thao tác dữ liệu **MUST** đi qua pipeline: Intent → Plan → **Preview** → Permission check → Human confirm → Execute → Audit. Không execute trực tiếp action hủy-hàng-loạt. |
| AI-002 | **MUST** phân biệt fact (số liệu từ DB) và inference (suy đoán) — inference phải được gắn nhãn "AI-generated hypothesis". |

---

## Checklist nhanh khi review PR

1. Route mới có `requireAdmin`/ownership check? (BE-001)
2. Có đọc tiền/tồn từ client không? (BE-002)
3. Ghi tiền/tồn có trong transaction + conditional update không? (BE-003)
4. Webhook retry 2 lần có chạy 2 lần không? (BE-005)
5. Endpoint đắt có rate limit không? (BE-007)
6. Bảng admin có phân trang server-side + filter trong URL không? (UI-001, UI-011)
7. Số có right-align, status có chữ, KPI có kỳ so sánh không? (UI-003, UI-005, DATA-004)
8. Hành động tiền/quyền có audit log không? (BE-008)
