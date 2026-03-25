# Jac Policy Walkers

Vouch's built-in safety rules are written in [Jac](https://jaseci.org), an AI-native language whose graph traversal model is well-suited for stateful policy enforcement.

## Built-in Walkers

### action_safety.jac

Universal hard rules. Maintains two lists:
- `ALWAYS_BLOCK_PREFIXES`: Actions that are never allowed (delete, drop, payment)
- `ALWAYS_CONFIRM_PREFIXES`: Actions that always need user confirmation (send, publish, share)

### scope_guard.jac

Checks if the action falls within the agent's declared scope (the `allowedActions` list in the policy file). Opt-in: if no scope is declared, everything passes.

### rate_guard.jac

Stateful rate limiting using Jac graph nodes. Each action type gets an `ActionCounter` node that tracks invocations within a sliding time window.

## Writing Custom Walkers

Create a `.jac` file and reference it in your policy:

```yaml
jacExtension: ./policies/custom.jac
```

Your walker must be named `CheckCustom`:

```jac
import from vouch.policies.builtin._base { * }

walker CheckCustom {
    has action_type: str;
    has context: dict = {};

    can check with entry {
        # Your custom logic here
        report pass_result("custom_check");
    }
}
```

All walkers must be deterministic. Never use `by llm()` in policy files.
