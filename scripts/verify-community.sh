#!/usr/bin/env bash
# ============================================================
# بيت المصور — تحقق مجتمع CP-H V1 بعد تطبيق المالك للمخططات
# الاستخدام:
#   export NEXT_PUBLIC_SUPABASE_URL="https://rnzdleotnxznkqfrcwfa.supabase.co"
#   export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon>"
#   export SUPABASE_SECRET_KEY="<service>"   # للقراءة الإدارية فقط
#   bash scripts/verify-community.sh
# لا يطبع أي مفتاح؛ لا يترك بيانات اختبار (ينظف ما ينشئه).
# ============================================================
set -u

URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
ANON="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"
SVC="${SUPABASE_SECRET_KEY:-}"

if [[ -z "$URL" || -z "$ANON" ]]; then
  echo "✗ متغيرات البيئة مفقودة (NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY)"; exit 1
fi

PASS=0; FAIL=0
check() { # check <اسم> <الشرط: 0/1>
  if [[ "$2" == "1" ]]; then echo "PASS: $1"; PASS=$((PASS+1)); else echo "FAIL: $1"; FAIL=$((FAIL+1)); fi
}

echo "=== 1) الجداول موجودة عبر REST (service) ==="
for t in community_profiles community_posts community_post_media community_post_likes \
         community_post_comments community_saved_posts community_follows \
         community_portfolio_projects community_portfolio_media community_notifications \
         community_content_reports community_user_blocks; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $SVC" -H "Authorization: Bearer $SVC")
  check "جدول $t يستجيب (200)" "$([[ "$code" == "200" ]] && echo 1 || echo 0)"
done

echo "=== 2) anon يرى الجداول (RLS select) ويُمنع من الكتابة ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/community_profiles?select=*&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON")
check "anon يقرأ community_profiles (200)" "$([[ "$code" == "200" ]] && echo 1 || echo 0)"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/community_posts" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"caption":"x"}')
check "anon ممنوع من إدراج منشور (401/403)" "$([[ "$code" == "401" || "$code" == "403" ]] && echo 1 || echo 0)"

echo "=== 3) bucket community-media ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/storage/v1/object/public/community-media/probe-nonexistent.jpg")
check "bucket community-media عام (200/404 وليس 400)" "$([[ "$code" == "200" || "$code" == "404" ]] && echo 1 || echo 0)"

echo "=== 4) وحدة الإشراف community في الصلاحيات (service) ==="
cnt=$(curl -s "$URL/rest/v1/permissions?module=eq.community&select=action" \
  -H "apikey: $SVC" -H "Authorization: Bearer $SVC" | grep -o 'action' | wc -l)
check "صفوف صلاحيات community >= 3" "$([[ "$cnt" -ge 3 ]] && echo 1 || echo 0)"

echo ""
echo "النتيجة: PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" == "0" ]] && echo "COMMUNITY VERIFY: GREEN" || echo "COMMUNITY VERIFY: يحتاج معالجة"
