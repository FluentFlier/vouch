Vouch is an open-source runtime safety protocol that lets developers define, enforce, and prove what their AI agents are allowed to do.

AI agents act autonomously, but there is no standard way to declare what an agent should and should not do. When an agent sends an email, deletes a file, or charges a credit card, nothing sits between the LLM's decision and the execution. If something goes wrong, there is no audit trail. Developers have no vocabulary for expressing behavioral constraints, and users have no way to verify that an agent behaves correctly.

## How it works

- **Policies are YAML files** (or Jac for complex stateful rules) that declare what your agent can do, what requires confirmation, and what is never allowed.
- **At runtime, every action is evaluated** against your policies before it executes. Verdicts are PASS, BLOCK, or CONFIRM. Evaluation adds under 10ms on a PASS.
- **Results are logged** (no user content, only behavioral metadata) and visible at `vouch.run/[your-slug]` as a public trust page.

## Install

```bash
# TypeScript / JavaScript
npm install vouch-sdk
pip install jaseci       # for policy validation

# Python
pip install vouch-sdk    # coming soon (source in packages/sdk-python)

# CLI
npm install -g vouch
vouch init
```

## Usage

### TypeScript

```typescript
import { createVouch } from 'vouch-sdk';

const vouch = createVouch({
  projectSlug: 'my-agent',
  apiEndpoint: 'https://vouch.run',
  apiKey: process.env.VOUCH_API_KEY,
  mode: 'observe',
  policyPath: './vouch.policy.yaml',
});

const result = await vouch.protect(
  {
    actionType: 'send_email',
    actionPayload: { to, subject, body },
    context: { intent: 'DRAFT_REPLY', confidence: 0.88 },
  },
  () => emailClient.send(to, subject, body),
  () => emailClient.cancelLastSend(),
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
    api_endpoint='https://vouch.run',
    api_key=os.environ['VOUCH_API_KEY'],
    mode='observe',
    policy_path='./vouch.policy.yaml',
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
```

YAML rules handle string matching, list membership, and numeric thresholds. For complex stateful rules (rate limiting, session tracking, multi-step verification), add a Jac extension file. See `docs/writing-policies.md`.

## Trust page

Every Vouch project gets a public trust page at `vouch.run/[slug]`. It shows aggregate behavioral proof: pass rate, actions verified, policies triggered, and block/confirm breakdown. Zero user content is stored. Share it with users, add it to pitch decks, or embed the badge on your landing page.

## Modes

- **observe** (default): Records all verdicts but never blocks execution. Use this during development and beta.
- **enforce**: Fully enforces BLOCK and CONFIRM verdicts. Switch when you are confident in your policies.

## Built with Jac

Vouch's built-in policy walkers are written in [Jac](https://jaseci.org). Jac is an AI-native programming language whose Object-Spatial Programming model (typed graph traversal with deterministic rules) is the right tool for policy enforcement. The Jac MCP server validates policy files in development and CI. Developers can write custom policies in Jac for stateful rules that require graph traversal: rate limiting, session tracking, multi-step intent verification. This was demonstrated at JacHacks.

## License

MIT
