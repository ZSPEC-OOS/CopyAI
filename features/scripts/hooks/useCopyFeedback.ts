'use client';

import { useCallback, useRef, useState } from 'react';
import { copyToClipboard } from '../utils';

export type CopyState = 'idle' | 'copied' | 'error';

export function useCopyFeedback(resetAfterMs = 1500) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyToClipboard(text);
      setState(ok ? 'copied' : 'error');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState('idle'), resetAfterMs);
      return ok;
    },
    [resetAfterMs]
  );

  return { state, copy };
}
