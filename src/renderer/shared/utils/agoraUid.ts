/**
 * Agora uids of a meeting (vision-api docs/meeting-devices.md). One account
 * may hold several connections:
 * - main connection: 700000 + user id;
 * - its second device ("Tham gia trên thiết bị này"): 1e9 + id * 4 + 1;
 * - the camera kept on while a connection shares its screen (the screen
 *   replaces the camera on the main uid): 2e9 + id * 4 + slot.
 */
const MAIN_BASE = 700000;
const COMPANION_BASE = 1e9;
const AUX_BASE = 2e9;

export type AgUidKind = 'main' | 'companion' | 'aux';

/** Whose connection a uid is, and which one. */
export const parseAgUid = (uid: number): { userId: number; kind: AgUidKind } => {
  if (uid >= AUX_BASE) {
    return { userId: Math.floor((uid - AUX_BASE) / 4), kind: 'aux' };
  }
  if (uid >= COMPANION_BASE) {
    return { userId: Math.floor((uid - COMPANION_BASE) / 4), kind: 'companion' };
  }
  return { userId: uid - MAIN_BASE, kind: 'main' };
};

export const ownerOfAgUid = (uid: number) => parseAgUid(uid).userId;
