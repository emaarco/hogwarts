#!/usr/bin/env bash
# setup-excalidraw.sh — one-time bootstrap for the Excalidraw diagram exporter.
#
# Every hand-composed diagram in the toolkit design system is a `.excalidraw.svg`
# embedded via <Figure src>. This installs the Node exporter and the exact Firefox
# build it needs, then applies the macOS keyboard patch. Repo-agnostic.
#
# NO GLOBAL INSTALL. The exporter goes in as a **local devDependency** (visible in
# your package.json, gitignored node_modules), so nothing lands in your global npm
# space and you always know what the repo pulled in. Run the exporter afterwards
# via `npx excalidraw-brute-export-cli …` (resolves the local install, no download)
# or `node_modules/.bin/excalidraw-brute-export-cli`.
#
# GOTCHA this script handles: `npx playwright install firefox` installs the Firefox
# revision for YOUR project's Playwright, which usually differs from the revision
# the CLI's *bundled* Playwright expects (e.g. firefox-1538 vs 1532). The exporter
# then fails with "Executable doesn't exist". So we install Firefox via the revision
# the CLI's OWN playwright-core pins, resolved wherever npm hoisted it.
#
# After this, export a scene JSON to a .excalidraw.svg (integer coordinates only, or
# the toolkit's transparency verify check fails):
#   npx excalidraw-brute-export-cli -i scene.excalidraw \
#     -o deck/chapter/NN-name/resources/<name>.excalidraw.svg \
#     -f svg -s 1 -e true -d false -b true
set -euo pipefail

[ -f package.json ] || { echo "!! run this from a deck/project root (no package.json here)" >&2; exit 1; }

echo "==> installing excalidraw-brute-export-cli as a local devDependency"
npm install -D excalidraw-brute-export-cli

# Resolve the installed package dir from the LOCAL node_modules (not a global root).
CLI_PKG="$(node -e '
  const path=require("path");
  const p=require.resolve("excalidraw-brute-export-cli/package.json",{paths:[process.cwd()]});
  console.log(path.dirname(p));
')"
echo "==> CLI package: $CLI_PKG"

echo "==> installing the Firefox build the CLI's OWN Playwright expects"
# playwright-core may be hoisted to the top-level node_modules; resolve from the CLI dir.
PW_CLI="$(node -e '
  const path=require("path");
  const p=require.resolve("playwright-core/package.json",{paths:[process.argv[1]]});
  console.log(path.join(path.dirname(p),"cli.js"));
' "$CLI_PKG")"
node "$PW_CLI" install firefox

if [ "$(uname)" = "Darwin" ]; then
  echo "==> macOS: patching Control -> Meta shortcuts in the CLI"
  MAIN="$CLI_PKG/src/main.js"
  sed -i '' 's/keyboard.press("Control+O")/keyboard.press("Meta+O")/' "$MAIN"
  sed -i '' 's/keyboard.press("Control+Shift+E")/keyboard.press("Meta+Shift+E")/' "$MAIN"
  echo "   patched $MAIN"
fi

echo "==> done. Export a scene with:"
echo "    npx excalidraw-brute-export-cli -i scene.excalidraw -o out.excalidraw.svg -f svg -s 1 -e true -d false -b true"
