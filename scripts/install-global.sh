#!/bin/bash
# Install vouch globally: CLI + MCP server
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

# Create ~/bin
mkdir -p "$HOME/bin"

# Install vouch CLI
cat > "$HOME/bin/vouch" << WRAPPER
#!/bin/bash
node "$VOUCH_DIR/packages/cli/dist/index.js" "\$@"
WRAPPER
chmod +x "$HOME/bin/vouch"

# Install vouch-mcp (standalone, zero dependencies)
cp "$VOUCH_DIR/packages/mcp-server/dist/standalone.js" "$HOME/bin/vouch-mcp-server.js" 2>/dev/null || true

# If standalone doesn't exist, compile it
if [ ! -f "$HOME/bin/vouch-mcp-server.js" ]; then
  cd "$VOUCH_DIR/packages/mcp-server"
  npx tsc src/standalone.ts --outDir /tmp/vouch-mcp-build --target ES2022 --module CommonJS --moduleResolution node --esModuleInterop --skipLibCheck 2>/dev/null
  cp /tmp/vouch-mcp-build/standalone.js "$HOME/bin/vouch-mcp-server.js" 2>/dev/null
fi

cat > "$HOME/bin/vouch-mcp" << WRAPPER
#!/bin/bash
exec node "$HOME/bin/vouch-mcp-server.js"
WRAPPER
chmod +x "$HOME/bin/vouch-mcp"

# Add to PATH if not already there
if ! echo "$PATH" | grep -q "$HOME/bin"; then
  SHELL_RC=""
  [ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"
  [ -z "$SHELL_RC" ] && [ -f "$HOME/.bashrc" ] && SHELL_RC="$HOME/.bashrc"
  [ -z "$SHELL_RC" ] && [ -f "$HOME/.bash_profile" ] && SHELL_RC="$HOME/.bash_profile"

  if [ -n "$SHELL_RC" ] && ! grep -q 'HOME/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/bin:$PATH"' >> "$SHELL_RC"
  fi
fi

echo ""
echo "  Installed:"
echo "    ~/bin/vouch         CLI tool"
echo "    ~/bin/vouch-mcp     MCP server for Claude Code / Cursor"
echo ""
echo "  Connect to Claude Code:"
echo "    claude mcp add vouch -s user -- vouch-mcp"
echo ""
echo "  Commands:"
echo "    vouch verify        Trust score for your codebase"
echo "    vouch scan          Scan for secrets and unsafe code"
echo "    vouch watch         Real-time file watcher"
echo "    vouch init          Set up in your project"
echo ""
echo "  Open a new terminal for PATH to take effect."
echo ""
