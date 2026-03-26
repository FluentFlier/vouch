Vouch is an open-source security layer for AI-generated code. It gives every file in your codebase a trust score (0-100), catches secrets and unsafe patterns, and runs as a background watcher while you vibe code.

## Install

```bash
# Clone and build (one time)
git clone https://github.com/fluentflier/vouch.git ~/.vouch
cd ~/.vouch && npm install -g pnpm && pnpm install && pnpm run build

# Install globally (run `vouch` from any directory)
bash ~/.vouch/scripts/install-global.sh
```

After install, `vouch` works from any project directory.

## Usage

```bash
# Trust score for your codebase (0-100 per file)
vouch verify

# Scan for secrets and unsafe code
vouch scan

# Real-time watcher (scans every file save)
vouch watch

# Pre-commit hook (scan staged files before commit)
vouch scan --staged

# JSON output for CI
vouch verify --json
```

### Set up in a new project

```bash
cd your-project
vouch init
```

This creates:
- `vouch.policy.yaml` -- your security rules
- `.mcp.json` -- MCP server config for Claude Code / Cursor
- Pre-commit hook (optional, asks during init)

### MCP server (AI checks before writing)

The MCP server lets Claude Code and Cursor verify code BEFORE writing it. After `vouch init`, the `.mcp.json` is already configured. The AI gets these tools:

- `verify_file` -- trust score with line-by-line findings and fix suggestions
- `scan_content` -- scan for secrets, PII, injection patterns
- `check_secret` -- check if a string is a credential
- `check_safety` -- check for eval(), innerHTML, SQL injection

### Trust scores

`vouch verify` gives every file a trust score from 0 to 100:

```
  VOUCH VERIFY  636 files  0.2s
  ==================================================

  CODEBASE TRUST SCORE: 97/100

  src/config.ts                      32/100  CRITICAL
    CRIT Line 14   Database URL detected
         FIX: Move to process.env.DATABASE_URL
    WARN Line 23   Disabled SSL  [AI]
         FIX: Set rejectUnauthorized: true

  src/utils.ts                       95/100  PASS
    INFO Line 47   fetch() without error handling  [AI]
         FIX: Wrap in try/catch or add .catch()

  Files: 1 critical, 634 clean
```

Findings tagged `[AI]` are patterns specific to AI-generated code.

## What gets detected

**Secrets:** AWS keys, GitHub tokens, OpenAI/Anthropic keys, Stripe keys, database URLs, private keys, Slack tokens, SendGrid keys, passwords, bearer tokens.

**AI-specific patterns:** Inlined env vars, placeholder credentials, disabled SSL, wildcard CORS, chmod 777, debug endpoints, dangerouslySetInnerHTML.

**PII:** SSNs, credit cards (in source code).

**Unsafe code:** eval(), innerHTML, SQL concatenation, command injection, wildcard IAM permissions, skip-verification flags.

**Supports:** TypeScript, JavaScript, Python, Go, Rust, Java, Swift, Ruby, PHP, C/C++, Shell, SQL, YAML, JSON, Vue, Svelte, and 20+ more languages.

## GitHub Actions

```yaml
- name: Vouch Trust Score
  run: |
    vouch verify --json
    # Exit 2 = critical (trust < 50), Exit 1 = warning (trust < 80), Exit 0 = clean
```

## Architecture

```
packages/
  core/           Trust score engine + security scanners (TypeScript)
  sdk-ts/         TypeScript SDK: vouch.protect() wrapper
  sdk-python/     Python SDK: identical API surface
  cli/            CLI: verify, scan, watch, init, check, report
  mcp-server/     MCP server for AI coding tools
apps/
  web/            Next.js dashboard + interactive demo
policies/
  builtin/        12 Jac policy walkers
  examples/       YAML policy templates
```

## Runtime policy enforcement

For AI agents that take actions (not just write code):

```typescript
import { createVouch } from 'vouch-sdk';

const vouch = createVouch({
  projectSlug: 'my-agent',
  mode: 'observe',
  policyPath: './vouch.policy.yaml',
});

await vouch.protect(
  { actionType: 'send_email', context: { confidence: 0.88 } },
  () => emailClient.send(to, subject, body),
);
```

## Built with Jac

Policy walkers written in [Jac](https://jaseci.org) -- deterministic graph traversal for code verification. Not AI opinions. Facts.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). 68 TypeScript + 14 Python tests.

## License

MIT
