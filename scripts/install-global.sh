#!/bin/bash
# Install vouch globally so you can run `vouch` from any directory
# Usage: bash scripts/install-global.sh

set -e

VOUCH_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "  Installing vouch globally..."
echo ""

# Build if needed
if [ ! -f "$VOUCH_DIR/packages/cli/dist/index.js" ]; then
  echo "  Building..."
  cd "$VOUCH_DIR"
  command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
  pnpm install --silent 2>/dev/null
  pnpm run build 2>/dev/null
fi

# Create wrapper in ~/bin
mkdir -p "$HOME/bin"
cat > "$HOME/bin/vouch" << WRAPPER
#!/bin/bash
node "$VOUCH_DIR/packages/cli/dist/index.js" "\$@"
WRAPPER
chmod +x "$HOME/bin/vouch"

# Add to PATH if not already there
if ! echo "$PATH" | grep -q "$HOME/bin"; then
  SHELL_RC=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
  fi

  if [ -n "$SHELL_RC" ]; then
    if ! grep -q 'HOME/bin' "$SHELL_RC" 2>/dev/null; then
      echo 'export PATH="$HOME/bin:$PATH"' >> "$SHELL_RC"
      echo "  Added ~/bin to PATH in $(basename "$SHELL_RC")"
    fi
  fi
fi

echo ""
echo "  Done! Open a new terminal, then run:"
echo ""
echo "    vouch verify     Trust score for your codebase"
echo "    vouch scan       Scan for secrets and unsafe code"
echo "    vouch watch      Real-time file watcher"
echo "    vouch init       Set up in your project"
echo ""
