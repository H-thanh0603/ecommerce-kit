#!/usr/bin/env bash
# Smoke test sau deploy/rollback — exit ≠ 0 nếu fail.
# Usage: BASE_URL=http://localhost:3000 CRON_SECRET=... TENANT_HOST=shopa.localhost ./scripts/smoke.sh
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
FAIL=0

check() {
  local name="$1" url="$2" expect="${3:-}"
  local code body
  code=$(curl -sS -o /tmp/smoke-body -w "%{http_code}" --max-time 10 "$url" || echo 000)
  body=$(cat /tmp/smoke-body 2>/dev/null || true)
  if [[ "$code" != "${expect:-200}" ]]; then
    echo "FAIL $name → HTTP $code (want ${expect:-200})"
    FAIL=1
  elif [[ -n "$expect" && "$expect" == "200" && -n "${4:-}" && "$body" != *"$4"* ]]; then
    echo "FAIL $name → body không chứa '$4'"
    FAIL=1
  else
    echo "OK   $name → $code"
  fi
}

echo "Smoke @ $BASE"
check "health"        "$BASE/api/health" 200 '"ok"'
check "home"          "$BASE/"           200
check "san-pham"      "$BASE/san-pham"   200
check "chinh-sach"    "$BASE/chinh-sach" 200
check "sitemap"       "$BASE/sitemap.xml" 200

# Optional: health qua Host tenant (multi-tenant) — TENANT_HOST=shopa.localhost
if [[ -n "${TENANT_HOST:-}" ]]; then
  code=$(curl -sS -o /tmp/smoke-body -w "%{http_code}" --max-time 10 \
    -H "Host: $TENANT_HOST" "$BASE/api/health" || echo 000)
  body=$(cat /tmp/smoke-body 2>/dev/null || true)
  if [[ "$code" == "200" && "$body" == *'"ok"'* ]]; then
    echo "OK   tenant health ($TENANT_HOST) → 200"
  else
    echo "FAIL tenant health ($TENANT_HOST) → HTTP $code body=$body"; FAIL=1
  fi
fi

# Cron phải 401 khi thiếu secret, 200 khi đúng (nếu CRON_SECRET set)
if [[ -n "${CRON_SECRET:-}" ]]; then
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 \
    -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/retention" || echo 000)
  if [[ "$code" == "200" ]]; then echo "OK   cron retention → 200"; else
    echo "FAIL cron retention → $code"; FAIL=1; fi
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 \
    "$BASE/api/cron/retention" || echo 000)
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    echo "OK   cron without secret → $code"
  else
    echo "FAIL cron without secret → $code (want 401)"; FAIL=1
  fi
fi

# Admin không login → redirect
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/admin" || echo 000)
if [[ "$code" == "307" || "$code" == "308" || "$code" == "200" ]]; then
  # 200 nếu login page; 30x redirect OK
  echo "OK   /admin → $code"
else
  echo "FAIL /admin → $code"; FAIL=1
fi

if [[ $FAIL -ne 0 ]]; then echo "SMOKE FAILED"; exit 1; fi
echo "SMOKE PASSED"
