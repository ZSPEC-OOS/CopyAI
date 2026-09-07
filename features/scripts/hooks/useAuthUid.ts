'use client';

// Scripts's one deliberate coupling point to the host app: it reads the
// shared Firebase Auth session (lib/firebase.ts) so each CopyAI profile
// gets its own Scripts library, with no crossover between accounts. It does
// not import any CopyAI app/business logic — only this shared config.

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface AuthState {
  uid: string | null;
  checked: boolean;
}

export function useAuthUid(): AuthState {
  const [state, setState] = useState<AuthState>({ uid: null, checked: false });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setState({ uid: user?.uid ?? null, checked: true });
    });
  }, []);

  return state;
}
