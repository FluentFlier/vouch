#!/bin/bash
# Install vouch globally so you can run `vouch` from any directory
# Usage: bash scripts/install-global.sh

set -e

VOUCH_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "  Installing vouch globally from $VOUCH_DIR"
echo ""

# Build if needed
if [ ! -f "$VOUCH_DIR/packages/cli/dist/index.js" ]; then
  echo "  Building..."
  cd "$VOUCH_DIR"
  command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
  pnpm install --silent 2>/dev/null
  pnpm run build 2>/dev/null
fi

# Create wrapper script
WRAPPER="/usr/local/bin/vouch"
cat > /tmp/vouch-wrapper << WRAPPER_EOF
#!/bin/bash
node "$VOUCH_DIR/packages/cli/dist/index.js" "\$@"
WRAPPER_EOF

if [ -w /usr/local/bin ]; then
  mv /tmp/vouch-wrapper "$WRAPPER"
  chmod +x "$WRAPPER"
else
  sudo mv /tmp/vouch-wrapper "$WRAPPER"
  sudo chmod +x "$WRAPPER"
fi

echo "  Done! You can now run 'vouch' from any directory."
echo ""
echo "  Commands:"
echo "    vouch verify          Trust score for your codebase"
echo "    vouch scan            Scan for secrets and unsafe code"
echo "    vouch watch           Real-time file watcher"
echo "    vouch init            Set up pre-commit hooks + MCP"
echo ""
