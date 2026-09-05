'use client';

import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onSearch?: () => void;
  onNew?: () => void;
  onSave?: () => void;
  onCopy?: () => void;
  onEscape?: () => void;
}

/**
 * Cmd/Ctrl+K search, Cmd/Ctrl+N new text, Cmd/Ctrl+S save,
 * Cmd/Ctrl+Enter copy, Escape close. Browser defaults are only
 * prevented for the combinations Unline actually handles.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const current = handlersRef.current;

      if (mod && key === 'k' && current.onSearch) {
        event.preventDefault();
        current.onSearch();
      } else if (mod && key === 'n' && current.onNew) {
        event.preventDefault();
        current.onNew();
      } else if (mod && key === 's' && current.onSave) {
        event.preventDefault();
        current.onSave();
      } else if (mod && event.key === 'Enter' && current.onCopy) {
        event.preventDefault();
        current.onCopy();
      } else if (event.key === 'Escape' && current.onEscape) {
        current.onEscape();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
