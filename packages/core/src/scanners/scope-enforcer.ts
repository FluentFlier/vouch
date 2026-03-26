export interface ScopeCheckResult {
  allowed: boolean;
  message: string;
}

export type ScopeMap = Record<string, string[]>;

/**
 * Checks if an action on an integration is within declared scope.
 * If no scope map is provided, everything passes.
 */
export function checkActionScope(
  integration: string,
  action: string,
  scopeMap: ScopeMap
): ScopeCheckResult {
  if (!scopeMap || Object.keys(scopeMap).length === 0) {
    return { allowed: true, message: '' };
  }

  const intLower = integration.toLowerCase();
  const actLower = action.toLowerCase();

  if (!(intLower in scopeMap)) {
    return {
      allowed: false,
      message: `Integration '${integration}' is not in scope. Allowed: ${Object.keys(scopeMap).join(', ')}`,
    };
  }

  const allowedActions = scopeMap[intLower].map((a) => a.toLowerCase());
  if (!allowedActions.includes(actLower)) {
    return {
      allowed: false,
      message: `Action '${action}' is not allowed on '${integration}'. Allowed: ${scopeMap[intLower].join(', ')}`,
    };
  }

  return { allowed: true, message: '' };
}
