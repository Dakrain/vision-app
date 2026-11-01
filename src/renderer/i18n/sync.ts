import { doc, setDoc } from 'firebase/firestore';
import { firestore, uidFor } from '@/shared/services/Firebase/app';
import UserService from '@/shared/services/User/UserService';
import type { Language } from '.';

/**
 * Tells the servers the user's app language so the pushes they write read
 * in it: the API (friend requests, missed calls, meeting invites;
 * settings.language) and Firestore users/<uid>.language (chat pushes).
 * Best-effort, like mobile.
 */
export function syncLanguage(language: Language, backendId?: number) {
  if (!backendId) return;
  UserService.patchProfile(backendId, { language }).catch(() => {});
  setDoc(
    doc(firestore, 'users', uidFor(backendId)),
    { language },
    { merge: true },
  ).catch(() => {});
}
