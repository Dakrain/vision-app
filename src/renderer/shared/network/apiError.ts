/**
 * HTTP status of an error from BaseService (which rejects with a JSON
 * string). Undefined for network errors, timeouts and anything else.
 */
export function apiErrorStatus(error: unknown): number | undefined {
  try {
    const status = JSON.parse(String(error))?.response?.status;
    return typeof status === 'number' ? status : undefined;
  } catch (_) {
    return undefined;
  }
}

/**
 * The API says I'm not (or no longer) in this meeting: rejected from the
 * waiting room, removed, or the meeting is gone. Same rule as useMeeting.
 */
export const isGoneFromMeeting = (error: unknown) =>
  [400, 403, 404].includes(apiErrorStatus(error) ?? 0);
