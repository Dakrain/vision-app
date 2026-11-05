/** Firebase chat session state, as shown on the Chat page. */
export type SocialStatus = 'connecting' | 'connected' | 'failed';

/** Automatic sign-in retries before showing the error + "Thử lại". */
export const AUTO_RETRIES = 3;

/** Wait before retry number `attempt` (0-based): 2s, 4s, 8s… up to 30s. */
export const retryDelayMs = (attempt: number) =>
  Math.min(2000 * 2 ** attempt, 30000);
