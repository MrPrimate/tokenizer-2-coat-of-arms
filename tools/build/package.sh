#!/bin/bash
# Builds a release into package/: module.json and tokenizer-2-coat-of-arms.zip.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

MODULE_ID="tokenizer-2-coat-of-arms"
PACKAGE_DIR="package"
TARGET_DIR="$PACKAGE_DIR/$MODULE_ID"

rm -rf "$PACKAGE_DIR"
mkdir -p "$TARGET_DIR"

npm run build
node ./tools/build/build-module-json.mjs > "$TARGET_DIR/module.json"
# art/charges-by-sa holds the CC BY-SA pictures, kept apart from the rest
cp -r ./dist ./styles ./lang ./art ./README.md "$TARGET_DIR/"

(cd "$TARGET_DIR" && zip -qr "../$MODULE_ID.zip" .)
cp "$TARGET_DIR/module.json" "$PACKAGE_DIR/"

echo "Packaged $MODULE_ID $(node -p "require('./package.json').version") in $PACKAGE_DIR/"
