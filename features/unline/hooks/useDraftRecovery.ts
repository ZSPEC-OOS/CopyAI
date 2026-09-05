'use client';

import { useCallback, useEffect, useState } from 'react';
import * as storage from '../storage';
import type { Draft } from '../types';

function resolveRecoverableDraft(): Draft | null {
  const draft = storage.getDraft();
  if (!draft || (draft.originalText.trim() === '' && draft.cleanedText.trim() === '')) {
    return null;
  }
  if (draft.textItemId) {
    const item = storage.getItem(draft.textItemId);
    if (item && draft.updatedAt <= item.updatedAt) {
      storage.clearDraft();
      return null;
    }
  }
  return draft;
}

/**
 * Offers a recovered draft only when it represents real unsaved work:
 * non-empty, and — for a draft tied to an existing saved item — newer
 * than that item's last save. This is what stops a stale local draft
 * from silently clobbering content saved from another tab/session.
 *
 * The localStorage read can only happen client-side (SSR has no draft),
 * so it runs once after mount rather than during render.
 */
export function useDraftRecovery() {
  const [recoverable, setRecoverable] = useState<Draft | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with localStorage, not derivable during render (SSR has no window)
    setRecoverable(resolveRecoverableDraft());
  }, []);

  const discard = useCallback(() => {
    storage.clearDraft();
    setRecoverable(null);
  }, []);

  const dismiss = useCallback(() => {
    setRecoverable(null);
  }, []);

  return { recoverable, discard, dismiss };
}
