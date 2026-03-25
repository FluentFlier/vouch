# Vercel AI SDK Integration

Wrap Vercel AI SDK tool calls with Vouch to enforce policies before execution.

## Setup

```typescript
import { createVouch } from 'vouch-sdk';
import { tool } from 'ai';

const vouch = createVouch({
  projectSlug: 'my-agent',
  apiEndpoint: 'https://vouch.run',
  apiKey: process.env.VOUCH_API_KEY!,
  mode: 'observe',
  policyPath: './vouch.policy.yaml',
});
```

## Wrapping Tool Calls

```typescript
const sendEmailTool = tool({
  description: 'Send an email',
  parameters: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    return vouch.protect(
      {
        actionType: 'send_email',
        actionPayload: { to, subject, body },
        context: { intent: 'SEND_EMAIL' },
      },
      () => emailClient.send(to, subject, body),
      undefined,
      {
        onBlocked: (msg) => { throw new Error(msg); },
      }
    );
  },
});
```

Map the tool name to `actionType` and tool parameters to `context` fields that your policies reference.
