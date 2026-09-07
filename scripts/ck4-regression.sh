#!/bin/bash
ROUTES=(
  "/admin" "/admin/courses" "/admin/courses/course-001"
  "/admin/trainers" "/admin/paths"
  "/" "/courses" "/paths" "/blog"
  "/admin/content/home" "/admin/preview/home"
  "/admin/testimonials" "/admin/testimonials/new" "/admin/blog" "/admin/blog/new"
  "/admin/preview/home" "/admin/preview/blog/post-mthjukwc-w3d6nf"
)
for route in "${ROUTES[@]}"; do
  agent-browser open "http://localhost:3000${route}?reg=$(echo $route | md5sum | cut -c1-6)" > /dev/null
  agent-browser wait --load networkidle > /dev/null
  ERRS=$(agent-browser errors 2>/dev/null | rg -c "Error|error" || echo "0")
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${route}")
  echo "$CODE $route console-errors:${ERRS:-0}"
done
