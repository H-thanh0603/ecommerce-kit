-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerTax" TEXT NOT NULL DEFAULT '',
    "buyerAddress" TEXT NOT NULL DEFAULT '',
    "taxRate" INTEGER NOT NULL DEFAULT 10,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("buyerName", "buyerTax", "id", "issuedAt", "number", "orderId") SELECT "buyerName", "buyerTax", "id", "issuedAt", "number", "orderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE TABLE "new_MailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'logged',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MailLog" ("body", "createdAt", "id", "subject", "to") SELECT "body", "createdAt", "id", "subject", "to" FROM "MailLog";
DROP TABLE "MailLog";
ALTER TABLE "new_MailLog" RENAME TO "MailLog";
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
INSERT INTO "new_Product" ("categoryId", "compareAtPrice", "createdAt", "description", "featured", "flashSale", "flashSaleEndsAt", "flashSaleStartsAt", "id", "name", "optionsJson", "price", "published", "rating", "reviewCount", "slug", "sold", "stock", "subtitle", "tags", "unit", "updatedAt", "weightGrams") SELECT "categoryId", "compareAtPrice", "createdAt", "description", "featured", "flashSale", "flashSaleEndsAt", "flashSaleStartsAt", "id", "name", "optionsJson", "price", "published", "rating", "reviewCount", "slug", "sold", "stock", "subtitle", "tags", "unit", "updatedAt", "weightGrams" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_published_featured_idx" ON "Product"("published", "featured");
CREATE INDEX "Product_slug_idx" ON "Product"("slug");
CREATE INDEX "Product_name_idx" ON "Product"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
