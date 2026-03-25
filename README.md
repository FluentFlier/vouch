Vouch is an open-source runtime safety layer for AI agents. One function wraps any agent action, evaluates it against your policies, and returns PASS, BLOCK, or CONFIRM before execution.

AI agents act autonomously, but there is no standard way to declare what an agent should and should not do. When an agent sends an email, deletes a file, or charges a credit card, nothing sits between the LLM's decision and the execution. If something goes wrong, there is no audit trail. Vouch gives developers a vocabulary for expressing behavioral constraints and a runtime to enforce them.

## How it works

- **Write policies in YAML** (or Jac for complex stateful rules) that declare what your agent can do, what requires confirmation, and what is never allowed.
- **Wrap agent actions** with `vouch.protect()`. Every action is evaluated against your policies before it executes. Under 10ms overhead on a PASS verdict.
- **Log behavioral metadata** (never user content) for auditing, compliance, and trust reporting.

## Quick start

```bash
# Clone and install
git clone https://github.com/fluentflier/vouch.git
cd vouch && pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test
```

## Usage

### TypeScript

```typescript
import { createVouch } from 'vouch-sdk';

const vouch = createVouch({
  projectSlug: 'my-agent',
  mode: 'observe',                    // observe (default) or enforce
  policyPath: './vouch.policy.yaml',
  apiEndpoint: 'http://localhost:3000', // your own backend, or omit
  apiKey: 'optional',
});

const result = await vouch.protect(
  {
    actionType: 'send_email',
    context: { intent: 'DRAFT_REPLY', confidence: 0.88 },
  },
  () => emailClient.send(to, subject, body),  // runs only if allowed
  () => emailClient.cancelLastSend(),          // optional undo
  {
    onConfirmRequired: (msg, confirm, cancel) => showDialog(msg, confirm, cancel),
    onBlocked: (msg) => showError(msg),
  }
);
```

### Python

```python
from vouch import create_vouch, VouchConfig, VouchInput

vouch = create_vouch(VouchConfig(
    project_slug='my-agent',
    mode='observe',
    policy_path='./vouch.policy.yaml',
    api_endpoint='http://localhost:3000',
    api_key='optional',
))

result = await vouch.protect(
    VouchInput(action_type='send_email', context={'confidence': 0.88}),
    execute_fn=lambda: email_client.send(to, subject, body),
)
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

  - name: confirm_external_calls
    verdict: CONFIRM
    message: "This calls an external service. Proceed?"
    trigger:
      actionStartsWith: ["http_request", "api_call"]

  - name: low_confidence_block
    verdict: BLOCK
    blockReason: LOW_CONFIDENCE
    message: "Not confident enough to act."
    trigger:
      contextKey: "confidence"
      contextValueBelow: 0.50
```

YAML rules handle string matching, list membership, and numeric thresholds. For complex stateful rules (rate limiting, session tracking, multi-step verification), add a Jac extension. See `docs/writing-policies.md`.

## Integration

Vouch works with any agent framework. See integration guides in `docs/integrations/`:

- **Vercel AI SDK** - wrap tool calls with `vouch.protect()`
- **LangChain** - add as a tool interceptor
- **OpenAI tool_use** - evaluate before dispatching tool functions
- **FastAPI** - endpoint wrapper or middleware

## Architecture

```
vouch/
  packages/
    core/       Policy evaluation engine (TypeScript)
    sdk-ts/     TypeScript SDK - vouch.protect() wrapper
    sdk-python/ Python SDK - identical API surface
    cli/        CLI: vouch init, vouch check, vouch report
  apps/
    web/        Next.js dashboard + API (optional, self-hostable)
  policies/
    builtin/    Jac walkers: action_safety, scope_guard, rate_guard
    examples/   YAML policy templates for common agent types
```

The core engine and SDKs have **zero required runtime dependencies** beyond Node.js or Python stdlib. The dashboard is optional and self-hostable with any Supabase-compatible backend.

## Modes

- **observe** (default): Records all verdicts but never blocks execution. Use during development and beta to understand your agent's behavior.
- **enforce**: Fully enforces BLOCK and CONFIRM verdicts. Switch when you are confident in your policies.

## Self-hosting the dashboard

The `apps/web` directory contains a Next.js app that provides:
- Ingest API for receiving behavioral logs from the SDK
- Public trust pages showing pass rate, actions verified, policy breakdown
- Waitlist page

Deploy it anywhere that runs Next.js (Vercel, Railway, Docker) with a Supabase-compatible database. Apply `apps/web/db/schema.sql` to your database and set the env vars documented in `.env.example`.

## Built with Jac

Vouch's built-in policy walkers are written in [Jac](https://jaseci.org). Jac is an AI-native programming language whose Object-Spatial Programming model (typed graph traversal with deterministic rules) is the right tool for policy enforcement. The Jac MCP server validates policy files in development and CI. Developers can write custom policies in Jac for stateful rules that require graph traversal: rate limiting, session tracking, multi-step intent verification.

## License

MIT
