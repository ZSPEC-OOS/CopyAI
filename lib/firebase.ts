import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyALNxKQjAlTTpzcmBusII-zmiNjgXjnDhU",
  authDomain: "copyai-c2e3b.firebaseapp.com",
  projectId: "copyai-c2e3b",
  storageBucket: "copyai-c2e3b.firebasestorage.app",
  messagingSenderId: "697207621340",
  appId: "1:697207621340:web:9505e51dfc97ed499d9619",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Login is username-based (not email) for continuity with the existing UI
 * and the wolfkrow.onrender.com embed protocol, but Firebase Auth requires
 * an email. Each username deterministically maps to a synthetic address
 * under a domain nobody sends real mail to, so Firebase's own per-account
 * email uniqueness is what enforces username uniqueness — no separate
 * lookup table needed.
 */
export function usernameToEmail(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${normalized}@copyai.local`;
}
