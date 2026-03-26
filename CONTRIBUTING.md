# Contributing to Vouch

## Quick Start

```bash
git clone https://github.com/fluentflier/vouch.git
cd vouch
pnpm install
pnpm run build
pnpm run test
```

## Project Structure

```
packages/
  core/           Policy engine + security scanners (TypeScript)
  sdk-ts/         TypeScript SDK
  sdk-python/     Python SDK
  cli/            CLI: vouch scan, vouch watch, vouch init, vouch check
  mcp-server/     MCP server for AI coding tools
apps/
  web/            Next.js dashboard + API
policies/
  builtin/        Jac policy walkers
  examples/       YAML policy templates
```

## Development

```bash
# Build everything
pnpm run build

# Run tests
pnpm --filter @vouch/core run test        # TypeScript (68 tests)
cd packages/sdk-python && python -m pytest  # Python (14 tests)

# Build individual packages
pnpm --filter @vouch/core run build
pnpm --filter vouch-sdk run build
pnpm --filter vouch run build              # CLI
pnpm --filter vouch-mcp run build          # MCP server
pnpm --filter web run build                # Dashboard

# Run the scanner on your own code
node packages/cli/dist/index.js scan src/

# Start the file watcher
node packages/cli/dist/index.js watch

# Start the dashboard locally
pnpm --filter web run dev
```

## Adding a New Scanner

1. Create `packages/core/src/scanners/your-scanner.ts`
2. Export from `packages/core/src/scanners/index.ts`
3. Add tests in `packages/core/__tests__/`
4. Optionally create a Jac walker in `policies/builtin/`

## Adding a New Policy Pattern

1. Add the pattern to the relevant scanner in `packages/core/src/scanners/`
2. Add a test case
3. Run `pnpm --filter @vouch/core run test`

## Code Style

- TypeScript: strict mode, explicit return types on exported functions
- No `console.log` in library code (use the debug() wrapper)
- No `any` types in exported functions
- No em dashes anywhere

## Pull Requests

- One PR per feature or fix
- Include tests for new functionality
- Run `pnpm run build && pnpm run test` before submitting

## License

MIT
