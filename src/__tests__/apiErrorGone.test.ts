import { isGoneFromMeeting } from '../renderer/shared/network/apiError';

const err = (status?: number) =>
  JSON.stringify({ response: status ? { status } : undefined });

describe('isGoneFromMeeting', () => {
  it('400/403/404: no longer a member (rejected, removed, deleted)', () => {
    expect([400, 403, 404].map((s) => isGoneFromMeeting(err(s)))).toEqual([
      true,
      true,
      true,
    ]);
  });
  it('network errors and server trouble: still waiting', () => {
    expect(
      [undefined, 500, 502, 401].map((s) => isGoneFromMeeting(err(s))),
    ).toEqual([false, false, false, false]);
  });
});
