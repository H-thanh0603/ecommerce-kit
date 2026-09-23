# Hướng dẫn giao khung cho khách / freelancer

## Kịch bản dùng hàng ngày

1. Copy repo thành `ten-khach-2026` (hoặc fork)
2. Đổi `src/config/site.ts` (brand, theme, nav, flags, COD/CK)
3. `cp .env.example .env` — đổi `AUTH_SECRET`, `ADMIN_PASSWORD`
4. `npx prisma migrate deploy && npx tsx prisma/seed.ts` (hoặc nhập SP trên admin)
5. Bật đúng module trong hợp đồng
6. Yêu cầu lạ (booking, bán kg, cấu hình PC): thêm module, không đụng checkout lõi
7. Chatbot / AI Agent: thêm `XAI_API_KEY` (SpaceXAI)

## Checklist bàn giao

- [ ] Logo + favicon trong `public/`
- [ ] Màu brand (`site.theme`)
- [ ] Danh mục / sản phẩm thật
- [ ] Chính sách đổi trả
- [ ] COD / CK đã điền số TK
- [ ] `AUTH_SECRET` mới, đổi mật khẩu admin (không cần seed lại — seed xóa data)
- [ ] Domain + SSL
- [ ] (Tuỳ chọn) `XAI_API_KEY` cho chatbot

## Điểm mở rộng gợi ý theo ngành

- Thời trang: size chart, lookbook
- Mỹ phẩm: bảng thành phần
- Điện máy: so sánh thông số
- Thực phẩm: bán theo kg, lịch giao trong ngày
- Cổng ví: adapter MoMo/VNPay trong `src/server/payments.ts`
