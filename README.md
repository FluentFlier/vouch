Vouch is an open-source security layer for AI-generated code. It gives every file in your codebase a deterministic trust score (0-100), catches secrets and unsafe patterns in real-time, and integrates with Claude Code and Cursor via MCP so the AI checks its own work before writing.

## Install (one time, works everywhere)

```bash
git clone https://github.com/fluentflier/vouch.git ~/.vouch
cd ~/.vouch && npm install -g pnpm && pnpm install && pnpm run build
bash ~/.vouch/scripts/install-global.sh
```

Open a new terminal. `vouch` and `vouch-mcp` now work from any directory.

### Connect to Claude Code (automatic)

```bash
claude mcp add vouch -s user -- vouch-mcp
```

Restart Claude Code. The AI now has access to `verify_file`, `scan_content`, `check_secret`, `check_safety`, and `check_injection` tools globally across all projects.

## Verify it works

```bash
cd your-project
vouch verify
```

You should see something like:

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

  Files: 1 critical, 1 warning, 634 clean
```

## Commands

| Command | What it does |
|---------|-------------|
| `vouch verify` | Trust score (0-100) per file with line-by-line findings and fixes |
| `vouch scan` | Scan for secrets, PII, injection patterns, unsafe code |
| `vouch scan --staged` | Scan only staged git changes (pre-commit hook) |
| `vouch watch` | Real-time file watcher with live dashboard |
| `vouch init` | Set up policy file, pre-commit hooks, MCP config |
| `vouch verify --json` | Machine-readable output for CI pipelines |
| `vouch scan --fix --apply` | Auto-fix: replace hardcoded secrets with env vars |

## Set up in your project

```bash
cd your-project
vouch init
```

Creates:
- `vouch.policy.yaml` with default security rules
- `.mcp.json` with MCP server config for Claude Code / Cursor
- Pre-commit hook that runs `vouch scan --staged` before every commit

## MCP server for Claude Code / Cursor

After `vouch init`, the MCP server is auto-configured. It gives your AI coding tool 5 tools:

| Tool | What it does |
|------|-------------|
| `verify_file` | Trust score with findings and fix suggestions. If score < 50, tells AI to fix before writing. |
| `scan_content` | Scans for secrets, PII, injection, unsafe code |
| `check_secret` | Checks if a string value is a credential |
| `check_safety` | Checks for eval(), innerHTML, SQL injection |
| `check_injection` | Detects prompt injection in external content |

The AI can call `verify_file` before writing any file. If the trust score is below 50, it gets: "DO NOT write this file. Fix the critical issues first."

## What gets detected

**Secrets:** AWS keys, GitHub tokens, OpenAI/Anthropic keys, Stripe keys, database URLs, private keys, Slack tokens, SendGrid keys, passwords, bearer tokens.

**AI-generated patterns (tagged [AI]):** Inlined environment variables, placeholder credentials, disabled SSL verification, wildcard CORS, chmod 777, dangerouslySetInnerHTML, unhandled fetch calls.

**PII:** SSNs, credit cards in source code.

**Unsafe code:** eval(), innerHTML, SQL concatenation, command injection, wildcard IAM permissions, skip-verification flags.

**Languages:** TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, Ruby, PHP, C/C++, C#, Shell, SQL, YAML, JSON, Vue, Svelte, and 20+ more.

## GitHub Actions

```yaml
- name: Vouch Trust Score
  run: |
    vouch verify --json
    # Exit 2 = trust < 50 (critical), Exit 1 = trust < 80 (warning), Exit 0 = clean
```

## How trust scores work

Every file gets a score from 0 to 100 based on deterministic checks (not AI opinions):

- **CRITICAL findings** deduct 15 points each (max -60): hardcoded secrets, eval(), SSN in source
- **WARNING findings** deduct 5 points each (max -25): disabled SSL, wildcard CORS, innerHTML
- **INFO findings** deduct 1 point each (max -10): unhandled fetch, console.log with user data

Test files get 0.5x deductions (they legitimately contain "unsafe" patterns).

Codebase score = weighted average of file scores by lines of code.

Every finding includes a plain-English explanation and a specific fix suggestion.

## Architecture

```
~/.vouch/
  packages/
    core/           Trust score engine + 11 security scanners
    sdk-ts/         TypeScript SDK: vouch.protect()
    sdk-python/     Python SDK: identical API
    cli/            CLI: verify, scan, watch, init, check, report
    mcp-server/     MCP server for AI coding tools
  apps/
    web/            Dashboard + interactive demo
  policies/
    builtin/        12 Jac policy walkers (deterministic verification)
    examples/       4 YAML policy templates
```

## Runtime policy enforcement

For AI agents that take actions (send emails, create events, modify data):

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

Trust scores are computed by Jac walkers -- deterministic graph traversal, not AI opinions. A Jac walker saying "this function has no error handling" is a provable fact. That's what makes Vouch different from AI-powered code reviewers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). 68 TypeScript + 14 Python tests.

```bash
cd ~/.vouch && pnpm run test
```

## License

MIT
