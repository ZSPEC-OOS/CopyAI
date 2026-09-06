'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface OverflowMenuProps {
  label: string;
  triggerClassName?: string;
  children: (close: () => void) => ReactNode;
}

/**
 * A "..." overflow menu that closes on outside click and Escape — unlike
 * a bare <details>/<summary>, which only closes when its own summary is
 * clicked again.
 */
export function OverflowMenu({ label, triggerClassName = 'unline-icon-btn', children }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="unline-tile-menu" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="unline-tile-menu__panel" role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}
