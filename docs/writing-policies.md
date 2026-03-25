# Writing Policies

## YAML Policy Format

A Vouch policy file (`vouch.policy.yaml`) defines rules that are evaluated top to bottom. First match wins.

```yaml
agent: my-agent
version: "1.0"

rules:
  - name: rule_name
    verdict: BLOCK | CONFIRM | PASS
    message: "Human-readable explanation"
    blockReason: DESTRUCTIVE_ACTION  # optional, for BLOCK verdicts
    trigger:
      actionType: "exact_match"           # or ["match1", "match2"]
      actionContains: ["substring"]       # matches anywhere in actionType
      actionStartsWith: ["prefix"]        # matches start of actionType
      contextKey: "key_name"              # checks input.context[key]
      contextValueIn: ["val1", "val2"]    # context value must be in list
      contextValueBelow: 0.5             # context value must be < threshold
      contextValueAbove: 100             # context value must be > threshold
      userApproved: true                 # checks input.userApproved
```

## Trigger Reference

All trigger conditions must be true for a rule to match (AND logic). Omitted conditions are ignored.

| Field | Type | Behavior |
|-------|------|----------|
| `actionType` | string or string[] | Exact match (case-insensitive) |
| `actionContains` | string or string[] | Substring match (case-insensitive) |
| `actionStartsWith` | string or string[] | Prefix match (case-insensitive) |
| `contextKey` | string | Which context field to check |
| `contextValueIn` | any[] | Context value must be in this list |
| `contextValueBelow` | number | Context value must be less than this |
| `contextValueAbove` | number | Context value must be greater than this |
| `userApproved` | boolean | Whether user has confirmed |

## Common Patterns

**Block dangerous actions:**
```yaml
- name: no_deletes
  verdict: BLOCK
  message: "Deletion is not permitted."
  trigger:
    actionContains: ["delete", "remove", "purge"]
```

**Confirm before external communication:**
```yaml
- name: confirm_messages
  verdict: CONFIRM
  message: "Review this message before sending."
  trigger:
    actionStartsWith: ["send_", "post_", "publish_"]
```

**Block low-confidence actions:**
```yaml
- name: low_confidence
  verdict: BLOCK
  blockReason: LOW_CONFIDENCE
  message: "Confidence too low to act."
  trigger:
    contextKey: "confidence"
    contextValueBelow: 0.5
```

## Testing Policies

```bash
vouch check
```

This validates all `.yaml` and `.jac` policy files in the current directory and `policies/` subdirectory.

## Jac Extensions

For complex stateful rules, add a `jacExtension` field pointing to a `.jac` file:

```yaml
jacExtension: ./policies/custom.jac
```

The walker must be named `CheckCustom` and accept `action_type` and `context` arguments. See `policies/builtin/rate_guard.jac` for an example of stateful policy logic using Jac's graph model.
