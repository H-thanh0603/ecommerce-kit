# Atelier — khung website thương mại điện tử

Khung sẵn để làm web bán hàng cho khách. Clone một lần, đổi thương hiệu và bật/tắt module, rồi chỉ viết thêm chức năng riêng của hợp đồng.

Chạy được ngay với dữ liệu mẫu, không cần database hay khóa thanh toán.

## Công nghệ

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Giỏ hàng / tài khoản / wishlist lưu localStorage (dễ thay bằng API)

## Chạy local

```bash
cd ecommerce-kit
npm install
npm run dev
```

Mở http://localhost:3000

Admin demo: admin@atelier.vn / admin123

Mã giảm giá mẫu: WELCOME10, FREESHIP, GIAM50K

## Tuỳ biến theo khách hàng

Sửa một file: src/config/site.ts

1. brand — tên shop, slogan, SĐT, địa chỉ, email
2. theme — màu chủ đạo (đồng bộ hex trong src/app/globals.css)
3. features — bật/tắt wishlist, đánh giá, flash sale, blog, coupon
4. payments — COD, CK, MoMo, VNPay, ZaloPay
5. shipping — phí ship, mốc freeship
6. admin — tài khoản quản trị tạm

Sản phẩm, danh mục, bài viết, đơn mẫu: src/data/catalog.ts

## Module có sẵn

- Catalog + giỏ + checkout (lõi)
- Tài khoản khách + Admin
- Wishlist (features.wishlist)
- Đánh giá (reviews)
- Mã giảm giá (coupons)
- Flash sale (flashSale)
- Journal (blog)
- Newsletter (newsletter)
- Live chat (liveChat, mặc định tắt)
- Biến thể size/màu (productVariants)

Xem thêm HUONG-DAN.md.
