#!/bin/bash
# فحص الانحدار والكونسول — Checkpoint 5
ADMIN_ROUTES=(
  "/admin"
  "/admin/courses"
  "/admin/courses/course-001"
  "/admin/trainers"
  "/admin/paths"
  "/admin/content/home"
  "/admin/testimonials"
  "/admin/blog"
  "/admin/media"
  "/admin/corporate-requests"
  "/admin/settings/general"
  "/admin/settings/contact"
  "/admin/settings/footer"
  "/admin/settings/seo"
  "/admin/settings/payments"
  "/admin/legal"
  "/admin/legal/privacy"
)
PUBLIC_ROUTES=(
  "/"
  "/about"
  "/courses"
  "/courses/photography-fundamentals"
  "/paths"
  "/paths/photography-professional"
  "/blog"
  "/blog/choose-your-first-camera"
  "/contact"
  "/corporate-training"
  "/policies/privacy"
)
agent-browser set viewport 1440 900 >/dev/null
agent-browser open "http://localhost:3000/admin?ck5" >/dev/null 2>&1; sleep 2
agent-browser console --clear >/dev/null 2>&1
agent-browser errors --clear >/dev/null 2>&1
FAIL=0
for route in "${ADMIN_ROUTES[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  agent-browser open "http://localhost:3000$route?ck5" >/dev/null 2>&1
  sleep 1.1
  ERR=$(agent-browser errors 2>/dev/null | grep -c "Error\|error" || true)
  OVER=$(agent-browser eval "(()=>{const d=document.documentElement; return (d.scrollWidth-d.clientWidth)>1?'OVF':'OK';})()" 2>/dev/null | tr -d '"')
  echo "ADMIN $route → $CODE console-errors:$ERR $OVER"
  [[ "$CODE" != "200" || "$OVER" == *"OVF"* ]] && FAIL=$((FAIL+1))
done
for route in "${PUBLIC_ROUTES[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  agent-browser open "http://localhost:3000$route?ck5" >/dev/null 2>&1
  sleep 1.1
  ERR=$(agent-browser errors 2>/dev/null | grep -c "Error\|error" || true)
  OVER=$(agent-browser eval "(()=>{const d=document.documentElement; return (d.scrollWidth-d.clientWidth)>1?'OVF':'OK';})()" 2>/dev/null | tr -d '"')
  echo "PUBLIC $route → $CODE console-errors:$ERR $OVER"
  [[ "$CODE" != "200" || "$OVER" == *"OVF"* ]] && FAIL=$((FAIL+1))
done
echo "REGRESSION RESULT: FAIL=$FAIL"
