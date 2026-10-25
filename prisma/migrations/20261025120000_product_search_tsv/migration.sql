-- Full-text search cho Product: cột GENERATED từ searchText (đã chuẩn hóa
-- không dấu) + slug, GIN index. Thay contains quét bảng khi SKU tăng (BE-011).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("searchText", '') || ' ' || coalesce("slug", ''))) STORED;
CREATE INDEX IF NOT EXISTS "Product_search_tsv_idx" ON "Product" USING GIN ("search_tsv");
