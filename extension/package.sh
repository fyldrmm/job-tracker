#!/usr/bin/env bash
# Builds job-tracker-extension.zip for Chrome Web Store submission.
# Swaps in manifest.prod.json (no localhost host permission) as manifest.json.
set -euo pipefail
cd "$(dirname "$0")"

OUT="job-tracker-extension.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp background.js content-bridge.js popup.html popup.js icon-16.png icon-48.png icon-128.png "$STAGE/"
cp manifest.prod.json "$STAGE/manifest.json"

rm -f "$OUT"
(cd "$STAGE" && zip -r -X "$OLDPWD/$OUT" .)

echo "Built $OUT"
