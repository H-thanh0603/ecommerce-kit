#!/usr/bin/env bash
# Backup SQLite (hoặc Postgres nếu DATABASE_URL là postgres://) → BACKUP_DIR.
# RPO = tần suất cron (khuyến nghị daily 02:00). Test restore xem DEPLOY.md.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

DB_URL="${DATABASE_URL:-file:./dev.db}"
# Prisma relative path → repo prisma/
case "$DB_URL" in
  file:*)
    SRC="${DB_URL#file:}"
    if [[ "$SRC" != /* ]]; then
      SRC="prisma/${SRC#./}"
    fi
    if [[ ! -f "$SRC" ]]; then
      echo "Không thấy SQLite: $SRC" >&2
      exit 1
    fi
    OUT="$BACKUP_DIR/sqlite-$STAMP.db"
    # .backup an toàn hơn cp khi còn ghi
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 "$SRC" ".backup '$OUT'"
    else
      cp "$SRC" "$OUT"
    fi
    # gzip nếu có
    if command -v gzip >/dev/null 2>&1; then
      gzip -f "$OUT"
      OUT="$OUT.gz"
    fi
    echo "OK sqlite → $OUT"
    ;;
  postgres://*|postgresql://*)
    OUT="$BACKUP_DIR/pg-$STAMP.dump"
    if command -v pg_dump >/dev/null 2>&1; then
      pg_dump "$DB_URL" -Fc -f "$OUT"
      echo "OK postgres → $OUT"
    else
      echo "pg_dump không có trên máy" >&2
      exit 1
    fi
    ;;
  *)
    echo "DATABASE_URL không hỗ trợ: $DB_URL" >&2
    exit 1
    ;;
esac

# Giữ 14 bản gần nhất
ls -1t "$BACKUP_DIR" 2>/dev/null | tail -n +15 | while read -r f; do
  rm -f "$BACKUP_DIR/$f"
done

echo "Backup xong ($(ls -1 "$BACKUP_DIR" | wc -l) bản trong $BACKUP_DIR)"
