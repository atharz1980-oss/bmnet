#!/bin/bash
# ============================================================
# بيت المصور — تشغيل الإنتاج (standalone) مع تصدير متغيرات البيئة
# ------------------------------------------------------------
# بناء standalone لا يقرأ .env.local وقت التشغيل — SUPABASE_SECRET_KEY
# ومتغيرات الخادم يجب تصديرها قبل node server.js وإلا انهارت لوحة الإدارة.
# الاستخدام:  bash scripts/start-prod.sh   (بعد bun run build)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .next/standalone/server.js ]; then
  echo "خطأ: لا يوجد بناء إنتاجي — شغّل «bun run build» أولًا." >&2
  exit 1
fi

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL مفقود في .env.local}"
: "${SUPABASE_SECRET_KEY:?SUPABASE_SECRET_KEY مفقود في .env.local}"

export NODE_ENV=production
export PORT="${PORT:-3000}"

echo "تشغيل بيت المصور على المنفذ ${PORT}..."
exec node .next/standalone/server.js
