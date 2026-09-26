#!/usr/bin/env bash
# Build sloka-slides.zip for "Load unpacked" / release upload.
# The archive keeps manifest.json at the top level.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f sloka-slides.zip
zip -r -X sloka-slides.zip . \
  -x '.git/*' -x 'docs/*' -x 'scripts/*' -x 'node_modules/*' \
  -x '*.DS_Store' -x '__MACOSX*' -x '*.zip' >/dev/null
echo "Built sloka-slides.zip ($(unzip -l sloka-slides.zip | tail -1 | awk '{print $2}') files)"
