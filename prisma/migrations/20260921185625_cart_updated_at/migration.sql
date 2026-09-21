/*
  Warnings:

  - Added the required column `updatedAt` to the `CartLine` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CartLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" INTEGER NOT NULL,
    "variantLabel" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CartLine" ("id", "productId", "quantity", "skuId", "userId", "variantLabel") SELECT "id", "productId", "quantity", "skuId", "userId", "variantLabel" FROM "CartLine";
DROP TABLE "CartLine";
ALTER TABLE "new_CartLine" RENAME TO "CartLine";
CREATE UNIQUE INDEX "CartLine_userId_productId_variantLabel_key" ON "CartLine"("userId", "productId", "variantLabel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
