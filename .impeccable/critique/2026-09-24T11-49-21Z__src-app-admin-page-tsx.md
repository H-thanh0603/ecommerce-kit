---
target: trang admin
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-24T11-49-21Z
slug: src-app-admin-page-tsx
---
Method: dual-agent (A: 01a0d33a-f725-7eb2-b605-1e22fa7b704d · B: 01a0d33a-f725-7eb2-b605-1e348532a8e5)

# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Đổi trạng thái đơn không báo thành công hay lỗi |
| 2 | Match System / Real World | 3 | Hạng `dong`, cờ tiếng Anh, "Cài đặt khung" |
| 3 | User Control and Freedom | 2 | Huỷ đơn trong cùng dropdown, không hoàn tác; không đăng xuất |
| 4 | Consistency and Standards | 2 | Đơn là thẻ dài, sản phẩm/khách là bảng; 6 màn không có trong menu |
| 5 | Error Prevention | 2 | Xác nhận xoá nói "Ẩn hoặc xóa"; lưu sản phẩm ép published |
| 6 | Recognition Rather Than Recall | 2 | Sửa từ dashboard có thể mở form trống nếu SP ngoài 24 dòng |
| 7 | Flexibility and Efficiency | 1 | Không chọn nhiều, không phím tắt; Excel là lối hàng loạt duy nhất |
| 8 | Aesthetic and Minimalist Design | 2 | Sáu thẻ KPI ngang nhau; thẻ đơn nhồi đủ mọi việc |
| 9 | Error Recovery | 2 | PATCH đơn lỗi thì select giữ giá trị mới, không có câu báo |
| 10 | Help and Documentation | 2 | Có chú thích cài đặt; không giải thích Thực thu / Ghi nhận |
| **Total** | | **20/40** | **Acceptable** |

# Design Specificity Verdict

LLM: Da thương hiệu của kit (nền kem, xanh rừng, chữ Việt, "Chờ xác nhận", "Tồn thấp") nhưng việc làm thì là admin CRUD chung. Buổi sáng không được thiết kế; doanh thu là nhân vật chính.

Deterministic scan: `detect.mjs` exit 2, 1 finding `gray-on-color` tại `src/components/admin/OrderActions.tsx:14`. False positive: `text-stone-600` chỉ đi với `bg-stone-100`, không với `bg-green-100`.

Visual overlays: không có. Không có server ở cổng 3000 hay 3100, không inject overlay.

# Overall Impression

Admin chạy được các việc lõi nhưng trông sơ vì màn hình đầu không chỉ việc, menu thiếu sáu công cụ đã viết, và thao tác đơn/sản phẩm không xác nhận kết quả.

# What's Working

- Trạng thái đơn và tiền viết bằng tiếng Việt; "Theo trạng thái" trên tổng quan link thẳng sang bộ lọc đơn.
- Một hệ màu, nav đang mở được tô nền, focus-visible có outline.
- Đơn có lọc và câu rỗng; sản phẩm có phân trang 24 và Excel.

# Priority Issues

[P1] Tổng quan không chỉ việc cần làm. "Đơn chờ xử lý" và "Tồn thấp" không phải link. "Đơn mới" cắt ở 8 dòng. Fix: một dải việc trước (đơn chờ, tồn thấp, hộp thư), doanh thu xuống dưới.

[P1] Menu thiếu công cụ đã có. `AdminNav` không có Combo, Đánh giá, Trả hàng, Hoàn tiền, Quà tặng, Webhook. Fix: nhóm Bán hàng / Kho & sau bán / Hệ thống, thêm Đăng xuất.

[P1] Giao hàng là dropdown câm. `OrderStatusForm` ghi khi đổi, nuốt lỗi, "Đã huỷ" không hỏi lại. Fix: nút chính "Chuyển sang Đang giao", chỉ xác nhận khi huỷ, dòng "Đã cập nhật".

[P1] Sửa sản phẩm từ dashboard có thể mở form trống rồi vẫn lưu, và Save ép đang hiện vì không có field `published`. Fix: tải đúng id, checkbox "Đang hiện", nhãn thật.

[P2] Khách hàng và Cài đặt nói như database: hạng `dong`, cờ `guestCheckout`, không tìm khách. Fix: Đồng/Bạc/Vàng, nhãn cờ tiếng Việt, ô tìm.

# Persona Red Flags

Alex: không chọn nhiều đơn để chuyển trạng thái; tìm đơn phải bấm Lọc; nhập Excel reload không báo số dòng.

Jordan: mở admin không biết làm gì trước; "Thực thu" và "Ghi nhận" không được giải thích; sau khi đổi trạng thái không có câu xác nhận.

Sam: ô tìm chỉ có placeholder; select trạng thái không có tên; biểu đồ là div; "Đã lưu" không aria-live; sidebar 224px không thu.

# Minor Observations

- Combo admin nhận JSON thô trong textarea.
- Xoá sản phẩm hỏi "Ẩn hoặc xóa" trong khi đã có nút Ẩn.
- Biểu đồ 7 ngày chỉ có số tiền trong title.
- Không xem được admin trên trình duyệt trong lượt này vì không có server.

# Questions to Consider

- Màn đầu chỉ còn "việc cần làm hôm nay", doanh thu mở sau, có đúng buổi sáng của chủ shop không?
- "Giao đơn này" nên là một nút trên địa chỉ và dòng hàng, thay vì năm trạng thái trên một thẻ dài?
- Cài đặt đang nói với người fork repo ("khung", cờ tiếng Anh). Chủ shop mở vào thứ Hai cần thấy gì?
