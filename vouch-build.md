# VOUCH — COMPLETE BUILD PROMPT FOR CLAUDE CODE
# ================================================
# Paste this entire file into Claude Code at a fresh repo root.
# This builds Vouch as a standalone open-source product, not inside Ada.
#
# Prerequisites (verify before starting):
#   node --version        → 20+
#   python --version      → 3.11+
#   jac --version         → installed via `pip install jaseci`
#   npx ruflo@latest --version  → installed
#   gstack skills present → type /help in Claude Code and verify
#   Supabase project created → have SUPABASE_URL and SUPABASE_SERVICE_KEY ready
#   ANTHROPIC_API_KEY set → for Jac MCP byLLM usage in tests only
#
# IMPORTANT RULES FOR CLAUDE — READ BEFORE BUILDING:
#   1. Never use em dashes (—) anywhere. Not in code, comments, README, CLI output, anywhere.
#   2. Never write `by llm()` inside any policy walker file. Policies are deterministic.
#   3. Never store raw user content in Supabase. Only metadata (see schema).
#   4. Never use `console.log` in library code. Use the debug() wrapper.
#   5. All exported TypeScript functions must have explicit return types.
#   6. Do not ask for confirmation between phases. Build everything sequentially.
#   7. When a phase fails, fix it and continue. Never stop mid-build.
#   8. Use the Jac MCP to validate every .jac file before saving it.
# ================================================

---

## WHAT YOU ARE BUILDING

Vouch is an open-source runtime safety protocol for AI agents. It answers one
question that no tool currently answers: "What is this agent allowed to do, and
can you prove it?"

The three things Vouch ships:

1. A POLICY SCHEMA. A YAML format (with a Jac extension for complex rules)
   that any developer can use to define what their agent is allowed to do.
   Framework-agnostic, language-agnostic. Works with LangChain, Vercel AI SDK,
   raw Anthropic tool_use, LlamaIndex, or any custom agent.

2. A RUNTIME SDK. Available in TypeScript and Python. One wrapper function
   that intercepts any agent action, evaluates it against the developer's
   policies, and returns PASS / BLOCK / CONFIRM. Adds under 10ms overhead
   on a PASS verdict. Starts in observe mode (records but never blocks).

3. A PUBLIC TRUST PAGE. `https://vouch.run/[slug]` shows aggregate behavioral
   proof: how many actions ran, what percentage cleared policy, what categories
   were blocked, what required confirmation. Zero user content stored. Just
   behavioral metadata. Shareable with users and investors as evidence the
   agent behaves correctly.

The Jac connection: Vouch's policy walkers are written in Jac (jaseci.org).
This is the right use of Jac: deterministic typed graph traversal for policy
enforcement, not LLM calls. The Jac MCP validates policy files in development
and CI. Developers can write custom policies in Jac for complex stateful rules.

---

## TOOL SETUP (do this first, before any code)

### Step 1: Initialize git repo
```bash
git init
echo "node_modules/\n.env\n.env.local\ndist/\n__pycache__/\n*.pyc\n.DS_Store" > .gitignore
```

### Step 2: Configure Jac MCP
Create `.mcp.json`:
```json
{
  "mcpServers": {
    "jac": {
      "command": "jac",
      "args": ["mcp"],
      "type": "stdio"
    }
  }
}
```
Verify it works: `jac mcp --inspect`
You must see tools listed (validate_jac, check_syntax, etc.).
If not: `pip install --upgrade jaseci` and retry.

### Step 3: Store project context in Ruflo memory
```bash
npx ruflo@latest mcp execute memory_usage \
  --action store \
  --key "vouch/project" \
  --value "Building Vouch: open-source runtime safety protocol for AI agents.
  Universal policy schema (YAML + Jac), TypeScript SDK, Python SDK,
  Next.js dashboard, Supabase backend. No LLM in policy evaluation.
  All walkers deterministic. Observe mode default. Public trust page."
```

### Step 4: Verify gstack
Type `/help` in Claude Code. Confirm present:
/plan-eng-review, /review, /cso, /qa, /ship
If missing: `cd ~/.claude/skills/gstack && ./setup`

---

## PHASE 0: ARCHITECTURE LOCK

Run gstack `/plan-eng-review` with this exact spec. Do not write a single
line of application code until the review is complete and architecture locked.

```
PRODUCT: Vouch
VERSION: 0.1.0

CORE FLOW:
  Developer wraps their agent action with vouch.protect(input, fn, hooks)

  Input contains:
    actionType     string   what the agent wants to do (e.g. "send_email")
    actionPayload  object   what it wants to do it with (redacted before storage)
    context        object   arbitrary key-value context (intent, confidence, etc.)
    userApproved   boolean  has the user already confirmed this?

  Vouch evaluates the input against the developer's policy file (.yaml or .jac)

  Policy evaluation is DETERMINISTIC -- no LLM calls, pure rule matching:
    - YAML policies: string matching, list membership, numeric thresholds
    - Jac policies: typed walker traversal for complex stateful rules

  Verdict options:
    PASS    action clears all policies, execute immediately
    BLOCK   action violates a hard rule, never execute
    CONFIRM action needs user confirmation before executing

  SDK handles verdict:
    PASS    calls fn() immediately, returns result
    BLOCK   calls hooks.onBlocked(message), throws VouchBlockedError if mode=enforce
    CONFIRM calls hooks.onConfirmRequired(message, confirmFn, cancelFn)
            if user confirms: calls fn(), then starts undo window if undoFn provided
            if user cancels: returns null

  After every verdict, a log entry is sent fire-and-forget to the ingest API:
    Stored: actionType, verdict, policyTriggered, blockReason, durationMs, timestamp
    NOT stored: actionPayload contents, raw user input, user ID, PII of any kind

  Mode:
    observe  records all verdicts, never blocks execution (default)
    enforce  fully enforces BLOCK and CONFIRM verdicts

COMPONENTS:
  packages/
    core/          TypeScript: policy evaluation engine, Jac subprocess runner
    sdk-ts/        TypeScript: developer-facing SDK (wraps core)
    sdk-python/    Python: identical API surface to sdk-ts
    cli/           TypeScript: vouch init, vouch check, vouch report
  apps/
    dashboard/     Next.js 14: public trust pages at vouch.run/[slug]
    api/           Next.js 14 API routes: ingest, project stats
  policies/
    builtin/       Jac: built-in walkers (action_safety, scope_guard, confidence)
    examples/      YAML: example policy files for common agent types

TECH STACK:
  TypeScript 5.3, Node.js 20, Bun for builds
  Python 3.11, no heavy dependencies (requests optional)
  Next.js 14 app router, Tailwind CSS
  Supabase (Postgres + RLS)
  Jac (jaseci) for policy walkers
  Zod for validation
  Vitest for TS tests, pytest for Python tests

MUST SATISFY:
  - Policy evaluation under 200ms on PASS (Jac subprocess with timeout)
  - SDK has zero required runtime dependencies beyond Node.js / Python stdlib
  - vouch-sdk npm package works in Next.js, Express, LangChain.js, bare Node
  - vouch Python package works in FastAPI, LangChain, bare Python scripts
  - No LLM API calls in the hot path
  - Public dashboard loads under 1 second (ISR with 30s revalidation)
  - All Supabase tables have RLS enabled
  - Zero raw user content stored anywhere
```

After `/plan-eng-review` completes and you have a locked architecture:
```bash
npx ruflo@latest mcp execute memory_usage \
  --action store \
  --key "vouch/arch-locked" \
  --value "[paste locked architecture summary here]"
```

---

## PHASE 1: DIRECTORY SCAFFOLD

Create this exact monorepo structure. Use empty files where content comes later.

