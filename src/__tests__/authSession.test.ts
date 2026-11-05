import { apiErrorStatus } from '../renderer/shared/network/apiError';
import { fetchUserInfo, login } from '../renderer/shared/store/auth/action';
import reducer from '../renderer/shared/store/auth/slice';
import INITIAL_STATE from '../renderer/shared/store/auth/constants';

// What BaseService rejects with: AxiosError JSON plus the response status.
const apiError = (status?: number) =>
  JSON.stringify({
    message: 'x',
    response: status ? { status, data: {} } : undefined,
  });

describe('apiErrorStatus', () => {
  it('reads the HTTP status of a BaseService error', () => {
    expect(apiErrorStatus(apiError(401))).toBe(401);
  });
  it('is undefined for network errors and anything unparsable', () => {
    expect(apiErrorStatus(apiError())).toBeUndefined();
    expect(apiErrorStatus('not json')).toBeUndefined();
    expect(apiErrorStatus(new Error('boom'))).toBeUndefined();
    expect(apiErrorStatus(undefined)).toBeUndefined();
  });
});

describe('auth slice: loading the user at launch', () => {
  const rejected = (status?: number) =>
    fetchUserInfo.rejected(null, 'req', '1', apiError(status));

  beforeEach(() => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('last_login_user', '1');
  });

  it('a network error keeps the session and counts the failure', () => {
    let state = reducer(INITIAL_STATE, rejected());
    state = reducer(state, fetchUserInfo.rejected(null, 'r', '1', 'x'));
    expect(state.userFailures).toBe(2);
    expect(state.sessionExpired).toBe(false);
    expect(localStorage.getItem('token')).toBe('tok');
  });

  it('a 500 keeps the session too', () => {
    const state = reducer(INITIAL_STATE, rejected(500));
    expect(state.sessionExpired).toBe(false);
    expect(localStorage.getItem('token')).toBe('tok');
  });

  it('401: the session is over, token dropped', () => {
    const state = reducer(INITIAL_STATE, rejected(401));
    expect(state.sessionExpired).toBe(true);
    expect(localStorage.getItem('token')).toBe('');
  });

  it('success resets the failure count', () => {
    let state = reducer(INITIAL_STATE, rejected());
    state = reducer(
      state,
      fetchUserInfo.fulfilled({ id: 1 } as any, 'req', '1'),
    );
    expect(state.userFailures).toBe(0);
    expect(state.user?.id).toBe(1);
  });

  it('logging in again clears an expired session', () => {
    let state = reducer(INITIAL_STATE, rejected(401));
    state = reducer(state, login.fulfilled({ id: 1 } as any, 'req', {} as any));
    expect(state.sessionExpired).toBe(false);
  });
});
