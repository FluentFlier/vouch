Vouch is an open-source security layer for AI agents and AI-generated code. It scans for secrets, PII, injection patterns, and unsafe code in real-time, enforces behavioral policies at runtime, and gives you a public trust page to prove your agent behaves correctly.

## The problem

AI coding tools generate code faster than developers can review it. AI-generated commits leak secrets at 2x the baseline rate. When you're vibe coding with Claude, Cursor, or Copilot, you don't read every line. Vouch is the safety net that catches what you miss.

## What Vouch does

**Security scanning** (`vouch scan`) -- catches secrets, PII, prompt injection, and unsafe patterns in your codebase. AI-aware: detects patterns specific to AI-generated code like inlined env vars, placeholder credentials, and disabled SSL.

**Real-time watching** (`vouch watch`) -- monitors file changes and scans every save. See issues the instant your AI writes them.

**Runtime policy enforcement** (`vouch.protect()`) -- wraps agent actions with YAML policies. Every action is evaluated: PASS, BLOCK, or CONFIRM. Under 10ms overhead.

**MCP server** (`vouch-mcp`) -- integrates directly into Claude Code and Cursor so the AI checks security BEFORE writing code.

## Quick start

```bash
git clone https://github.com/fluentflier/vouch.git
cd vouch && pnpm install && pnpm run build
```

### Scan your code

```bash
# Scan current directory
node packages/cli/dist/index.js scan

# Scan specific paths
node packages/cli/dist/index.js scan src/ config/

# Pre-commit hook (scan staged files only)
node packages/cli/dist/index.js scan --staged

# CI mode (JSON output, exit code 2 on critical)
node packages/cli/dist/index.js scan --json
```

### Watch for changes

```bash
node packages/cli/dist/index.js watch
```

### Use the MCP server

Add to your Claude Code or Cursor config:
```json
{
  "mcpServers": {
    "vouch": {
      "command": "npx",
      "args": ["vouch-mcp"],
      "type": "stdio"
    }
  }
}
```

The AI gets access to `scan_content`, `check_secret`, `check_safety`, and `check_injection` tools. It can verify code is safe before writing it to disk.

### Protect agent actions at runtime

```typescript
import { createVouch } from 'vouch-sdk';

const vouch = createVouch({
  projectSlug: 'my-agent',
  mode: 'observe',
  policyPath: './vouch.policy.yaml',
});

const result = await vouch.protect(
  { actionType: 'send_email', context: { confidence: 0.88 } },
  () => emailClient.send(to, subject, body),
);
```

## What gets detected

### Secrets
AWS keys, GitHub tokens, OpenAI/Anthropic keys, Stripe keys, database URLs, private keys, Slack tokens, SendGrid keys, generic API keys, passwords, bearer tokens.

### AI-specific patterns
Inlined environment variables, placeholder credentials that look real, disabled SSL verification, wildcard CORS, real values in .env.example files, chmod 777, debug endpoints.

### PII
Email addresses, phone numbers, SSNs, credit cards, IP addresses.

### Unsafe code
eval(), innerHTML assignment, SQL concatenation, command injection, disabled authentication, wildcard IAM permissions, security TODOs.

### Runtime policies
Action safety (destructive actions blocked), scope enforcement, rate limiting, prompt injection, context poisoning, cross-user data isolation, confidence calibration, undo integrity, session hijack detection.

## Architecture

```
packages/
  core/           Policy engine + 10 security scanners (TypeScript)
  sdk-ts/         TypeScript SDK: vouch.protect() wrapper
  sdk-python/     Python SDK: identical API surface
  cli/            CLI: scan, watch, init, check, report
  mcp-server/     MCP server for AI coding tools
apps/
  web/            Next.js dashboard + API (self-hostable)
policies/
  builtin/        12 Jac policy walkers
  examples/       YAML policy templates
```

## Policies

```yaml
agent: my-agent
version: "1.0"

rules:
  - name: no_production_writes
    verdict: BLOCK
    message: "Production writes require a deployment process."
    trigger:
      actionContains: ["prod", "production"]

  - name: confirm_sends
    verdict: CONFIRM
    message: "Review before sending."
    trigger:
      actionStartsWith: ["send_", "post_"]
```

## GitHub Actions

```yaml
- name: Vouch Security Scan
  run: |
    npx vouch scan --json
    # Exit code 2 = critical findings (blocks PR)
    # Exit code 1 = warnings
    # Exit code 0 = clean
```

## Self-hosting the dashboard

Deploy `apps/web` anywhere that runs Next.js. Apply `apps/web/db/schema.sql` to a Supabase-compatible database. Copy `apps/web/.env.example` and fill in your values.

## Built with Jac

Vouch's policy walkers are written in [Jac](https://jaseci.org). Jac's Object-Spatial Programming model (typed graph traversal with deterministic rules) makes policy enforcement extensible: adding a new pattern means adding a new node, not rewriting logic.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Tests

68 TypeScript tests + 14 Python tests, all passing.

```bash
pnpm --filter @vouch/core run test
cd packages/sdk-python && python -m pytest tests/ -v
```

## License

MIT
