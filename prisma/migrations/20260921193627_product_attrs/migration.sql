-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "searchText" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "tags" TEXT NOT NULL DEFAULT '',
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "attrsJson" TEXT NOT NULL DEFAULT '{}',
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "flashSale" BOOLEAN NOT NULL DEFAULT false,
    "flashSaleStartsAt" DATETIME,
    "flashSaleEndsAt" DATETIME,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT NOT NULL DEFAULT 'cai',
    "weightGrams" INTEGER NOT NULL DEFAULT 500,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "compareAtPrice", "createdAt", "description", "featured", "flashSale", "flashSaleEndsAt", "flashSaleStartsAt", "id", "name", "optionsJson", "price", "published", "rating", "reviewCount", "searchText", "slug", "sold", "stock", "subtitle", "tags", "unit", "updatedAt", "weightGrams") SELECT "categoryId", "compareAtPrice", "createdAt", "description", "featured", "flashSale", "flashSaleEndsAt", "flashSaleStartsAt", "id", "name", "optionsJson", "price", "published", "rating", "reviewCount", "searchText", "slug", "sold", "stock", "subtitle", "tags", "unit", "updatedAt", "weightGrams" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_published_featured_idx" ON "Product"("published", "featured");
CREATE INDEX "Product_slug_idx" ON "Product"("slug");
CREATE INDEX "Product_name_idx" ON "Product"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
