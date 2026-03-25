import type { PolicyResult, VouchInput, VouchConfig } from './types.js';
export interface EvalResult {
    result: PolicyResult;
    durationMs: number;
}
export declare function evaluatePolicies(input: VouchInput, config: VouchConfig): Promise<EvalResult>;
