import {
  evaluatePolicies,
  buildLogEntry,
  sendLogEntry,
  VouchBlockedError,
  VouchConfigError,
  DEFAULT_UNDO_WINDOW_MS,
} from '@vouch/core';
import type { VouchConfig, VouchInput, VouchHooks, PolicyResult } from '@vouch/core';

export class VouchClient {
  private readonly config: VouchConfig;

  constructor(config: VouchConfig) {
    if (!config.projectSlug) throw new VouchConfigError('projectSlug is required');
    if (!config.policyPath) throw new VouchConfigError('policyPath is required');
    this.config = config;
  }

  /**
   * Wrap any agent action with Vouch policy enforcement.
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
              return null;
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
