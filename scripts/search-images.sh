#!/bin/bash
# Search photography images — capture stdout JSON directly
set -u
OUT=/home/z/my-project/scripts/img-json
mkdir -p "$OUT"

search() {
  local name="$1"; local query="$2"
  timeout 150 z-ai image-search -q "$query" --count 4 --gl us --no-rank > "$OUT/$name.json" 2>/dev/null
  if [ -s "$OUT/$name.json" ]; then
    echo "OK: $name ($(stat -c%s "$OUT/$name.json") bytes)"
  else
    echo "FAIL: $name"
  fi
}

search hero            "photographer holding professional camera in dark studio dramatic lighting" &
search camera_dark     "professional DSLR camera close up on dark black background" &
search workshop        "photography workshop students learning with cameras in studio" &
search corporate       "corporate team training workshop modern office meeting room" &
search online          "person attending online course on laptop at home desk" &
search private_lesson  "photography mentor teaching one student with camera one on one" &
wait
search portrait_studio "portrait photoshoot professional photography studio softbox lighting" &
search mobile_photo    "person taking photo with smartphone close up hands" &
search photo_editing   "photo editing on computer monitor color grading workspace" &
search studio_light    "studio lighting equipment softbox photography setup" &
search videography     "videographer filming professional cinema video camera" &
search studio_space    "modern photography studio interior with equipment" &
wait
echo "ALL SEARCHES DONE"
