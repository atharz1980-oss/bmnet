#!/bin/bash
# فحص الاستجابة — Checkpoint 5: 10 مسارات إدارية × 5 مقاسات (0 overflow)
ROUTES=(
  "/admin/corporate-requests"
  "/admin/corporate-requests/req-001"
  "/admin/media"
  "/admin/settings/general"
  "/admin/settings/contact"
  "/admin/settings/footer"
  "/admin/settings/seo"
  "/admin/settings/payments"
  "/admin/legal"
  "/admin/unknown-route"
)
SIZES=(360 390 768 1024 1440)
PASS=0; FAIL=0
for size in "${SIZES[@]}"; do
  agent-browser set viewport "$size" 800 >/dev/null
  for route in "${ROUTES[@]}"; do
    agent-browser open "http://localhost:3000$route?r=$size" >/dev/null 2>&1
    sleep 1.2
    RESULT=$(agent-browser eval "(()=>{const doc=document.documentElement; const overflow=doc.scrollWidth-doc.clientWidth; return overflow > 1 ? 'OVERFLOW:'+overflow : 'OK';})()" 2>/dev/null)
    if [[ "$RESULT" == *"OK"* ]]; then
      PASS=$((PASS+1))
    else
      FAIL=$((FAIL+1))
      echo "FAIL [$size] $route → $RESULT"
    fi
  done
  echo "size $size done"
done
echo "RESPONSIVE RESULT: PASS=$PASS FAIL=$FAIL"
agent-browser set viewport 1440 900 >/dev/null