```
vouch/                              <- repo root
  packages/
    core/
      src/
        engine.ts                   policy evaluation orchestrator
        subprocess.ts               Jac walker subprocess runner
        yaml-evaluator.ts           YAML policy rule evaluator
        log.ts                      fire-and-forget log sender
        undo.ts                     undo window logic
        types.ts                    all shared TypeScript types
        constants.ts
        index.ts
      package.json
      tsconfig.json
      vitest.config.ts
      __tests__/
        engine.test.ts
        yaml-evaluator.test.ts
        subprocess.test.ts

    sdk-ts/
      src/
        client.ts                   VouchClient class
        index.ts                    public exports
      package.json
      tsconfig.json
      README.md
      __tests__/
        client.test.ts

    sdk-python/
      vouch/
        __init__.py
        client.py                   VouchClient class
        types.py                    dataclasses for input/output
        engine.py                   policy evaluation (calls Jac subprocess)
        log.py                      fire-and-forget log sender
        constants.py
      tests/
        test_client.py
        test_engine.py
      pyproject.toml
      README.md

    cli/
      src/
        index.ts                    entry point, command router
        commands/
          init.ts
          check.ts
          report.ts
          dev.ts                    runs a local vouch dashboard (bonus)
        utils/
          config.ts                 reads/writes vouch.config.yaml
          table.ts                  terminal table renderer (no dependencies)
          colors.ts                 ANSI color codes (no chalk)
      package.json
      tsconfig.json

  apps/
    web/                            Next.js app (dashboard + API)
      app/
        page.tsx                    landing: enter slug or learn more
        [slug]/
          page.tsx                  public trust page
          loading.tsx               skeleton
          not-found.tsx             clean 404
        api/
          ingest/
            route.ts                POST: receives SDK log entries
          project/
            [slug]/
              route.ts              GET: project stats for dashboard
          health/
            route.ts                GET: health check
      components/
        PolicyScore.tsx             hero: circular pass rate display
        ActionFeed.tsx              recent activity log
        PolicyBreakdown.tsx         per-policy stats table
        TrendChart.tsx              30-day pass rate sparkline
        VerifiedBadge.tsx           embeddable SVG badge
        Skeleton.tsx                loading skeletons
      lib/
        supabase.ts
        fetcher.ts
        format.ts                   number/date formatting
        meta.ts                     OG tag generation
      public/
        badge.svg                   "Verified by Vouch" static badge
        og-template.png             OG image template
      package.json
      next.config.ts
      tailwind.config.ts
      tsconfig.json

  policies/
    builtin/
      _base.jac                     base types: Verdict, BlockReason, PolicyResult
      action_safety.jac             hard rules: ALWAYS_BLOCK, ALWAYS_CONFIRM lists
      scope_guard.jac               action matches declared intent scope
      rate_guard.jac                action frequency limits (stateful, Jac graph)
    examples/
      coding-agent.yaml             example for a code execution agent
      customer-support.yaml         example for a support bot
      data-pipeline.yaml            example for a data processing agent
      generic.yaml                  minimal starting point for any agent

  schema/
    policy.schema.json              JSON Schema for vouch.policy.yaml
    vouch.config.schema.json        JSON Schema for vouch.config.yaml

  docs/
    how-it-works.md
    writing-policies.md
    yaml-reference.md
    jac-policies.md
    integrations/
      langchain.md
      vercel-ai-sdk.md
      openai-tools.md
      fastapi.md

  .mcp.json
  .gitignore
  package.json                      monorepo root (workspaces)
  pnpm-workspace.yaml
  README.md
  LICENSE                           MIT
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

Create root `package.json`:
```json
{
  "name": "vouch",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "dev": "pnpm --filter web dev",
    "check-policies": "node packages/cli/dist/index.js check"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## PHASE 2: SHARED TYPES

Build `packages/core/src/types.ts` first. Every other file imports from here.
Make this complete, strict, and well-documented.

```typescript
// ─── Verdict ────────────────────────────────────────────────────────────────

/** The outcome of evaluating an agent action against all policies. */
export type Verdict = 'PASS' | 'BLOCK' | 'CONFIRM';

/** Reason categories for BLOCK verdicts. Human-readable by design. */
export type BlockReason =
  | 'DESTRUCTIVE_ACTION'      // would permanently delete or remove data
  | 'AUTO_SEND'               // would send a message without user review
  | 'EXTERNAL_WRITE'          // writes to external accounts/systems
  | 'SCOPE_VIOLATION'         // action outside the declared agent scope
  | 'LOW_CONFIDENCE'          // context confidence below configured threshold
  | 'RATE_EXCEEDED'           // action frequency limit exceeded
  | 'UNKNOWN_ACTION'          // action type not recognized by any policy
  | 'CUSTOM';                 // developer-defined reason from custom policy

// ─── Policy types ────────────────────────────────────────────────────────────

/** Result returned by a single policy check. */
export interface PolicyResult {
  verdict: Verdict;
  blockReason: BlockReason | null;
  /** Human-readable message, safe to show to end users. */
  message: string;
  /** Which policy produced this result. */
  policyName: string;
  requiresConfirmation: boolean;
}

/** A single YAML policy rule. */
export interface PolicyRule {
  name: string;
  verdict: Verdict;
  message: string;
  blockReason?: BlockReason;
  trigger: {
    actionType?: string | string[];
    actionContains?: string | string[];
    actionStartsWith?: string | string[];
    contextKey?: string;
    contextValueIn?: unknown[];
    contextValueBelow?: number;
    contextValueAbove?: number;
    userApproved?: boolean;
  };
}

/** A complete vouch.policy.yaml file parsed into memory. */
export interface PolicyFile {
  agent: string;
  version: string;
  rules: PolicyRule[];
  /** Path to a .jac file for complex rules evaluated after YAML rules. */
  jacExtension?: string;
}

// ─── SDK input/output ────────────────────────────────────────────────────────

/**
 * What the developer passes to vouch.protect().
 * actionPayload is accepted but never stored or logged.
 */
export interface VouchInput {
  /** What the agent wants to do. Maps to policy rule triggers. */
  actionType: string;
  /** The data the action will operate on. Never stored by Vouch. */
  actionPayload?: Record<string, unknown>;
  /**
   * Arbitrary key-value context from the agent.
   * Use this to pass intent, confidence, source, etc.
   * Example: { intent: 'SAVE_LINK', confidence: 0.91, source: 'ios_share' }
   */
  context?: Record<string, unknown>;
  /** True if the user has already explicitly confirmed this action. */
  userApproved?: boolean;
}

/** What gets stored in Supabase. Intentionally minimal. No user content. */
export interface ActionLogEntry {
  id: string;
  projectSlug: string;
  actionType: string;
  verdict: Verdict;
  userDecision: 'CONFIRMED' | 'CANCELLED' | null;
  policyTriggered: string;
  blockReason: BlockReason | null;
  durationMs: number;
  timestamp: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface VouchConfig {
  projectSlug: string;
  apiEndpoint: string;
  apiKey: string;
  /**
   * observe: records verdicts but never blocks execution. Use during beta.
   * enforce: fully enforces BLOCK and CONFIRM verdicts.
   */
  mode: 'observe' | 'enforce';
  /** Path to vouch.policy.yaml or a directory of policy files. */
  policyPath: string;
  thresholds?: {
    /** Actions with context.confidence below this are BLOCK. Default: 0.50 */
    confidenceBlock?: number;
    /** Actions with context.confidence below this are CONFIRM. Default: 0.72 */
    confidenceConfirm?: number;
  };
  timeouts?: {
    /** Max ms for Jac policy subprocess. Default: 200 */
    policyEvalMs?: number;
    /** Undo window in ms after action executes. Default: 5000 */
    undoWindowMs?: number;
  };
}

// ─── SDK hooks ───────────────────────────────────────────────────────────────

/**
 * Callbacks the developer implements to connect Vouch to their UI.
 * All hooks are optional in observe mode (verdicts are logged but not surfaced).
 */
export interface VouchHooks<TResult = unknown> {
  /**
   * Called when verdict is CONFIRM and mode is enforce.
   * Show the user a confirmation dialog, then call confirm() or cancel().
   */
  onConfirmRequired?: (
    message: string,
    confirm: () => Promise<TResult | null>,
    cancel: () => void
  ) => void;

  /**
   * Called when verdict is BLOCK and mode is enforce.
   * Show the user why the action was stopped.
   */
  onBlocked?: (message: string, reason: BlockReason | null) => void;

  /**
   * Called after any action executes, if undoFn was provided.
   * Show the user an undo toast. They have undoWindowMs to cancel.
   */
  onUndoAvailable?: (
    message: string,
    undo: () => Promise<void>,
    msRemaining: number
  ) => void;

  /** Called after every policy evaluation. Useful for telemetry. */
  onPolicyEvalComplete?: (result: PolicyResult, durationMs: number) => void;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class VouchBlockedError extends Error {
  public readonly policyName: string;
  public readonly blockReason: BlockReason | null;

  constructor(policyName: string, blockReason: BlockReason | null, message: string) {
    super(`[vouch] Policy '${policyName}' blocked this action: ${message}`);
    this.name = 'VouchBlockedError';
    this.policyName = policyName;
    this.blockReason = blockReason;
  }
}

export class VouchConfigError extends Error {
  constructor(message: string) {
    super(`[vouch] Config error: ${message}`);
    this.name = 'VouchConfigError';
  }
}
```

Build `packages/core/src/constants.ts`:
```typescript
export const VOUCH_VERSION = '0.1.0';
export const DEFAULT_CONFIDENCE_BLOCK = 0.50;
export const DEFAULT_CONFIDENCE_CONFIRM = 0.72;
export const DEFAULT_POLICY_EVAL_TIMEOUT_MS = 200;
export const DEFAULT_UNDO_WINDOW_MS = 5000;
export const INGEST_PATH = '/api/ingest';
export const PROJECT_STATS_PATH = '/api/project';
export const MAX_PAYLOAD_BYTES = 65536;   // 64KB ingest limit
export const RATE_LIMIT_PER_MINUTE = 300; // per API key
```

---

## PHASE 3: JAC POLICY WALKERS

Use the Jac MCP throughout this phase:
- Before writing each file: use `search_docs` with query "walker node report"
- After writing each file: use `validate_jac` to check it
- On any error: use `explain_error` with the error message
- Do not save any .jac file that has not passed `validate_jac`

### `policies/builtin/_base.jac`

```jac
"""
Vouch base types. Imported by all policy walkers.
DO NOT add `by llm()` to this file or any file that imports it.
All walkers are deterministic.
"""

import from jaclang.plugin.feature { * }

enum Verdict {
    PASS,
    BLOCK,
    CONFIRM
}

enum BlockReason {
    DESTRUCTIVE_ACTION,
    AUTO_SEND,
    EXTERNAL_WRITE,
    SCOPE_VIOLATION,
    LOW_CONFIDENCE,
    RATE_EXCEEDED,
    UNKNOWN_ACTION,
    CUSTOM
}

obj PolicyResult {
    has verdict: Verdict;
    has block_reason: BlockReason | None = None;
    has message: str = "";
    has policy_name: str = "";
    has requires_confirmation: bool = False;
}

# Helper: build a PASS result
def pass_result(policy_name: str) -> PolicyResult {
    return PolicyResult(
        verdict=Verdict.PASS,
        policy_name=policy_name
    );
}

# Helper: build a BLOCK result
def block_result(
    policy_name: str,
    reason: BlockReason,
    message: str
) -> PolicyResult {
    return PolicyResult(
        verdict=Verdict.BLOCK,
        block_reason=reason,
        message=message,
        policy_name=policy_name,
        requires_confirmation=False
    );
}

# Helper: build a CONFIRM result
def confirm_result(
    policy_name: str,
    message: str
) -> PolicyResult {
    return PolicyResult(
        verdict=Verdict.CONFIRM,
        policy_name=policy_name,
        message=message,
        requires_confirmation=True
    );
}
```

Validate: `jac check policies/builtin/_base.jac`
Must pass before continuing.

---

### `policies/builtin/action_safety.jac`

Hard rules. These apply to every agent regardless of domain.
ALWAYS_BLOCK actions never execute under any circumstance.
ALWAYS_CONFIRM actions require user confirmation unless user_approved=true.

```jac
"""
Vouch built-in: Action Safety
Hard-coded safety rules that apply universally.
These cannot be disabled or overridden by developer config.

A developer can ADD rules via their policy file.
They cannot REMOVE these built-in rules.
"""

import from vouch.policies.builtin._base { * }

# Actions that are ALWAYS blocked.
# The agent must never auto-execute any of these.
# Extend this list by adding to ALWAYS_BLOCK in your policy file.
glob ALWAYS_BLOCK_PREFIXES: list[str] = [
    # File system destruction
    "delete_file",       "remove_file",       "unlink_file",
    "bulk_delete",       "purge_files",       "wipe_directory",
    # Database destruction
    "drop_table",        "truncate_table",    "delete_database",
    "purge_records",     "bulk_delete_rows",
    # Account/access destruction
    "deactivate_account", "delete_account",   "revoke_access",
    "remove_user",       "ban_user",
    # Financial
    "make_payment",      "transfer_funds",    "charge_card",
    "process_refund",    "cancel_subscription"
];

# Actions that ALWAYS require user confirmation.
# Pass user_approved=true to bypass (only after user has seen and confirmed).
glob ALWAYS_CONFIRM_PREFIXES: list[str] = [
    # Communication: messages the user hasn't reviewed
    "send_email",        "send_message",      "send_sms",
    "send_notification", "reply_to_email",
    # Publishing
    "post_tweet",        "publish_post",      "post_to_linkedin",
    "publish_article",   "submit_form",
    # Scheduling
    "create_calendar_event", "book_meeting",  "schedule_appointment",
    # Sharing and permissions
    "share_document",    "invite_user",       "grant_access",
    "make_public",       "change_permissions",
    # Data export
    "export_data",       "download_all",      "send_report"
];

walker CheckActionSafety {
    has action_type: str;
    has user_approved: bool = False;

    can check with entry {
        action_lower = self.action_type.lower().strip();

        # Check ALWAYS_BLOCK -- no override, no user_approved bypass
        for prefix in ALWAYS_BLOCK_PREFIXES {
            if action_lower.startswith(prefix) {
                report block_result(
                    "action_safety",
                    BlockReason.DESTRUCTIVE_ACTION,
                    f"'{self.action_type}' is a destructive action and cannot be executed automatically."
                );
                disengage;
            }
        }

        # Check ALWAYS_CONFIRM -- bypass only if user_approved=True
        for prefix in ALWAYS_CONFIRM_PREFIXES {
            if action_lower.startswith(prefix) {
                if not self.user_approved {
                    report confirm_result(
                        "action_safety",
                        f"Review before sending: '{self.action_type}' will go to an external recipient."
                    );
                    disengage;
                }
            }
        }

        report pass_result("action_safety");
    }
}
```

Validate: `jac check policies/builtin/action_safety.jac`

---

### `policies/builtin/scope_guard.jac`

Checks that the proposed action is within the agent's declared scope.
Scope is passed as a list of allowed action prefixes from the policy file.
If no scope is declared, this walker always passes (opt-in behavior).

```jac
"""
Vouch built-in: Scope Guard
Checks whether the proposed action falls within the developer's declared
agent scope. Scope is opt-in: if no allowed_actions are declared in the
policy file, this walker passes everything.
"""

import from vouch.policies.builtin._base { * }

walker CheckScope {
    has action_type: str;
    has allowed_actions: list[str] = [];   # from developer's policy file
    has intent_context: str = "";

    can check with entry {
        # If developer declared no scope, pass everything
        if not self.allowed_actions {
            report pass_result("scope_guard");
            disengage;
        }

        action_lower = self.action_type.lower().strip();

        # Check if action is within any allowed prefix
        for allowed in self.allowed_actions {
            if action_lower.startswith(allowed.lower()) {
                report pass_result("scope_guard");
                disengage;
            }
        }

        # Action is outside declared scope -- ask user
        context_hint = f" (intent: {self.intent_context})" if self.intent_context else "";
        report confirm_result(
            "scope_guard",
            f"'{self.action_type}' is outside this agent's normal scope{context_hint}. Proceed?"
        );
    }
}
```

Validate: `jac check policies/builtin/scope_guard.jac`

---

### `policies/builtin/rate_guard.jac`

Stateful rate limiting using Jac's graph model.
This is the example of why Jac is right for complex policies:
stateful checks require graph traversal, which is Jac's native model.

```jac
"""
Vouch built-in: Rate Guard
Limits how often specific action types can occur within a time window.
Uses Jac graph nodes to maintain per-action-type counters.
This is stateful -- it requires Jac's graph model to implement cleanly.
"""

import from vouch.policies.builtin._base { * }

node ActionCounter {
    has action_type: str;
    has count: int = 0;
    has window_start_epoch: int = 0;
    has limit: int = 10;
    has window_seconds: int = 60;
}

walker CheckRateLimit {
    has action_type: str;
    has limit: int = 10;          # max actions per window
    has window_seconds: int = 60; # window size in seconds
    has current_epoch: int = 0;   # passed from TypeScript as Unix timestamp

    can check with entry {
        # Find or create counter node for this action type
        counters = [root-->][?:ActionCounter];
        matching = [c for c in counters if c.action_type == self.action_type];

        if not matching {
            counter = ActionCounter(
                action_type=self.action_type,
                count=1,
                window_start_epoch=self.current_epoch,
                limit=self.limit,
                window_seconds=self.window_seconds
            );
            root ++> counter;
            report pass_result("rate_guard");
            disengage;
        }

        counter = matching[0];

        # Reset window if expired
        window_age = self.current_epoch - counter.window_start_epoch;
        if window_age > counter.window_seconds {
            counter.count = 1;
            counter.window_start_epoch = self.current_epoch;
            report pass_result("rate_guard");
            disengage;
        }

        # Check limit
        if counter.count >= counter.limit {
            report block_result(
                "rate_guard",
                BlockReason.RATE_EXCEEDED,
                f"'{self.action_type}' has been called {counter.count} times "
                f"in the last {counter.window_seconds} seconds. Limit: {counter.limit}."
            );
            disengage;
        }

        counter.count += 1;
        report pass_result("rate_guard");
    }
}
```

Validate: `jac check policies/builtin/rate_guard.jac`

After all four walkers validate:
```bash
echo "All Jac policy walkers validated." && \
npx ruflo@latest mcp execute memory_usage \
  --action store \
  --key "vouch/walkers-validated" \
  --value "4 walkers pass jac check: _base, action_safety, scope_guard, rate_guard"
```

---

## PHASE 4: EXAMPLE POLICY FILES

These YAML files are what developers actually write. They are the product's
primary interface. Make them excellent: clear, commented, immediately useful.

### `policies/examples/generic.yaml`

```yaml
# vouch.policy.yaml
# Minimal Vouch policy for any AI agent.
# Copy this file to your project root and customize it.

agent: my-agent
version: "1.0"

# Rules are evaluated top to bottom. First match wins.
# Built-in rules (action_safety, rate_guard) always run AFTER these.
rules:
  # Example: block actions on production systems
  - name: no_production_writes
    verdict: BLOCK
    message: "Writing to production requires a deployment process, not an agent."
    trigger:
      actionContains: ["prod", "production", "live"]

  # Example: confirm before external API calls
  - name: confirm_external_calls
    verdict: CONFIRM
    message: "This action calls an external service. Proceed?"
    trigger:
      actionStartsWith: ["http_request", "webhook_call", "api_call"]

  # Example: block if agent confidence is too low
  - name: low_confidence_block
    verdict: BLOCK
    blockReason: LOW_CONFIDENCE
    message: "Not confident enough to act. Please clarify your intent."
    trigger:
      contextKey: "confidence"
      contextValueBelow: 0.50

  # Example: confirm if confidence is moderate
  - name: moderate_confidence_confirm
    verdict: CONFIRM
    message: "Confirm this action before proceeding."
    trigger:
      contextKey: "confidence"
      contextValueBelow: 0.72

# Optional: path to a .jac file for complex stateful rules
# jacExtension: ./policies/custom.jac
```

### `policies/examples/coding-agent.yaml`

```yaml
agent: coding-agent
version: "1.0"

rules:
  - name: no_system_files
    verdict: BLOCK
    message: "Modifying system files is not permitted."
    trigger:
      actionContains: ["/etc/", "/usr/", "/bin/", "/sys/", "~/.ssh"]

  - name: confirm_test_suite
    verdict: CONFIRM
    message: "About to run the full test suite. This may take a while."
    trigger:
      actionType: ["run_tests", "run_all_tests", "test_suite"]

  - name: confirm_dependency_install
    verdict: CONFIRM
    message: "Installing new dependencies will modify package.json and lock files."
    trigger:
      actionStartsWith: ["npm_install", "pip_install", "yarn_add"]

  - name: block_force_push
    verdict: BLOCK
    message: "Force push is not allowed. Use a standard push or PR."
    trigger:
      actionType: ["git_force_push", "git_push_force"]
```

### `policies/examples/customer-support.yaml`

```yaml
agent: customer-support-bot
version: "1.0"

rules:
  - name: no_refunds_over_threshold
    verdict: CONFIRM
    message: "Refunds over $100 require human review."
    trigger:
      actionType: "process_refund"
      contextKey: "amount"
      contextValueAbove: 100

  - name: escalate_angry_users
    verdict: CONFIRM
    message: "This customer has escalated sentiment. A human should review before responding."
    trigger:
      contextKey: "sentiment"
      contextValueIn: ["angry", "frustrated", "threatening"]

  - name: block_account_changes
    verdict: BLOCK
    message: "Account modifications require identity verification."
    trigger:
      actionStartsWith: ["modify_account", "change_email", "change_password", "update_billing"]
```

---

## PHASE 5: YAML POLICY EVALUATOR

Build `packages/core/src/yaml-evaluator.ts`.

This is the heart of YAML policy evaluation. It reads a PolicyFile and
evaluates a VouchInput against every rule. Pure TypeScript. No dependencies.

```typescript
import type { PolicyFile, PolicyResult, PolicyRule, VouchInput, Verdict } from './types.js';

/**
 * Evaluates a VouchInput against a PolicyFile.
 * Returns the first matching rule's verdict, or PASS if no rule matches.
 * Rules are evaluated in order. First match wins.
 */
export function evaluateYamlPolicies(
  input: VouchInput,
  policyFile: PolicyFile
): PolicyResult {
  for (const rule of policyFile.rules) {
    if (ruleMatches(rule, input)) {
      return {
        verdict: rule.verdict,
        blockReason: rule.blockReason ?? null,
        message: rule.message,
        policyName: rule.name,
        requiresConfirmation: rule.verdict === 'CONFIRM',
      };
    }
  }

  return {
    verdict: 'PASS',
    blockReason: null,
    message: '',
    policyName: '__no_match__',
    requiresConfirmation: false,
  };
}

function ruleMatches(rule: PolicyRule, input: VouchInput): boolean {
  const t = rule.trigger;
  const actionLower = input.actionType.toLowerCase();

  // actionType: exact match (string or array)
  if (t.actionType !== undefined) {
    const types = Array.isArray(t.actionType) ? t.actionType : [t.actionType];
    if (!types.some((a) => actionLower === a.toLowerCase())) return false;
  }

  // actionContains: substring match
  if (t.actionContains !== undefined) {
    const needles = Array.isArray(t.actionContains) ? t.actionContains : [t.actionContains];
    if (!needles.some((n) => actionLower.includes(n.toLowerCase()))) return false;
  }

  // actionStartsWith: prefix match
  if (t.actionStartsWith !== undefined) {
    const prefixes = Array.isArray(t.actionStartsWith) ? t.actionStartsWith : [t.actionStartsWith];
    if (!prefixes.some((p) => actionLower.startsWith(p.toLowerCase()))) return false;
  }

  // contextKey + contextValue* checks
  if (t.contextKey !== undefined) {
    const ctxValue = input.context?.[t.contextKey];
    if (ctxValue === undefined) return false;

    if (t.contextValueIn !== undefined) {
      if (!t.contextValueIn.includes(ctxValue)) return false;
    }
    if (t.contextValueBelow !== undefined) {
      if (typeof ctxValue !== 'number' || ctxValue >= t.contextValueBelow) return false;
    }
    if (t.contextValueAbove !== undefined) {
      if (typeof ctxValue !== 'number' || ctxValue <= t.contextValueAbove) return false;
    }
  }

  // userApproved check
  if (t.userApproved !== undefined) {
    if ((input.userApproved ?? false) !== t.userApproved) return false;
  }

  return true;
}

/**
 * Loads and parses a vouch.policy.yaml file.
 * Throws VouchConfigError if the file is missing or malformed.
 */
export async function loadPolicyFile(policyPath: string): Promise<PolicyFile> {
  const { readFile } = await import('fs/promises');
  const { parse } = await import('yaml');

  const raw = await readFile(policyPath, 'utf-8');
  const parsed = parse(raw) as PolicyFile;

  if (!parsed.agent || !Array.isArray(parsed.rules)) {
    throw new Error(
      `Invalid policy file at ${policyPath}. Must have 'agent' and 'rules' fields.`
    );
  }

  return parsed;
}
```

---

## PHASE 6: SUBPROCESS RUNNER

Build `packages/core/src/subprocess.ts`.

This runs Jac policy walkers as subprocesses. It is the bridge between
TypeScript and the Jac runtime. Must be fast, safe, and never crash.

```typescript
import { spawn } from 'child_process';
import { debug } from './logger.js';
import type { PolicyResult } from './types.js';

/**
 * Runs a Jac walker as a subprocess and returns its PolicyResult.
 *
 * The Jac walker must:
 *   1. Accept walker args as a JSON object on stdin
 *   2. Write a PolicyResult JSON object to stdout
 *   3. Complete within timeoutMs
 *
 * If the subprocess times out, errors, or returns invalid JSON:
 *   Returns CONFIRM verdict (safe default -- never silently execute).
 *
 * This function NEVER throws. All errors become CONFIRM verdicts.
 */
export async function runJacWalker(
  jacFilePath: string,
  walkerName: string,
  args: Record<string, unknown>,
  timeoutMs: number
): Promise<PolicyResult> {
  return new Promise((resolve) => {
    const safeDefault: PolicyResult = {
      verdict: 'CONFIRM',
      blockReason: null,
      message: 'Policy check could not complete. Confirm to proceed.',
      policyName: `${walkerName}:error`,
      requiresConfirmation: true,
    };

    let timedOut = false;
    let stdout = '';
    let stderr = '';

    const proc = spawn('jac', ['run', jacFilePath, '--entrypoint', walkerName], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      debug(`Jac walker ${walkerName} timed out after ${timeoutMs}ms`);
      resolve(safeDefault);
    }, timeoutMs);

    proc.stdin.write(JSON.stringify(args));
    proc.stdin.end();

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) return;

      if (stderr) {
        debug(`Jac walker ${walkerName} stderr:`, stderr);
      }

      if (code !== 0) {
        debug(`Jac walker ${walkerName} exited with code ${code}`);
        resolve(safeDefault);
        return;
      }

      try {
        const result = JSON.parse(stdout.trim()) as PolicyResult;
        resolve(result);
      } catch {
        debug(`Jac walker ${walkerName} returned invalid JSON:`, stdout);
        resolve(safeDefault);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (!timedOut) {
        debug(`Jac walker ${walkerName} process error:`, err.message);
        resolve(safeDefault);
      }
    });
  });
}
```

Build `packages/core/src/logger.ts`:
```typescript
const enabled = process.env.VOUCH_DEBUG === 'true';

export function debug(message: string, data?: unknown): void {
  if (!enabled) return;
  const prefix = `[vouch ${new Date().toISOString()}]`;
  if (data !== undefined) {
    process.stderr.write(`${prefix} ${message} ${JSON.stringify(data)}\n`);
  } else {
    process.stderr.write(`${prefix} ${message}\n`);
  }
}
```

---

## PHASE 7: POLICY ENGINE

Build `packages/core/src/engine.ts`.

The engine runs all policies in the correct order:
1. YAML rules from the developer's policy file (developer-defined)
2. Built-in Jac walker: action_safety (universal hard rules)
3. Built-in Jac walker: scope_guard (if scope declared in policy)
4. Built-in Jac walker: rate_guard (if rate limits declared in policy)

First non-PASS result wins. Walker order is fixed and cannot be changed.

```typescript
import path from 'path';
import { fileURLToPath } from 'url';
import type { PolicyResult, VouchInput, VouchConfig } from './types.js';
import { evaluateYamlPolicies, loadPolicyFile } from './yaml-evaluator.js';
import { runJacWalker } from './subprocess.js';
import {
  DEFAULT_POLICY_EVAL_TIMEOUT_MS,
  DEFAULT_CONFIDENCE_BLOCK,
  DEFAULT_CONFIDENCE_CONFIRM,
} from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_POLICY_DIR = path.resolve(__dirname, '../../../policies/builtin');

export interface EvalResult {
  result: PolicyResult;
  durationMs: number;
}

export async function evaluatePolicies(
  input: VouchInput,
  config: VouchConfig
): Promise<EvalResult> {
  const start = Date.now();
  const timeout = config.timeouts?.policyEvalMs ?? DEFAULT_POLICY_EVAL_TIMEOUT_MS;

  // Load the developer's policy file
  const policyFile = await loadPolicyFile(config.policyPath);

  // Step 1: Evaluate YAML rules (developer-defined, fast, synchronous)
  const yamlResult = evaluateYamlPolicies(input, policyFile);
  if (yamlResult.verdict !== 'PASS') {
    return { result: yamlResult, durationMs: Date.now() - start };
  }

  // Step 2: Built-in action safety walker (hard rules, always runs)
  const safetyResult = await runJacWalker(
    path.join(BUILTIN_POLICY_DIR, 'action_safety.jac'),
    'CheckActionSafety',
    {
      action_type: input.actionType,
      user_approved: input.userApproved ?? false,
    },
    timeout
  );
  if (safetyResult.verdict !== 'PASS') {
    return { result: safetyResult, durationMs: Date.now() - start };
  }

  // Step 3: Scope guard (only if policy declares allowed_actions)
  if (policyFile.allowedActions && policyFile.allowedActions.length > 0) {
    const scopeResult = await runJacWalker(
      path.join(BUILTIN_POLICY_DIR, 'scope_guard.jac'),
      'CheckScope',
      {
        action_type: input.actionType,
        allowed_actions: policyFile.allowedActions,
        intent_context: String(input.context?.intent ?? ''),
      },
      timeout
    );
    if (scopeResult.verdict !== 'PASS') {
      return { result: scopeResult, durationMs: Date.now() - start };
    }
  }

  // Step 4: Rate guard (only if policy declares rate limits)
  if (policyFile.rateLimits) {
    const limit = policyFile.rateLimits[input.actionType] ?? policyFile.rateLimits['*'];
    if (limit) {
      const rateResult = await runJacWalker(
        path.join(BUILTIN_POLICY_DIR, 'rate_guard.jac'),
        'CheckRateLimit',
        {
          action_type: input.actionType,
          limit: limit.count,
          window_seconds: limit.windowSeconds,
          current_epoch: Math.floor(Date.now() / 1000),
        },
        timeout
      );
      if (rateResult.verdict !== 'PASS') {
        return { result: rateResult, durationMs: Date.now() - start };
      }
    }
  }

  // Step 5: Custom Jac extension (if declared in policy file)
  if (policyFile.jacExtension) {
    const customResult = await runJacWalker(
      policyFile.jacExtension,
      'CheckCustom',
      { action_type: input.actionType, context: input.context ?? {} },
      timeout
    );
    if (customResult.verdict !== 'PASS') {
      return { result: customResult, durationMs: Date.now() - start };
    }
  }

  return {
    result: {
      verdict: 'PASS',
      blockReason: null,
      message: '',
      policyName: '__pass__',
      requiresConfirmation: false,
    },
    durationMs: Date.now() - start,
  };
}
```

---

## PHASE 8: SDK (TypeScript + Python, Ruflo parallel)

Spawn a Ruflo swarm for both SDKs simultaneously:
```bash
npx ruflo@latest hive init --topology mesh --agents 2
```

### Worker 1: TypeScript SDK

Build `packages/sdk-ts/src/client.ts`. This is the entire public API.
Keep it simple. Developers should be able to read the whole thing.

```typescript
import { evaluatePolicies } from '../../core/src/engine.js';
import { buildLogEntry, sendLogEntry } from '../../core/src/log.js';
import { VouchBlockedError, VouchConfigError } from '../../core/src/types.js';
import { DEFAULT_UNDO_WINDOW_MS } from '../../core/src/constants.js';
import type {
  VouchConfig, VouchInput, VouchHooks, PolicyResult
} from '../../core/src/types.js';

export class VouchClient {
  private readonly config: VouchConfig;

  constructor(config: VouchConfig) {
    if (!config.projectSlug) throw new VouchConfigError('projectSlug is required');
    if (!config.policyPath) throw new VouchConfigError('policyPath is required');
    this.config = config;
  }

  /**
   * Wrap any agent action with Vouch policy enforcement.
   *
   * @example
   * // In any agent framework:
   * const result = await vouch.protect(
   *   {
   *     actionType: 'send_email',
   *     actionPayload: { to, subject, body },  // never stored
   *     context: { intent: 'DRAFT_REPLY', confidence: 0.88 },
   *   },
   *   () => emailClient.send(to, subject, body),
   *   () => emailClient.cancelLastSend(),  // optional undo
   *   {
   *     onConfirmRequired: (msg, confirm, cancel) => ui.showSheet(msg, confirm, cancel),
   *     onBlocked: (msg, reason) => ui.showError(msg),
   *     onUndoAvailable: (msg, undo, ms) => ui.showUndoToast(msg, undo, ms),
   *   }
   * );
   */
  async protect<TResult = unknown>(
    input: VouchInput,
    executeFn: () => Promise<TResult>,
    undoFn: (() => Promise<void>) | undefined,
    hooks: VouchHooks<TResult> = {}
  ): Promise<TResult | null> {
    const { result, durationMs } = await evaluatePolicies(input, this.config);

    hooks.onPolicyEvalComplete?.(result, durationMs);

    if (result.verdict === 'BLOCK') {
      sendLogEntry(
        buildLogEntry(input, result, 'BLOCK', null, this.config.projectSlug, durationMs),
        this.config
      );

      if (this.config.mode === 'enforce') {
        hooks.onBlocked?.(result.message, result.blockReason);
        throw new VouchBlockedError(result.policyName, result.blockReason, result.message);
      }

      // Observe mode: log but execute anyway
      return executeFn();
    }

    if (result.verdict === 'CONFIRM') {
      if (this.config.mode === 'enforce' && hooks.onConfirmRequired) {
        return new Promise<TResult | null>((resolve, reject) => {
          hooks.onConfirmRequired!(
            result.message,
            async () => {
              sendLogEntry(
                buildLogEntry(input, result, 'CONFIRM', 'CONFIRMED', this.config.projectSlug, durationMs),
                this.config
              );
              try {
                const actionResult = await this.executeWithUndo(executeFn, undoFn, hooks);
                resolve(actionResult);
              } catch (e) {
                reject(e);
              }
            },
            () => {
              sendLogEntry(
                buildLogEntry(input, result, 'CONFIRM', 'CANCELLED', this.config.projectSlug, durationMs),
                this.config
              );
              resolve(null);
            }
          );
        });
      }

      // Observe mode or no confirm hook: log and execute
      sendLogEntry(
        buildLogEntry(input, result, 'CONFIRM', 'CONFIRMED', this.config.projectSlug, durationMs),
        this.config
      );
      return this.executeWithUndo(executeFn, undoFn, hooks);
    }

    // PASS
    sendLogEntry(
      buildLogEntry(input, result, 'PASS', null, this.config.projectSlug, durationMs),
      this.config
    );
    return this.executeWithUndo(executeFn, undoFn, hooks);
  }

  private async executeWithUndo<TResult>(
    executeFn: () => Promise<TResult>,
    undoFn: (() => Promise<void>) | undefined,
    hooks: VouchHooks<TResult>
  ): Promise<TResult> {
    const result = await executeFn();

    if (undoFn && hooks.onUndoAvailable) {
      const windowMs = this.config.timeouts?.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;
      const steps = [1.0, 0.6, 0.2].map((f) => Math.floor(windowMs * f));
      let cancelled = false;

      for (const msRemaining of steps) {
        await new Promise<void>((res) => setTimeout(res, windowMs - msRemaining));
        if (!cancelled) {
          hooks.onUndoAvailable('Action complete.', async () => {
            cancelled = true;
            await undoFn();
          }, msRemaining);
        }
      }
    }

    return result;
  }
}

export function createVouch(config: VouchConfig): VouchClient {
  return new VouchClient(config);
}
```

`packages/sdk-ts/src/index.ts`:
```typescript
export { createVouch, VouchClient } from './client.js';
export {
  VouchBlockedError,
  VouchConfigError,
  type VouchConfig,
  type VouchInput,
  type VouchHooks,
  type PolicyResult,
  type ActionLogEntry,
  type Verdict,
  type BlockReason,
} from '../../core/src/types.js';
```

`packages/sdk-ts/package.json`:
```json
{
  "name": "vouch-sdk",
  "version": "0.1.0",
  "description": "Runtime behavioral safety for AI agents",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "keywords": ["ai", "agents", "safety", "policies", "llm", "jac", "runtime"],
  "license": "MIT"
}
```

---

### Worker 2: Python SDK

Build the complete Python SDK. No external dependencies required beyond stdlib.
Optional: `requests` for the log sender (falls back to urllib if missing).

`packages/sdk-python/vouch/types.py`:
Define Python dataclasses mirroring the TypeScript types exactly:
- `Verdict` (Literal['PASS', 'BLOCK', 'CONFIRM'])
- `BlockReason` (Literal type with all reasons)
- `PolicyResult` (dataclass)
- `VouchInput` (dataclass)
- `ActionLogEntry` (dataclass)
- `VouchConfig` (dataclass)
- `VouchBlockedError` (Exception subclass)
- `VouchConfigError` (Exception subclass)

`packages/sdk-python/vouch/engine.py`:
Python implementation of policy evaluation.
- `load_policy_file(path: str) -> dict`: reads YAML (uses pyyaml if available,
  falls back to json for .json files, raises clear error if neither available)
- `evaluate_yaml_policies(input: VouchInput, policy: dict) -> PolicyResult`:
  mirrors the TypeScript yaml-evaluator logic exactly
- `run_jac_walker(jac_file: str, walker: str, args: dict, timeout_ms: int) -> PolicyResult`:
  mirrors the TypeScript subprocess runner exactly, same safe-default behavior
- `evaluate_policies(input: VouchInput, config: VouchConfig) -> tuple[PolicyResult, int]`:
  same walker sequence as TypeScript engine

`packages/sdk-python/vouch/client.py`:
```python
from __future__ import annotations
import asyncio
from typing import TypeVar, Callable, Awaitable, Optional
from .types import VouchConfig, VouchInput, VouchHooks, PolicyResult, VouchBlockedError
from .engine import evaluate_policies
from .log import send_log_entry, build_log_entry

T = TypeVar('T')

class VouchClient:
    """
    Runtime behavioral safety for AI agents.

    Usage:
        vouch = VouchClient(VouchConfig(
            project_slug='my-agent',
            api_endpoint='https://vouch.run',
            api_key='vouch_...',
            mode='observe',
            policy_path='./vouch.policy.yaml',
        ))

        result = await vouch.protect(
            VouchInput(action_type='send_email', context={'confidence': 0.9}),
            lambda: send_email(to, subject, body),
            hooks=VouchHooks(on_blocked=lambda msg, r: print(f'Blocked: {msg}')),
        )
    """

    def __init__(self, config: VouchConfig) -> None:
        if not config.project_slug:
            raise VouchConfigError('project_slug is required')
        if not config.policy_path:
            raise VouchConfigError('policy_path is required')
        self.config = config

    async def protect(
        self,
        input: VouchInput,
        execute_fn: Callable[[], Awaitable[T]],
        undo_fn: Optional[Callable[[], Awaitable[None]]] = None,
        hooks: Optional[VouchHooks] = None,
    ) -> Optional[T]:
        hooks = hooks or VouchHooks()
        result, duration_ms = evaluate_policies(input, self.config)

        if hooks.on_policy_eval_complete:
            hooks.on_policy_eval_complete(result, duration_ms)

        if result.verdict == 'BLOCK':
            send_log_entry(
                build_log_entry(input, result, 'BLOCK', None, self.config.project_slug, duration_ms),
                self.config
            )
            if self.config.mode == 'enforce':
                if hooks.on_blocked:
                    hooks.on_blocked(result.message, result.block_reason)
                raise VouchBlockedError(result.policy_name, result.block_reason, result.message)
            return await execute_fn()

        if result.verdict == 'CONFIRM':
            send_log_entry(
                build_log_entry(input, result, 'CONFIRM', 'CONFIRMED', self.config.project_slug, duration_ms),
                self.config
            )
            if self.config.mode == 'enforce' and hooks.on_confirm_required:
                confirmed = asyncio.get_event_loop().create_future()
                def do_confirm():
                    confirmed.set_result(True)
                def do_cancel():
                    confirmed.set_result(False)
                hooks.on_confirm_required(result.message, do_confirm, do_cancel)
                if not await confirmed:
                    return None

        send_log_entry(
            build_log_entry(input, result, 'PASS', None, self.config.project_slug, duration_ms),
            self.config
        )
        return await execute_fn()


def create_vouch(config: VouchConfig) -> VouchClient:
    return VouchClient(config)
```

`packages/sdk-python/vouch/log.py`:
Fire-and-forget HTTP POST to ingest endpoint.
Uses `requests` if available, falls back to `urllib.request`.
Never raises. Catches all exceptions and calls debug().

`packages/sdk-python/vouch/__init__.py`:
```python
from .client import VouchClient, create_vouch
from .types import (
    VouchConfig, VouchInput, VouchHooks, PolicyResult,
    ActionLogEntry, VouchBlockedError, VouchConfigError,
)
__version__ = '0.1.0'
__all__ = [
    'VouchClient', 'create_vouch',
    'VouchConfig', 'VouchInput', 'VouchHooks', 'PolicyResult',
    'ActionLogEntry', 'VouchBlockedError', 'VouchConfigError',
]
```

`packages/sdk-python/pyproject.toml`:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "vouch-sdk"
version = "0.1.0"
description = "Runtime behavioral safety for AI agents"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.11"
dependencies = []          # zero required dependencies
optional-dependencies = { http = ["requests>=2.28"] }
keywords = ["ai", "agents", "safety", "policies", "llm", "jac"]

[project.urls]
Homepage = "https://vouch.run"
Repository = "https://github.com/vouch-run/vouch"
```

After swarm completes:
```bash
cd packages/sdk-ts && npm install && npm run build
cd ../sdk-python && python -m pytest tests/ -v
```
Fix all errors before Phase 9.

---

## PHASE 9: SUPABASE SCHEMA + API

Build `apps/web/db/schema.sql`. Apply this to your Supabase project.

```sql
-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Projects ────────────────────────────────────────────────────────────────
create table vouch_projects (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique not null
                          check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  name        text        not null,
  created_at  timestamptz default now()
);

-- ─── Action logs ─────────────────────────────────────────────────────────────
-- IMPORTANT: No raw user content stored here. Only behavioral metadata.
create table vouch_action_logs (
  id                uuid        primary key,
  project_id        uuid        not null references vouch_projects(id) on delete cascade,
  action_type       text        not null,
  verdict           text        not null check (verdict in ('PASS','BLOCK','CONFIRM')),
  user_decision     text        check (user_decision in ('CONFIRMED','CANCELLED')),
  policy_triggered  text        not null,
  block_reason      text,
  duration_ms       integer     not null check (duration_ms >= 0),
  created_at        timestamptz default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_logs_project_time     on vouch_action_logs (project_id, created_at desc);
create index idx_logs_project_verdict  on vouch_action_logs (project_id, verdict);
create index idx_logs_project_policy   on vouch_action_logs (project_id, policy_triggered);
create index idx_logs_project_action   on vouch_action_logs (project_id, action_type);

-- ─── Dashboard views ─────────────────────────────────────────────────────────
create view vouch_project_stats as
select
  p.id                                                                           as project_id,
  p.slug,
  p.name,
  count(l.id)                                                                    as total_runs,
  count(l.id) filter (where l.verdict = 'PASS')                                 as pass_count,
  count(l.id) filter (where l.verdict = 'BLOCK')                                as block_count,
  count(l.id) filter (where l.verdict = 'CONFIRM')                              as confirm_count,
  count(l.id) filter (where l.verdict = 'CONFIRM' and l.user_decision = 'CONFIRMED') as confirmed_count,
  count(l.id) filter (where l.verdict = 'CONFIRM' and l.user_decision = 'CANCELLED') as cancelled_count,
  round(
    count(l.id) filter (where l.verdict = 'PASS')::numeric /
    nullif(count(l.id), 0) * 100, 1
  )                                                                              as pass_rate,
  max(l.created_at)                                                              as last_run_at
from vouch_projects p
left join vouch_action_logs l on l.project_id = p.id
group by p.id, p.slug, p.name;

create view vouch_policy_breakdown as
select
  project_id,
  policy_triggered,
  count(*)                                                                       as total_runs,
  count(*) filter (where verdict = 'PASS')                                      as pass_count,
  count(*) filter (where verdict = 'BLOCK')                                     as block_count,
  count(*) filter (where verdict = 'CONFIRM')                                   as confirm_count,
  round(
    count(*) filter (where verdict = 'PASS')::numeric / nullif(count(*), 0) * 100, 1
  )                                                                              as pass_rate
from vouch_action_logs
group by project_id, policy_triggered;

create view vouch_daily_pass_rate as
select
  project_id,
  date_trunc('day', created_at)                                                  as day,
  round(
    count(*) filter (where verdict = 'PASS')::numeric / nullif(count(*), 0) * 100, 1
  )                                                                              as pass_rate,
  count(*)                                                                       as total_runs
from vouch_action_logs
where created_at >= now() - interval '30 days'
group by project_id, date_trunc('day', created_at)
order by project_id, day;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table vouch_projects    enable row level security;
alter table vouch_action_logs enable row level security;

-- Public read (dashboard is public)
create policy "public read projects"
  on vouch_projects for select using (true);

create policy "public read logs"
  on vouch_action_logs for select using (true);

-- Write via service_role only (ingest API uses service key)
create policy "service insert logs"
  on vouch_action_logs for insert
  with check (auth.role() = 'service_role');

create policy "service insert projects"
  on vouch_projects for insert
  with check (auth.role() = 'service_role');
```

Build `apps/web/app/api/ingest/route.ts`:

Requirements:
- Reads `x-vouch-key` header
- Compares to `process.env.VOUCH_INGEST_KEY` using timingSafeEqual (crypto)
- Validates Content-Type is application/json
- Enforces 64KB body size limit
- Parses body with Zod (ActionLogEntrySchema)
- Upserts project by slug (creates if missing)
- Inserts into vouch_action_logs
- Rate limit: simple in-memory Map, 300 req/min per API key
- Returns `{ ok: true }` on success, `{ ok: false }` on all errors
- HTTP status is always 200 (callers must check ok field)
- Zero console.log statements

Build `apps/web/app/api/project/[slug]/route.ts`:

Returns this exact shape:
```typescript
{
  project: { slug: string; name: string };
  stats: VouchProjectStats;
  policyBreakdown: VouchPolicyBreakdown[];
  dailyPassRate: { day: string; passRate: number; totalRuns: number }[];
  recentActivity: RecentActivityEntry[];  // last 25 entries
}
```
Uses Supabase anon key (public read is fine).
Returns 404 JSON `{ error: 'not_found' }` for unknown slugs.
Add `export const revalidate = 30;` for ISR.

---

## PHASE 10: PUBLIC DASHBOARD

Spawn a fresh Ruflo swarm:
```bash
npx ruflo@latest hive init --topology mesh --agents 5
```

AESTHETIC DIRECTION: Trust certificate. Not startup product.
Think: a legal document that happens to be beautiful. Dark (#0D0D0D). Off-white
type (#EDEDEA). Numbers in JetBrains Mono (Google Fonts). Sparse. High contrast.
The pass rate number is the entire hero. Everything else is subordinate.
Green (#16A34A) for PASS. Amber (#D97706) for CONFIRM. Red (#DC2626) for BLOCK.
No gradients on backgrounds. No purple. No "AI startup" aesthetic whatsoever.
Grid lines like graph paper -- very faint (#1A1A1A) -- as background texture.

---

**Worker 1: `apps/web/components/PolicyScore.tsx`**

The hero. Takes up the center of the page.

Exactly as spec'd:
- Hand-written SVG circular arc (NO LIBRARY). Use path `d` attribute with
  A (arc) commands. The math:
  cx=150, cy=150, r=120. Arc from 135deg to (135 + passRate/100 * 270)deg.
  Stroke width 14px. Track stroke is #1A1A1A. Score stroke is green/amber/red.
  Stroke-linecap round on both ends.
- Inside the circle: passRate number in JetBrains Mono at 64px weight 700.
  "%" in 28px. Below the number: "pass rate" in 13px muted.
- Below the circle: three stat pills in a row.
  Each pill: number (JetBrains Mono, 20px) + label (13px muted).
  Colors: pass=green, confirm=amber, block=red.
- CSS @keyframes count-up for the number (no JS animation library).
  Use CSS custom property `--target` set inline. Animate from 0 to target.
- If passRate >= 98: add a subtle green pulse animation on the ring.

Props:
```typescript
interface PolicyScoreProps {
  passRate: number;
  passCount: number;
  confirmCount: number;
  blockCount: number;
  totalRuns: number;
}
```

---

**Worker 2: `apps/web/components/ActionFeed.tsx`**

The 25 most recent actions. Dense log view.

- Each row: [verdict icon] [action_type in mono] [policy_triggered] [duration]ms [time ago]
- Verdict icon: inline SVG. Green checkmark for PASS, amber question for CONFIRM,
  red X for BLOCK. No icon library.
- action_type text: truncated at 32 chars with ellipsis if longer
- policy_triggered: muted gray, small
- duration: right-aligned, mono, green if <50ms, amber if 50-200ms, red if >200ms
- "time ago": relative time (e.g. "2m ago") right-aligned, muted
- Rows are 36px tall. Compact.
- Empty state: centered "Waiting for first action..." with a subtle pulse on the dot
- On mount: rows fade in with staggered 30ms delay (CSS animation-delay)

Props:
```typescript
interface ActionFeedProps {
  activity: RecentActivityEntry[];
}
```

---

**Worker 3: `apps/web/components/PolicyBreakdown.tsx`**

Per-policy stats. One row per policy that has been triggered.

- Header row: Policy | Pass Rate | Runs | Blocked | Confirmed
- Each row: policy name (formatted: remove "vouch_" prefix, title-case, replace
  _ with space) | animated horizontal bar | total_runs | block_count | confirm_count
- Bar: fills left to right on mount (CSS animation), color follows pass rate
  (green/amber/red threshold same as PolicyScore)
- Bar width = passRate% of container. Bar height 4px. Track height 4px.
- Staggered row animation on mount: each row slides in from left 50ms apart
- Hover: row background lifts to #141414
- If empty: "No policies triggered yet" centered

Props:
```typescript
interface PolicyBreakdownProps {
  policies: PolicyBreakdownEntry[];
}
```

---

**Worker 4: `apps/web/components/TrendChart.tsx`**

30-day pass rate sparkline. Use recharts.

```typescript
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
```

- Single AreaChart with green area fill (very low opacity, 0.15) and green line
- No Y axis. No grid. No legend.
- X axis: show only first and last date. Format: "Mar 1" style. Muted color.
- Custom tooltip: shows date + pass rate on hover. Dark background, white text.
- Responsive container: 100% width, 120px height
- Smooth curve (type="monotone")

Props:
```typescript
interface TrendChartProps {
  data: { day: string; passRate: number; totalRuns: number }[];
}
```

---

**Worker 5: `apps/web/app/[slug]/page.tsx`**

The complete public trust page. This is what people share.

Full implementation:

```typescript
import { notFound } from 'next/navigation';
import { fetchProjectStats } from '../../lib/fetcher';
import { PolicyScore } from '../../components/PolicyScore';
import { ActionFeed } from '../../components/ActionFeed';
import { PolicyBreakdown } from '../../components/PolicyBreakdown';
import { TrendChart } from '../../components/TrendChart';

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await fetchProjectStats(params.slug);
  if (!data) return { title: 'Not found' };
  return {
    title: `${data.project.name} — Verified by Vouch`,
    description: `${data.stats.passRate}% of agent actions cleared policy verification. ${data.stats.totalRuns.toLocaleString()} actions verified.`,
    openGraph: {
      title: `${data.project.name} is verified by Vouch`,
      description: `${data.stats.passRate}% pass rate across ${data.stats.totalRuns.toLocaleString()} actions.`,
    },
  };
}

export default async function TrustPage({ params }: { params: { slug: string } }) {
  const data = await fetchProjectStats(params.slug);
  if (!data) notFound();

  return (
    <main style={{ background: '#0D0D0D', minHeight: '100vh', color: '#EDEDEA' }}>
      {/* Nav: wordmark left, badge right */}
      {/* Hero: project name + PolicyScore centered */}
      {/* Subtext: "Verified X agent actions" */}
      {/* TrendChart full width */}
      {/* Two-column: PolicyBreakdown left, ActionFeed right */}
      {/* Footer: "No user data stored. Policies are open source." */}
    </main>
  );
}
```

Fill in the actual JSX. The layout is:
- Full viewport dark background
- Top bar: "vouch" wordmark (monospace, small, links to /), and if passRate >= 95
  a "Verified" badge (green dot + text) top right
- 80px top padding before project name
- Project name: 32px, weight 500, letter-spacing -0.02em
- Below name: "is verified by Vouch" in muted gray, same line or below
- PolicyScore: centered, 80px top margin
- "Verified [X] agent actions" text: centered below score, muted
- TrendChart: 48px margin top, full width, max-width 800px centered
- Two columns below: PolicyBreakdown (60% width) + ActionFeed (40% width),
  40px gap, 48px top margin
- Footer: bottom of page, centered, 13px, very muted

Build `apps/web/app/[slug]/loading.tsx`:
Skeleton version of the page. Use CSS pulse animation (#1A1A1A background).
Show: circular skeleton where PolicyScore goes, bar skeletons for breakdown,
line skeletons for activity feed.

Build `apps/web/app/[slug]/not-found.tsx`:
Dark background. Large "404" in JetBrains Mono. Below: "This project isn't
on Vouch yet." Link to the root page.

After all workers: `cd apps/web && npm install && npm run build`
Fix all TypeScript and JSX errors before continuing.

---

## PHASE 11: CLI

Build the CLI as a standalone tool. Zero npm dependencies. Pure Node.js.

**`packages/cli/src/commands/init.ts`:**

Interactive setup. Uses `readline` from stdlib.

Flow:
1. Check if `vouch.policy.yaml` already exists. If yes, ask before overwriting.
2. Ask: Project name (default: current directory name)
3. Ask: Project slug (default: kebab-case of project name)
4. Ask: API endpoint (default: https://vouch.run)
5. Generate API key: `vouch_` + 32 random hex chars (crypto.randomBytes)
6. Write `vouch.policy.yaml` from the generic.yaml template
7. Write `.env.vouch` with VOUCH_API_ENDPOINT, VOUCH_API_KEY, VOUCH_MODE=observe
8. Print a clear summary box:
```
  Vouch initialized for [project name]

  Policy file:  vouch.policy.yaml
  API key:      vouch_abc123...  (saved to .env.vouch)
  Mode:         observe (safe -- records but never blocks)

  Next steps:
    1. Add to .gitignore:  .env.vouch
    2. Validate policies:  vouch check
    3. Integrate SDK:      npm install vouch-sdk
    4. View your page:     https://vouch.run/[slug]

  When ready to enforce policies:
    Set VOUCH_MODE=enforce in .env.vouch
```

**`packages/cli/src/commands/check.ts`:**

Validates all policy files.

- Finds all .yaml files in current dir matching `vouch*.yaml` or `*.policy.yaml`
- Also finds all .jac files in the configured policyDir
- For YAML: parses with the YAML evaluator and checks required fields
- For Jac: runs `jac check <file>` via child_process
  If Jac MCP is available (check by running `jac mcp --inspect`): uses
  `validate_jac` via MCP for richer error messages
- Renders a table:

```
  VOUCH POLICY CHECK
  ══════════════════════════════════════════════

  vouch.policy.yaml              PASS   (8 rules)
  policies/action_safety.jac     PASS   validated via Jac MCP
  policies/rate_guard.jac        PASS   validated via Jac MCP
  policies/custom.jac            FAIL   line 14: unexpected token

  1 file failed. Fix errors before deploying.
```

Exit code 0 if all pass. Exit code 1 if any fail.
Add to CI: `npx vouch check` in GitHub Actions.

**`packages/cli/src/commands/report.ts`:**

Fetches from the project stats API and renders in terminal.

Reads `vouch.policy.yaml` to get the project slug.
Reads `.env.vouch` for VOUCH_API_ENDPOINT.
Fetches from `{endpoint}/api/project/{slug}`.

Output:
```
  VOUCH REPORT   my-agent   last 30 days
  ═══════════════════════════════════════════════════════

  Pass rate      98.2%   ████████████████████░
  Total actions  2,847
  Confirmed      51      user saw and approved
  Blocked        8       stopped by hard policy
  Cancelled      3       user saw and declined

  POLICY BREAKDOWN
  action_safety         99.6%   (1,823 runs)   [2 blocked]
  scope_guard           97.1%   (641 runs)     [0 blocked, 19 confirmed]
  no_production_writes  100%    (383 runs)

  RECENT ACTIVITY (last 10)
  PASS    send_email        action_safety   12ms   2m ago
  CONFIRM create_event      action_safety   18ms   5m ago
  PASS    save_to_notion    scope_guard     8ms    7m ago
  ...

  View full dashboard: https://vouch.run/my-agent
```

Progress bars use Unicode: `█` (full) `░` (empty). 20 chars wide.
ANSI colors: green=`\x1b[32m`, amber=`\x1b[33m`, red=`\x1b[31m`, reset=`\x1b[0m`.
No chalk. No ora. No external dependencies.

**`packages/cli/package.json`:**
```json
{
  "name": "vouch",
  "version": "0.1.0",
  "description": "CLI for the Vouch runtime safety protocol",
  "type": "module",
  "bin": { "vouch": "dist/index.js" },
  "scripts": { "build": "tsc" },
  "license": "MIT"
}
```

---

## PHASE 12: TESTS

Write tests for the most critical paths. Not comprehensive, but real.

`packages/core/__tests__/yaml-evaluator.test.ts`:
```typescript
// Test ruleMatches for all trigger types
// Test evaluateYamlPolicies returns first matching rule
// Test evaluateYamlPolicies returns PASS when no rules match
// Test actionContains with array
// Test contextValueBelow threshold
// Test contextValueIn membership
```

`packages/core/__tests__/engine.test.ts`:
```typescript
// Test PASS flows through all walkers
// Test YAML BLOCK stops evaluation (Jac walkers don't run)
// Test YAML CONFIRM stops evaluation
// Test that action_safety Jac walker is always called after YAML PASS
// Mock runJacWalker to avoid needing Jac installed in test environment
```

`packages/sdk-python/tests/test_client.py`:
```python
# Test create_vouch returns VouchClient
# Test observe mode never raises VouchBlockedError
# Test enforce mode raises VouchBlockedError on BLOCK
# Test execute_fn is called on PASS
# Test execute_fn is not called when user cancels CONFIRM in enforce mode
# Mock evaluate_policies to control verdicts
```

Run tests:
```bash
pnpm --filter @vouch/core run test
cd packages/sdk-python && python -m pytest tests/ -v
```

All tests must pass before Phase 13.

---

## PHASE 13: SECURITY AUDIT (gstack)

Run gstack `/cso` on these specific files:
- `apps/web/app/api/ingest/route.ts`
- `apps/web/db/schema.sql`
- `packages/core/src/subprocess.ts`

The CSO must explicitly check and confirm or flag:

1. Is the API key comparison using constant-time comparison (timing attack)?
2. Is there a payload size limit on the ingest endpoint?
3. Does the subprocess runner sanitize jac file paths (prevent path traversal)?
4. Is there any code path where actionPayload contents could end up in logs?
5. Are Supabase RLS policies correct and tested with a service_role key?
6. Does VouchBlockedError.message ever expose internal state?
7. Is the rate limiter per-key or shared (shared is wrong)?
8. Is there CORS configured on the ingest endpoint?

Fix every issue raised. Do not proceed until CSO issues are resolved.

---

## PHASE 14: CODE REVIEW (gstack)

Run gstack `/review` on:
- `packages/core/src/` (all files)
- `packages/sdk-ts/src/` (all files)

Review must confirm:
- `runJacWalker` timeout is enforced and process is killed on timeout
- `sendLogEntry` has zero `await` in any calling code (truly fire-and-forget)
- Observe mode never throws and never calls `onBlocked`
- TypeScript: no `any` types in any exported function
- PolicyResult is never mutated after being returned from a walker
- VouchBlockedError is exported correctly and catchable with `instanceof`

Fix all issues raised.

---

## PHASE 15: README

Write `README.md` for the repo root. This is the primary way developers
discover and evaluate Vouch. Write it for a developer who has never heard of
Vouch and is deciding in 90 seconds whether to try it.

Sections (in order):

**1. Opening line** (no header): One sentence. What Vouch is. What problem it
solves. Do not use the words "simple", "easy", "powerful", or "revolutionary."

**2. The problem** (no header): 3-4 sentences. Agents act on wrong intent
silently. There is no standard layer between classification and execution.
When something goes wrong, there is no audit trail. Developers have no
vocabulary for expressing what their agent is allowed to do.

**3. How Vouch works** (header: `## How it works`):
Three bullet points. No sub-bullets.
- Policies are YAML files (or Jac for complex rules) that declare what your agent can do
- At runtime, every action is evaluated against your policies before it executes
- Results are logged (no user content) and visible at vouch.run/[your-slug]

**4. Install** (header: `## Install`):
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

**5. Usage** (header: `## Usage`):
Show the TypeScript example. Real code. Show both the config and the protect() call.
Then show the Python equivalent immediately below.

**6. Writing policies** (header: `## Policies`):
Show the generic.yaml snippet (10 lines max). Two sentences about YAML rules.
One sentence about Jac extension for complex stateful rules. Link to docs/.

**7. The public trust page** (header: `## Trust page`):
One paragraph. Show the URL pattern. What is and isn't stored. Who uses it
(send to users, put in decks, add to landing page).

**8. Modes** (header: `## Modes`):
Two items: observe and enforce. One sentence each.
Recommend starting with observe.

**9. Built with Jac** (header: `## Built with Jac`):
Vouch's built-in policy walkers are written in Jac (jaseci.org). Jac is an
AI-native programming language whose Object-Spatial Programming model -- typed
graph traversal with deterministic rules -- is exactly right for policy
enforcement. The Jac MCP server validates policy files in development and CI.
Developers can write custom policies in Jac for stateful rules that require
graph traversal (rate limiting, session tracking, multi-step intent verification).
This was demonstrated at JacHacks.

**Rules**: No em dashes. Under 700 words total. No marketing language.
Headers are plain descriptions, not slogans.

---

## PHASE 16: DOCUMENTATION

Write the following docs files. Keep each one under 400 words. Practical only.

**`docs/how-it-works.md`:**
The policy evaluation pipeline in detail. The five steps. The walker sequence.
What YAML policies can express. What Jac policies add. How the log entry is
built (what fields, why each one).

**`docs/writing-policies.md`:**
Full YAML trigger reference. Every field with an example. Common patterns.
How to test a policy with `vouch check`. How to add a Jac extension.

**`docs/integrations/vercel-ai-sdk.md`:**
Show how to wrap a Vercel AI SDK tool call with vouch.protect(). Real code.
Explain how to map the tool name to actionType and tool parameters to context.

**`docs/integrations/langchain.md`:**
Show how to add Vouch as a LangChain callback handler. Real Python code.
Show how to intercept tool calls before execution.

**`docs/integrations/openai-tools.md`:**
Show how to wrap OpenAI tool_use responses with vouch.protect() before
dispatching to the tool function. TypeScript and Python.

**`docs/integrations/fastapi.md`:**
Show a FastAPI middleware or endpoint wrapper using the Python SDK.

---

## PHASE 17: GITHUB ACTIONS

Build `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]

jobs:
  validate-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install jaseci
      - run: jac --version
      - run: |
          for f in policies/builtin/*.jac; do
            echo "Checking $f..."
            jac check "$f" || exit 1
          done
      - run: echo "All Jac policies valid"

  test-ts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm --filter @vouch/core run test
      - run: pnpm --filter vouch-sdk run build

  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install pytest
      - run: cd packages/sdk-python && python -m pytest tests/ -v

  build-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm --filter web run build
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

## PHASE 18: SHIP (gstack)

Run gstack `/ship`:

Branch: `main` (this is a new repo, ship directly)
PR/commit title: `feat: Vouch v0.1.0 -- runtime behavioral safety for AI agents`
Commit message body:
- What Vouch is (two sentences)
- Components shipped: core, sdk-ts, sdk-python, cli, dashboard, policies
- Jac policy walkers validated: action_safety, scope_guard, rate_guard
- CI: all tests passing, all .jac files validated
- Default mode: observe (no behavior changes until VOUCH_MODE=enforce is set)
- Public dashboard: deploy apps/web to Vercel, schema applied to Supabase

---

## DEFINITION OF DONE

Do not consider this build complete until every single item is checked.
Grep or run commands to verify -- do not assume.

POLICIES
- [ ] `jac check policies/builtin/_base.jac` exits 0
- [ ] `jac check policies/builtin/action_safety.jac` exits 0
- [ ] `jac check policies/builtin/scope_guard.jac` exits 0
- [ ] `jac check policies/builtin/rate_guard.jac` exits 0
- [ ] `grep -r "by llm" policies/` returns ZERO results
- [ ] All 3 example YAML files parse without error

PACKAGES
- [ ] `pnpm --filter @vouch/core run build` exits 0
- [ ] `pnpm --filter vouch-sdk run build` exits 0
- [ ] `pnpm --filter vouch run build` exits 0
- [ ] `cd packages/sdk-python && python -m pytest` exits 0

TESTS
- [ ] `pnpm --filter @vouch/core run test` exits 0
- [ ] All Python tests pass

DASHBOARD
- [ ] `pnpm --filter web run build` exits 0
- [ ] No TypeScript errors in any component
- [ ] `loading.tsx` exists and shows skeleton
- [ ] `not-found.tsx` exists and shows clean 404

SECURITY
- [ ] `/cso` review complete, all issues resolved
- [ ] Ingest endpoint uses constant-time key comparison
- [ ] RLS is enabled on both Supabase tables
- [ ] `grep -r "actionPayload\|action_payload" apps/web/app/api/ingest` returns ZERO results
- [ ] `grep -r "console.log" packages/core/src packages/sdk-ts/src` returns ZERO results

CODE QUALITY
- [ ] `/review` complete, all issues resolved
- [ ] `grep -r "await sendLogEntry\|await send_log_entry" packages/` returns ZERO results
- [ ] `grep -r ": any" packages/core/src packages/sdk-ts/src` returns ZERO results

DOCS
- [ ] README.md written, includes "Built with Jac" section
- [ ] All 6 docs files written
- [ ] LICENSE file exists (MIT)

CI
- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] All three CI jobs reference the correct package names

---

## HARD CONSTRAINTS

These cannot be violated. Grep to verify before calling complete.

1. NO EM DASHES anywhere. Not in code, comments, README, CLI output, docs,
   or any string literal. Use a regular hyphen or rewrite the sentence.
   Verify: `grep -r " — " .` returns ZERO results.

2. NO `by llm()` IN POLICY FILES. Policies are deterministic.
   Verify: `grep -r "by llm" policies/` returns ZERO results.

3. NO RAW CONTENT STORED. actionPayload is never written to any database,
   log file, or console output anywhere in the codebase.
   Verify: `grep -rn "actionPayload" apps/web/app/api/` returns ZERO results.

4. NO `console.log` IN LIBRARY CODE. Use the debug() wrapper.
   Verify: `grep -rn "console.log" packages/core/src packages/sdk-ts/src` returns ZERO results.

5. OBSERVE MODE IS DEFAULT everywhere. No code path blocks or throws by default.
   Verify: grep all VouchConfig defaults and confirm mode defaults to 'observe'.

6. JAC MCP WAS USED. Every .jac file was validated via the Jac MCP during build.
   Verify: `jac check policies/builtin/*.jac` all exit 0.

---

Start with Tool Setup. Build every phase in order. Do not stop.

```
## DESIGN + DEPLOYMENT ADDENDUM

Before building any dashboard component, use the Google Stitch MCP to generate
the full visual design for the public trust page and landing page -- provide it
the aesthetic direction (dark #0D0D0D, off-white #EDEDEA, JetBrains Mono,
trust-certificate tone, pass rate as hero) and use the output as the exact
design spec for every component in Phase 10. If Google Stitch is unavailable,
fall back to the Pencil MCP for component-level design generation. Do not write
a single line of dashboard JSX before the design output is in hand -- implement
exactly what the MCP returns, do not improvise. For backend, replace all
Supabase references with InsForge: use the InsForge SDK for all database reads
and writes, replace the Supabase client in apps/web/lib/supabase.ts with the
InsForge client initialized via INSFORGE_API_KEY and INSFORGE_PROJECT_ID env
vars, and apply the schema.sql DDL through the InsForge dashboard or CLI rather
than Supabase. For deployment, after Phase 17 CI passes, run `vercel --prod`
from the apps/web directory using the Vercel CLI -- set INSFORGE_API_KEY,
INSFORGE_PROJECT_ID, VOUCH_INGEST_KEY, and NEXT_PUBLIC_APP_URL as Vercel
environment variables before deploying, then verify the live URL returns 200
on /api/health before calling the build complete.
```