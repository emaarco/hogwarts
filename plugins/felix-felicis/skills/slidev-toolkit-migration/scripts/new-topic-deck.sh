#!/usr/bin/env bash
# new-topic-deck.sh — scaffold one @miragon/slidev-toolkit deck as a workspace.
#
# Creates decks/<SLUG>/ as a self-contained toolkit deck (deck/ + verify/),
# mirroring the template scaffold and wired as an npm workspace. Repo-agnostic:
# it uses the public `@miragon/create-slidev-deck` scaffolder, then strips the
# demo chapters and writes a minimal slides.md (cover + closing) for you to fill.
#
# Usage:
#   new-topic-deck.sh <SLUG> <NPM_NAME> ["Deck Title"]
#   new-topic-deck.sh 03-implementation @acme/deck-implementation "Implementation"
#
# Env (all optional):
#   CREATE_DECK_SKELETON  local template checkout for offline/deterministic scaffolds
#                         (e.g. .context/slidev-deck-template)
#   DECK_EYEBROW          cover/closing eyebrow text (default: the title)
#   DECK_CONTACT          closing contact line (default: none)
#   DECK_ADDONS           space-separated addons to register (default: "bpmn dmn";
#                         set to "" to register none, or e.g. "bpmn" to drop dmn)
set -euo pipefail

SLUG="${1:?need a folder slug, e.g. 03-implementation}"
NPM_NAME="${2:?need an npm package name, e.g. @acme/deck-implementation}"
TITLE="${3:-Presentation}"
EYEBROW="${DECK_EYEBROW:-$TITLE}"
ADDONS="${DECK_ADDONS-bpmn dmn}"

REPO_ROOT="$(pwd)"
DEST="$REPO_ROOT/decks/$SLUG"
[ -e "$DEST" ] && { echo "!! $DEST already exists — refusing to overwrite" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> scaffolding a fresh toolkit deck"
( cd "$TMP" && npx --yes @miragon/create-slidev-deck@latest _deck )

SRC="$TMP/_deck"
mkdir -p "$DEST"
cp -R "$SRC/deck" "$SRC/verify" "$DEST/"
cp "$SRC/.gitignore" "$SRC/.npmrc" "$DEST/" 2>/dev/null || true

echo "==> stripping demo chapters (keep the folder)"
rm -rf "$DEST"/deck/chapter/*

echo "==> writing workspace package.json ($NPM_NAME)"
node -e '
  const fs=require("fs");
  const dest=process.argv[1], name=process.argv[2], srcPkg=process.argv[3];
  const pkg=JSON.parse(fs.readFileSync(srcPkg,"utf8"));
  pkg.name=name; pkg.private=true;
  fs.writeFileSync(dest+"/package.json", JSON.stringify(pkg,null,2)+"\n");
' "$DEST" "$NPM_NAME" "$SRC/package.json"

echo "==> writing a minimal deck/slides.md (cover + closing; add chapters via src:)"
ADDONS_BLOCK=""
if [ -n "$ADDONS" ]; then
  ADDONS_BLOCK="addons:"$'\n'
  for a in $ADDONS; do ADDONS_BLOCK="$ADDONS_BLOCK  - slidev-addon-$a"$'\n'; done
fi
CONTACT_LINE=""
[ -n "${DECK_CONTACT:-}" ] && CONTACT_LINE="contact: $DECK_CONTACT"$'\n'

cat > "$DEST/deck/slides.md" <<EOF
---
title: $TITLE
theme: '@miragon/slidev-toolkit'
colorSchema: light
highlighter: shiki
transition: slide-up
${ADDONS_BLOCK}layout: cover
eyebrow: $EYEBROW
---

# $TITLE

<!-- Add chapters below via a src import block:
     ---
     src: ./chapter/NN-name/NN-name.md
     ---
-->

---
layout: closing
eyebrow: $EYEBROW
${CONTACT_LINE}---

# The end.
EOF

echo ""
echo "Done: decks/$SLUG"
echo "Next:"
echo "  1. Add \"decks/*\" to the root package.json workspaces (once) and mdeck/mbuild/mverify:<n> scripts."
echo "  2. npm install"
echo "  3. Migrate chapters into decks/$SLUG/deck/chapter/NN-name/NN-name.md and wire src: into slides.md."
