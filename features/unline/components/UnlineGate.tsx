'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUid } from '../hooks/useAuthUid';
import * as storage from '../storage';
import { UnlineApp } from './UnlineApp';

/**
 * Unline has no login of its own — it rides on the CopyAI session. This
 * gate waits for that session to resolve, points storage at the signed-in
 * profile's namespace (so profiles never see each other's saved text), and
 * sends signed-out visitors back to CopyAI's own login screen.
 */
export function UnlineGate() {
  const { uid, checked } = useAuthUid();
  const router = useRouter();
  const [namespaceReady, setNamespaceReady] = useState(false);

  useEffect(() => {
    if (!checked) return;
    if (!uid) {
      router.replace('/');
      return;
    }
    storage.setNamespace(uid);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with the auth session before mounting UnlineApp, not derivable during render
    setNamespaceReady(true);
  }, [checked, uid, router]);

  if (!checked || !uid || !namespaceReady) {
    return (
      <div className="unline-root unline-loading-screen">
        <span className="unline-loading-screen__logo" aria-hidden="true">
          ⟡
        </span>
        {checked && !uid && <p>Redirecting to CopyAI…</p>}
      </div>
    );
  }

  return <UnlineApp />;
}
