/** Wait before retry number `attempt` (0-based): 2s, 4s, 8s… up to 30s. */
export const retryDelayMs = (attempt: number) =>
  Math.min(2000 * 2 ** attempt, 30000);
