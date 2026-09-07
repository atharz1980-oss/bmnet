#!/bin/bash
# Broken-link crawler: يجمع كل الروابط الداخلية من كل صفحة ويختبرها
BASE="http://localhost:3000"
ROUTES=( "/" "/about" "/courses" "/courses?category=in-person-individuals" "/courses?category=in-person-corporates" "/courses?category=online" "/courses?category=private" \
  "/courses/photography-fundamentals" "/courses/studio-lighting" "/courses/portrait-photography" "/courses/product-photography" \
  "/courses/mobile-photography" "/courses/video-editing-basics" "/courses/cinematic-video" "/courses/private-program" \
  "/paths" "/paths/photography-professional" "/paths/content-video" "/blog" \
  "/blog/choose-your-first-camera" "/blog/rule-of-thirds-composition" "/blog/natural-vs-studio-light" \
  "/contact" "/corporate-training" "/policies/privacy" "/policies/terms" "/policies/refund" "/policies/registration-cancellation" )

declare -A links
for r in "${ROUTES[@]}"; do
  html=$(curl -s "$BASE$r")
  echo "$html" | grep -oE 'href="[^"]*"' | sed 's/href="//;s/"$//' | while read -r link; do
    case "$link" in
      http*|mailto:*|tel:*|\#*|"") ;;
      /*) echo "$link" ;;
    esac
  done
done | sort -u > /tmp/all_links.txt

echo "=== Unique internal links found: $(wc -l < /tmp/all_links.txt) ==="
broken=0
while read -r link; do
  # strip query for status check but keep it in output
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$link")
  if [ "$code" != "200" ]; then
    echo "BROKEN ($code): $link"
    broken=$((broken+1))
  fi
done < /tmp/all_links.txt
echo "=== Broken links: $broken ==="
