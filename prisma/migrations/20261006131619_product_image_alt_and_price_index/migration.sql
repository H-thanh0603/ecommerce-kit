-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "alt" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");
