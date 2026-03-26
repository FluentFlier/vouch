#!/bin/bash
# Vouch Quick Setup
# Run: curl -fsSL https://raw.githubusercontent.com/fluentflier/vouch/main/scripts/setup.sh | bash
# Or:  bash <(curl -fsSL https://raw.githubusercontent.com/fluentflier/vouch/main/scripts/setup.sh)

set -e

GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}  vouch${NC} - Runtime safety for AI agents"
echo -e "  ${DIM}Setting up...${NC}"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo -e "${RED}  Node.js is required. Install from https://nodejs.org${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}  Git is required.${NC}"; exit 1; }

# Clone if not in vouch repo
if [ ! -f "package.json" ] || ! grep -q '"name": "vouch"' package.json 2>/dev/null; then
  echo -e "  ${DIM}Cloning vouch...${NC}"
  git clone --depth 1 https://github.com/fluentflier/vouch.git .vouch-install
  cd .vouch-install
fi

# Install
echo -e "  ${DIM}Installing dependencies...${NC}"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --silent 2>/dev/null
else
  npm install -g pnpm 2>/dev/null
  pnpm install --silent 2>/dev/null
fi

# Build
echo -e "  ${DIM}Building packages...${NC}"
pnpm --filter @vouch/core run build 2>/dev/null
pnpm --filter vouch-sdk run build 2>/dev/null
pnpm --filter vouch run build 2>/dev/null
pnpm --filter vouch-mcp run build 2>/dev/null

echo ""
echo -e "${GREEN}${BOLD}  Vouch is ready.${NC}"
echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo -e "    vouch scan              Scan your code for secrets and unsafe patterns"
echo -e "    vouch scan --staged     Pre-commit scan (staged files only)"
echo -e "    vouch scan --fix        Auto-fix detected issues"
echo -e "    vouch watch             Real-time file watcher"
echo -e "    vouch init --hooks      Set up pre-commit hooks"
echo ""
echo -e "  ${BOLD}MCP Server (for Claude Code / Cursor):${NC}"
echo -e "    npx vouch-mcp           Start the MCP server"
echo ""
echo -e "  ${BOLD}Integration:${NC}"
echo -e "    npm install vouch-sdk   Add to your project"
echo ""
