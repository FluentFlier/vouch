import type { PolicyFile, PolicyResult, VouchInput } from './types.js';
/**
 * Evaluates a VouchInput against a PolicyFile.
 * Returns the first matching rule's verdict, or PASS if no rule matches.
 * Rules are evaluated in order. First match wins.
 */
export declare function evaluateYamlPolicies(input: VouchInput, policyFile: PolicyFile): PolicyResult;
/**
 * Loads and parses a vouch.policy.yaml file.
 * Throws if the file is missing or malformed.
 */
export declare function loadPolicyFile(policyPath: string): Promise<PolicyFile>;
