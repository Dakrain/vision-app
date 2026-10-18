import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project as the mobile app: chat lives in Firestore. 1:1
// calls go through the Vision API (shared/services/Call).
const firebaseApp = initializeApp({
  apiKey: 'AIzaSyCiz_e6YfR8DOpwd5MeUyl0PbVq_PggWB0',
  authDomain: 'vision20-dev.firebaseapp.com',
  databaseURL: 'https://vision20-dev.firebaseio.com',
  projectId: 'vision20-dev',
  storageBucket: 'vision20-dev.firebasestorage.app',
  messagingSenderId: '251612195713',
  appId: '1:251612195713:web:8ae55e617f97594006d680',
});

export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

/** Cloud Function exchanging a Vision API token for a Firebase token. */
const SESSION_URL =
  'https://us-central1-vision20-dev.cloudfunctions.net/firebaseSession';

/** Stable Firebase uid of a Vision user — same rule as the mobile app. */
export const uidFor = (backendId: number) => `u${backendId}`;

/**
 * Signs in to Firebase as the logged-in Vision user. The function checks
 * the API token, so security rules can trust the `backendId` claim.
 */
export async function signInAsUser(backendId: number): Promise<string> {
  const uid = uidFor(backendId);
  if (auth.currentUser?.uid === uid) return uid;
  if (auth.currentUser) await firebaseSignOut(auth);

  const res = await fetch(SESSION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiToken: localStorage.getItem('token'),
      backendId,
      platform: navigator.userAgent.includes('Mac') ? 'MacOs' : 'Windows',
    }),
  });
  if (!res.ok) throw new Error(`firebaseSession ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  const cred = await signInWithCustomToken(auth, token);
  return cred.user.uid;
}

export const signOut = () => firebaseSignOut(auth);
