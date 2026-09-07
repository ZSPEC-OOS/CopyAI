'use client';

import Link from 'next/link';
import { forwardRef, useState } from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNew: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

export const Header = forwardRef<HTMLInputElement, HeaderProps>(function Header(
  { searchQuery, onSearchChange, onNew },
  searchRef
) {
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="scripts-header">
      <div className="scripts-header-row">
        <div className="scripts-header__zone scripts-header__zone--left">
          <button
            type="button"
            className="scripts-icon-btn"
            aria-label="Menu"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((v) => !v)}
          >
            ☰
          </button>
          {showMenu && (
            <>
              <div className="scripts-menu-backdrop" onClick={() => setShowMenu(false)} />
              <div
                className="scripts-dropdown"
                role="menu"
                onKeyDown={(e) => e.key === 'Escape' && setShowMenu(false)}
              >
                <Link href="/" className="scripts-dropdown__item" role="menuitem">
                  ← Back to CopyAI
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="scripts-header__brand">
          <span className="scripts-header__logo" aria-hidden="true">
            ⟡
          </span>
          <span className="scripts-header__name">Scripts</span>
        </div>

        <div className="scripts-header__zone scripts-header__zone--right">
          <button
            type="button"
            className="scripts-icon-btn"
            aria-label="Keyboard shortcuts help"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((v) => !v)}
          >
            ?
          </button>
          <button type="button" className="scripts-btn scripts-btn--primary" onClick={onNew}>
            + New Text
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="scripts-help-popover" role="dialog" aria-label="Keyboard shortcuts">
          <button
            type="button"
            className="scripts-icon-btn scripts-help-popover__close"
            aria-label="Close"
            onClick={() => setShowHelp(false)}
          >
            ×
          </button>
          <h2>Keyboard shortcuts</h2>
          <dl>
            <div>
              <dt>
                <kbd className="scripts-kbd">{modKey}K</kbd>
              </dt>
              <dd>Search</dd>
            </div>
            <div>
              <dt>
                <kbd className="scripts-kbd">{modKey}N</kbd>
              </dt>
              <dd>New text</dd>
            </div>
            <div>
              <dt>
                <kbd className="scripts-kbd">{modKey}S</kbd>
              </dt>
              <dd>Save</dd>
            </div>
            <div>
              <dt>
                <kbd className="scripts-kbd">{modKey}⏎</kbd>
              </dt>
              <dd>Copy</dd>
            </div>
            <div>
              <dt>
                <kbd className="scripts-kbd">Esc</kbd>
              </dt>
              <dd>Close editor / dialog</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="scripts-search-row">
        <label htmlFor="scripts-search" className="scripts-visually-hidden">
          Search saved text
        </label>
        <input
          ref={searchRef}
          id="scripts-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title, text, tags, collections…"
          className="scripts-search-row__input"
        />
        <kbd className="scripts-kbd">{modKey}K</kbd>
      </div>
    </header>
  );
});
