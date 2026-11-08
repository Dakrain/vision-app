interface DeleteAccountDeps {
  /** POST /user/withdraw: closes the account and revokes this token. */
  withdraw: () => Promise<unknown>;
  /** Forgets the session here (the server already dropped it). */
  signOut: () => void;
}

/**
 * Deletes the signed-in account (required by the App Store for apps that
 * create accounts). Signed out only once the server has deleted it.
 */
export async function deleteAccount({
  withdraw,
  signOut,
}: DeleteAccountDeps): Promise<boolean> {
  try {
    await withdraw();
  } catch (_) {
    return false;
  }
  signOut();
  return true;
}
