# YAML Policy Reference

## File Structure

```yaml
agent: string          # Required. Agent identifier.
version: string        # Required. Policy version.
rules: PolicyRule[]    # Required. Evaluated top to bottom, first match wins.
jacExtension: string   # Optional. Path to .jac file for complex rules.
allowedActions: string[] # Optional. Scope guard prefixes.
rateLimits:            # Optional. Per-action rate limits.
  action_type:
    count: number
    windowSeconds: number
```

## PolicyRule

```yaml
- name: string         # Required. Unique rule name.
  verdict: PASS | BLOCK | CONFIRM  # Required.
  message: string      # Required. Human-readable explanation.
  blockReason: string   # Optional. One of: DESTRUCTIVE_ACTION, AUTO_SEND,
                        #   EXTERNAL_WRITE, SCOPE_VIOLATION, LOW_CONFIDENCE,
                        #   RATE_EXCEEDED, UNKNOWN_ACTION, CUSTOM
  trigger:             # Required. All conditions must match (AND logic).
    actionType: string | string[]
    actionContains: string | string[]
    actionStartsWith: string | string[]
    contextKey: string
    contextValueIn: any[]
    contextValueBelow: number
    contextValueAbove: number
    userApproved: boolean
```

## Evaluation Order

1. Developer YAML rules (this file)
2. Built-in action_safety (always runs)
3. Scope guard (if allowedActions declared)
4. Rate guard (if rateLimits declared)
5. Custom Jac extension (if jacExtension declared)
