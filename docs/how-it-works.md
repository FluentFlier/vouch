# How Vouch Works

Vouch evaluates every agent action against a policy pipeline before execution. The pipeline has five steps, executed in order. The first non-PASS verdict wins.

## The Pipeline

1. **YAML rules** from the developer's policy file. These are synchronous string matching rules: exact action type, prefix matching, substring search, context value checks. Fast and predictable.

2. **Action Safety walker** (built-in Jac). Universal hard rules that apply to every agent. Actions like `delete_file`, `make_payment`, and `drop_table` are always blocked. Actions like `send_email` and `post_tweet` always require confirmation unless the user has already approved.

3. **Scope Guard walker** (built-in Jac). Checks whether the action falls within the agent's declared scope. Only runs if the policy file declares `allowedActions`. If no scope is declared, this step passes everything.

4. **Rate Guard walker** (built-in Jac). Limits how often specific action types can occur within a time window. Uses Jac's graph model to maintain per-action counters. Only runs if the policy declares `rateLimits`.

5. **Custom Jac extension** (developer-written). If the policy file includes a `jacExtension` path, that walker runs last. Use this for stateful rules that require graph traversal.

## Verdicts

- **PASS**: Action clears all policies. Execute immediately.
- **BLOCK**: Action violates a hard rule. Never execute.
- **CONFIRM**: Action needs user confirmation before executing.

## Log Entry

After every verdict, a log entry is sent fire-and-forget to the ingest API. Fields stored:

| Field | Purpose |
|-------|---------|
| actionType | What the agent tried to do |
| verdict | PASS, BLOCK, or CONFIRM |
| userDecision | CONFIRMED or CANCELLED (for CONFIRM verdicts) |
| policyTriggered | Which policy produced the verdict |
| blockReason | Why it was blocked (for BLOCK verdicts) |
| durationMs | How long evaluation took |
| timestamp | When it happened |

**Not stored**: actionPayload contents, raw user input, user ID, PII.
