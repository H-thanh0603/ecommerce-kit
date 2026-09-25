#!/usr/bin/env bash
# lighthouse-budget.sh — chạy Lighthouse audit + kiểm budget.
# Yêu cầu: npx lighthouse + Chrome/Chromium system.
# Usage: bash scripts/lighthouse-budget.sh http://localhost:3000
set -euo pipefail

BASE="${1:-http://localhost:3000}"
OUT=".lighthouse"
mkdir -p "$OUT"

PAGES=(
  "/"
  "/san-pham"
)

FAIL=0
for path in "${PAGES[@]}"; do
  slug=$(echo "$path" | tr '/' '_' | sed 's/^_//;s/_$//;s/^$/home/')
  echo "→ Auditing $BASE$path"
  npx lighthouse "$BASE$path" \
    --chrome-flags="--headless --no-sandbox" \
    --output=json --output-path="$OUT/$slug.json" \
    --budget-path=lighthouse-budget.json \
    --quiet || FAIL=1
done

# In tóm tắt
for f in "$OUT"/*.json; do
  echo "=== $f"
  node -e '
    const r = require(process.argv[1]);
    const c = r.categories;
    console.log("  perf:", Math.round(c.performance.score*100));
    console.log("  a11y:", Math.round(c.accessibility.score*100));
    console.log("  bp:",   Math.round(c["best-practices"].score*100));
    console.log("  seo:",  Math.round(c.seo.score*100));
    if (r.audits["performance-budget"]?.details?.items?.length) {
      console.log("  budget violations:");
      for (const v of r.audits["performance-budget"].details.items) {
        console.log("   -", v.label, "over by", v.sizeOverBudget || v.timeOverBudget);
      }
    }
  ' "$f"
done

exit $FAIL
