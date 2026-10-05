-- 1 đơn chỉ redeem 1 mã 1 lần (chặn race ghi đôi ở DB-level)
CREATE UNIQUE INDEX "CouponRedemption_couponId_orderId_key" ON "CouponRedemption"("couponId", "orderId");
