import { deleteAccount } from '../renderer/shared/utils/deleteAccount';

describe('deleteAccount', () => {
  it('deletes on the server, then signs this device out', async () => {
    const calls: string[] = [];
    const ok = await deleteAccount({
      withdraw: async () => {
        calls.push('withdraw');
      },
      signOut: () => calls.push('signOut'),
    });
    expect(ok).toBe(true);
    expect(calls).toEqual(['withdraw', 'signOut']);
  });

  it('a failed delete keeps the user signed in', async () => {
    const signOut = jest.fn();
    const ok = await deleteAccount({
      withdraw: () => Promise.reject(new Error('network')),
      signOut,
    });
    expect(ok).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});
