'use client';

import { useState } from 'react';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import type { Collection, TextItem } from '../types';
import { formatRelativeDate, previewOf } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';

interface TextTileProps {
  item: TextItem;
  collection: Collection | undefined;
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TextTile({ item, collection, onOpen, onTogglePin, onToggleFavorite, onDelete }: TextTileProps) {
  const { state, copy } = useCopyFeedback();

  return (
    <article
      className="scripts-tile"
      data-pinned={item.isPinned || undefined}
      data-copy-state={state !== 'idle' ? state : undefined}
      tabIndex={0}
      role="button"
      aria-label={state === 'copied' ? `Copied ${item.title}` : `Copy ${item.title}`}
      onClick={() => copy(item.cleanedText)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copy(item.cleanedText);
        }
      }}
    >
      {state !== 'idle' && (
        <span
          className={`scripts-tile__copied-badge ${state === 'error' ? 'scripts-tile__copied-badge--error' : ''}`}
          aria-hidden="true"
        >
          {state === 'copied' ? 'Copied ✓' : 'Copy failed'}
        </span>
      )}
      <header className="scripts-tile__header">
        <h3 className="scripts-tile__title">
          {item.isPinned && <span aria-hidden="true">📌 </span>}
          {item.title}
        </h3>
        <div className="scripts-tile__quick-actions">
          <button
            type="button"
            className="scripts-icon-btn"
            aria-pressed={item.isFavorite}
            aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
          >
            {item.isFavorite ? '★' : '☆'}
          </button>
          <button
            type="button"
            className="scripts-btn scripts-btn--sm"
            aria-label={`Edit ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(item.id);
            }}
          >
            Edit
          </button>
          <TileMenu item={item} onTogglePin={onTogglePin} onDelete={onDelete} />
        </div>
      </header>

      <p className="scripts-tile__preview">{previewOf(item.cleanedText) || 'Empty text item.'}</p>

      <footer className="scripts-tile__footer">
        <div className="scripts-tile__tags">
          {collection && <span className="scripts-chip scripts-chip--collection">{collection.name}</span>}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="scripts-chip">
              {tag}
            </span>
          ))}
        </div>
        <time className="scripts-tile__date" dateTime={item.updatedAt}>
          {formatRelativeDate(item.updatedAt)}
        </time>
      </footer>
    </article>
  );
}

function TileMenu({
  item,
  onTogglePin,
  onDelete,
}: {
  item: TextItem;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <details className="scripts-tile-menu" onClick={(e) => e.stopPropagation()}>
      <summary className="scripts-icon-btn" aria-label="More actions">
        ⋯
      </summary>
      <div className="scripts-tile-menu__panel" role="menu">
        <button type="button" role="menuitem" onClick={() => onTogglePin(item.id)}>
          {item.isPinned ? 'Unpin' : 'Pin to top'}
        </button>
        <button
          type="button"
          role="menuitem"
          className="scripts-tile-menu__danger"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this text item?"
          description={`"${item.title}" and its version history will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete(item.id);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </details>
  );
}
