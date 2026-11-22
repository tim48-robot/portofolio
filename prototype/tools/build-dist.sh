#!/bin/bash
# Builds prototype/dist: the two real pages wrapped as full HTML documents, plus only the files they load.
# Test locally with: cd prototype/dist && python3 -m http.server
# The published artifacts use the unwrapped pages directly. Lab pages (sound-lab, mask-lab, cursor-lab) are not built.
set -e
P="$(cd "$(dirname "$0")/.." && pwd)"
D="$P/dist"
rm -rf "$D" && mkdir -p "$D/bg" "$D/sfx"
W='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
for f in hero:index awaken:awaken; do
  src=${f%%:*}; dst=${f##*:}
  { printf '%s' "$W"; cat "$P/$src.html"; printf '</body></html>\n'; } > "$D/$dst.html"
done
cp "$P/sfx.js" "$P/cursor.js" "$P/cursor-red2-128.png" "$P/cursor-violet-128.png" \
   "$P/me.webp" "$P/me-hero.webp" "$P/bg-b.webp" "$P/bg-b-depth.webp" \
   "$P/status-frame.webp" "$P/status-frame-silver.webp" "$D/"
cp "$P/bg/panel-2.webp" "$D/bg/"
cp "$P/sfx/card-whoosh-b.mp3" "$P/sfx/shatter-yours.mp3" "$P/sfx/explosion-yours.mp3" "$D/sfx/"
echo "built $(du -sh "$D" | cut -f1)"
