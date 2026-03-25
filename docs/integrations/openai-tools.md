# OpenAI Tool Use Integration

Wrap OpenAI tool_use responses with Vouch before dispatching to tool functions.

## TypeScript

```typescript
import { createVouch } from 'vouch-sdk';

const vouch = createVouch({
  projectSlug: 'my-agent',
  apiEndpoint: 'https://vouch.run',
  apiKey: process.env.VOUCH_API_KEY!,
  mode: 'observe',
  policyPath: './vouch.policy.yaml',
});

// After receiving a tool_use response from OpenAI:
for (const toolCall of response.choices[0].message.tool_calls) {
  const args = JSON.parse(toolCall.function.arguments);

  const result = await vouch.protect(
    {
      actionType: toolCall.function.name,
      context: { source: 'openai', tool_call_id: toolCall.id },
    },
    () => executeToolFunction(toolCall.function.name, args),
    undefined,
    {
      onBlocked: (msg) => {
        // Return block message as tool result
        toolResults.push({ tool_call_id: toolCall.id, output: msg });
      },
    }
  );
}
```

## Python

```python
from vouch import create_vouch, VouchConfig, VouchInput

vouch = create_vouch(VouchConfig(
    project_slug='my-agent',
    api_endpoint='https://vouch.run',
    api_key=os.environ['VOUCH_API_KEY'],
    mode='observe',
    policy_path='./vouch.policy.yaml',
))

for tool_call in response.choices[0].message.tool_calls:
    args = json.loads(tool_call.function.arguments)

    result = await vouch.protect(
        VouchInput(
            action_type=tool_call.function.name,
            context={"source": "openai"},
        ),
        execute_fn=lambda: execute_tool(tool_call.function.name, args),
    )
```
