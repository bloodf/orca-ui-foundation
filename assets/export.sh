#!/bin/sh
# Exports the generated illustrations (assets/generated/illus-*.png) to assets/illustrations/*.webp:
# trimmed, fitted to 320 x 320 on transparent. A flat white background is keyed out from the four corners first.
# Needs ImageMagick (magick) and cwebp. Run from ui-foundation/: sh assets/export.sh
set -eu
cd "$(dirname "$0")"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p illustrations
for src in generated/illus-*.png; do
  name=$(basename "$src" .png); name=${name#illus-}
  case "$name" in *-v[0-9]*) continue ;; esac   # earlier takes are kept beside the current file, not exported
  if [ "$(magick identify -format '%[opaque]' "$src")" = "True" ]; then
    magick "$src" -alpha set -fuzz 3% -fill none -draw 'alpha 0,0 floodfill' -draw 'alpha 1023,0 floodfill' -draw 'alpha 0,1023 floodfill' -draw 'alpha 1023,1023 floodfill' "$tmp/keyed.png"
    src="$tmp/keyed.png"
  fi
  magick "$src" -trim +repage -resize 320x320 -background none -gravity center -extent 320x320 "$tmp/$name.png"
  cwebp -quiet -q 82 -alpha_q 90 -m 6 "$tmp/$name.png" -o "illustrations/$name.webp"
  printf '%s %s B\n' "illustrations/$name.webp" "$(wc -c < "illustrations/$name.webp" | tr -d ' ')"
done
