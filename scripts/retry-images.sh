#!/bin/bash
# Retry failed image searches
set -u
OUT=/home/z/my-project/scripts/img-json

search() {
  local name="$1"; local query="$2"
  for attempt in 1 2 3; do
    timeout 160 z-ai image-search -q "$query" --count 4 --gl us --no-rank > "$OUT/$name.json.tmp" 2>/dev/null
    if rg -q '"success": true' "$OUT/$name.json.tmp" 2>/dev/null; then
      mv "$OUT/$name.json.tmp" "$OUT/$name.json"
      echo "OK: $name (attempt $attempt)"
      return 0
    fi
    echo "retry $attempt failed: $name"
    sleep 3
  done
  echo "GIVEUP: $name"
}

search hero            "photographer with camera dark studio" &
search camera_dark     "DSLR camera dark background" &
search online          "online course laptop" &
search private_lesson  "photography teacher student camera" &
search studio_light    "studio softbox lighting photography" &
search portrait_studio "portrait photography studio" &
search mobile_photo    "smartphone photography hands" &
search studio_space    "photography studio interior" &
wait
echo "RETRY DONE"
