'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Minimal focus-trapping confirm dialog — used in place of window.confirm/alert. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  return (
    <div className="scripts-modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="scripts-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="scripts-confirm-title"
        aria-describedby="scripts-confirm-description"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="scripts-confirm-title" className="scripts-modal__title">
          {title}
        </h2>
        <p id="scripts-confirm-description" className="scripts-modal__description">
          {description}
        </p>
        <div className="scripts-modal__actions">
          <button type="button" className="scripts-btn scripts-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`scripts-btn ${danger ? 'scripts-btn--danger' : 'scripts-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
