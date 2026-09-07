#!/bin/bash
set -u
OUT=/home/z/my-project/scripts/img-json

search() {
  local name="$1"; local query="$2"
  for attempt in 1 2 3 4; do
    timeout 160 z-ai image-search -q "$query" --count 4 --gl us --no-rank > "$OUT/$name.json.tmp" 2>/dev/null
    if rg -q '"success": true' "$OUT/$name.json.tmp" 2>/dev/null; then
      mv "$OUT/$name.json.tmp" "$OUT/$name.json"
      echo "OK: $name (attempt $attempt)"
      return 0
    fi
    echo "retry $attempt failed: $name"
    sleep 5
  done
  echo "GIVEUP: $name"
}

search camera_dark   "black digital camera product" &
search studio_space  "photo studio room" &
wait
echo "FINAL RETRY DONE"
