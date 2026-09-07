#!/bin/bash
# Responsive overflow test across 5 viewports × key pages
PAGES=( "/" "/about" "/courses" "/courses/photography-fundamentals" "/paths" "/paths/photography-professional" "/blog" "/blog/choose-your-first-camera" "/contact" "/corporate-training" "/policies/privacy" )
declare -a RESULTS
for vp in "360 740" "390 844" "768 1024" "1024 768" "1440 900"; do
  w=${vp%% *}; h=${vp##* }
  agent-browser set viewport $w $h > /dev/null
  for p in "${PAGES[@]}"; do
    agent-browser open "http://localhost:3000$p" > /dev/null
    agent-browser wait --load networkidle > /dev/null 2>&1
    r=$(agent-browser eval "JSON.stringify({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,b:document.body.scrollWidth,of:document.documentElement.scrollWidth>document.documentElement.clientWidth||document.body.scrollWidth>document.body.clientWidth})" 2>/dev/null)
    flag=$(echo "$r" | grep -o '"of":true' && echo "OVERFLOW" || echo "ok")
    echo "${w}x${h} $p -> $flag"
  done
done
