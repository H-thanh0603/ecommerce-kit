#!/usr/bin/env bash
# Migrate 1 schema: ./scripts/migrate-schema.sh <slug>
# Tách ra khỏi migrate-all để ops chạy tay khi cần (vd: tenant tạo bởi /platform UI).
set -euo pipefail
SCHEMA="$1"
BASE="${DATABASE_URL%%\?*}"
DATABASE_URL="$BASE?schema=$SCHEMA" npx prisma migrate deploy
