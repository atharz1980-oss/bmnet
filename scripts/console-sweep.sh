#!/bin/bash
# Console + page-error sweep on every route
ROUTES=( "/" "/about" "/courses" "/courses?category=online" "/courses/photography-fundamentals" "/courses/studio-lighting" "/courses/portrait-photography" "/courses/product-photography" "/courses/mobile-photography" "/courses/video-editing-basics" "/courses/cinematic-video" "/courses/private-program" "/paths" "/paths/photography-professional" "/paths/content-video" "/blog" "/blog/choose-your-first-camera" "/blog/rule-of-thirds-composition" "/blog/natural-vs-studio-light" "/contact" "/corporate-training" "/policies/privacy" "/policies/terms" "/policies/refund" "/policies/registration-cancellation" "/some-404-page" )
total_errors=0
for p in "${ROUTES[@]}"; do
  agent-browser open "http://localhost:3000$p" > /dev/null 2>&1
  agent-browser wait --load networkidle > /dev/null 2>&1
  errs=$(agent-browser errors 2>/dev/null | grep -v "launched browser" | grep -cv "^\s*$" || true)
  cons=$(agent-browser console 2>/dev/null | grep -v "launched browser" | grep -icE "error|warn" || true)
  if [ "$errs" != "0" ] || [ "$cons" != "0" ]; then
    echo "ISSUES on $p: page-errors=$errs console-problems=$cons"
    agent-browser errors 2>/dev/null | grep -v "launched browser" | head -3
    agent-browser console 2>/dev/null | grep -iE "error|warn" | head -3
    total_errors=$((total_errors+errs+cons))
  else
    echo "clean: $p"
  fi
done
echo "=== TOTAL PROBLEMS: $total_errors ==="
