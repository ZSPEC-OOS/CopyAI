'use client';

import { forwardRef, useState } from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNew: () => void;
  onToggleSidebar: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

export const Header = forwardRef<HTMLInputElement, HeaderProps>(function Header(
  { searchQuery, onSearchChange, onNew, onToggleSidebar },
  searchRef
) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="unline-header">
      <button
        type="button"
        className="unline-icon-btn unline-header__menu-toggle"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
      >
        ☰
      </button>

      <div className="unline-header__brand">
        <span className="unline-header__logo" aria-hidden="true">
          ⟡
        </span>
        <span className="unline-header__name">Unline</span>
      </div>

      <div className="unline-header__search">
        <label htmlFor="unline-search" className="unline-visually-hidden">
          Search saved text
        </label>
        <input
          ref={searchRef}
          id="unline-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title, text, tags, collections…"
          className="unline-header__search-input"
        />
        <kbd className="unline-kbd">{modKey}K</kbd>
      </div>

      <div className="unline-header__actions">
        <button
          type="button"
          className="unline-icon-btn"
          aria-label="Keyboard shortcuts help"
          aria-expanded={showHelp}
          onClick={() => setShowHelp((v) => !v)}
        >
          ?
        </button>
        <button type="button" className="unline-btn unline-btn--primary" onClick={onNew}>
          + New Text
        </button>
      </div>

      {showHelp && (
        <div className="unline-help-popover" role="dialog" aria-label="Keyboard shortcuts">
          <button
            type="button"
            className="unline-icon-btn unline-help-popover__close"
            aria-label="Close"
            onClick={() => setShowHelp(false)}
          >
            ×
          </button>
          <h2>Keyboard shortcuts</h2>
          <dl>
            <div>
              <dt>
                <kbd className="unline-kbd">{modKey}K</kbd>
              </dt>
              <dd>Search</dd>
            </div>
            <div>
              <dt>
                <kbd className="unline-kbd">{modKey}N</kbd>
              </dt>
              <dd>New text</dd>
            </div>
            <div>
              <dt>
                <kbd className="unline-kbd">{modKey}S</kbd>
              </dt>
              <dd>Save</dd>
            </div>
            <div>
              <dt>
                <kbd className="unline-kbd">{modKey}⏎</kbd>
              </dt>
              <dd>Copy</dd>
            </div>
            <div>
              <dt>
                <kbd className="unline-kbd">Esc</kbd>
              </dt>
              <dd>Close editor / dialog</dd>
            </div>
          </dl>
        </div>
      )}
    </header>
  );
});
