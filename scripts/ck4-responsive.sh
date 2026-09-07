#!/bin/bash
ROUTES=(
  "/admin/content/home"
  "/admin/preview/home"
  "/admin/testimonials"
  "/admin/testimonials/new"
  "/admin/blog"
  "/admin/blog/new"
  "/admin/blog/post-mthjukwc-w3d6nf"
)
SIZES=("360 640" "390 844" "768 1024" "1024 768" "1440 900")
FAIL=0
for size in "${SIZES[@]}"; do
  W=$(echo $size | cut -d' ' -f1); H=$(echo $size | cut -d' ' -f2)
  agent-browser set viewport $W $H > /dev/null
  for route in "${ROUTES[@]}"; do
    agent-browser open "http://localhost:3000${route}?vw=$W" > /dev/null
    agent-browser wait --load networkidle > /dev/null
    OVER=$(agent-browser eval "document.documentElement.scrollWidth - document.documentElement.clientWidth" 2>/dev/null)
    if [ "$OVER" != "0" ]; then
      echo "OVERFLOW $W x $H $route -> ${OVER}px"
      FAIL=1
    fi
  done
  echo "size $W done"
done
[ $FAIL -eq 0 ] && echo "ALL-RESPONSIVE-PASS (0 overflow)"
