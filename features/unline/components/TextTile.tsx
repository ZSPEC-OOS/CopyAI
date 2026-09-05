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
      className="unline-tile"
      data-pinned={item.isPinned || undefined}
      tabIndex={0}
      role="button"
      aria-label={`Open ${item.title}`}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      <header className="unline-tile__header">
        <h3 className="unline-tile__title">
          {item.isPinned && <span aria-hidden="true">📌 </span>}
          {item.title}
        </h3>
        <div className="unline-tile__quick-actions">
          <button
            type="button"
            className="unline-icon-btn"
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
            className={`unline-btn unline-btn--sm ${state === 'copied' ? 'unline-btn--success' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              copy(item.cleanedText);
            }}
          >
            {state === 'copied' ? 'Copied ✓' : state === 'error' ? 'Copy failed' : 'Copy'}
          </button>
          <TileMenu item={item} onTogglePin={onTogglePin} onDelete={onDelete} />
        </div>
      </header>

      <p className="unline-tile__preview">{previewOf(item.cleanedText) || 'Empty text item.'}</p>

      <footer className="unline-tile__footer">
        <div className="unline-tile__tags">
          {collection && <span className="unline-chip unline-chip--collection">{collection.name}</span>}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="unline-chip">
              {tag}
            </span>
          ))}
        </div>
        <time className="unline-tile__date" dateTime={item.updatedAt}>
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
    <details className="unline-tile-menu" onClick={(e) => e.stopPropagation()}>
      <summary className="unline-icon-btn" aria-label="More actions">
        ⋯
      </summary>
      <div className="unline-tile-menu__panel" role="menu">
        <button type="button" role="menuitem" onClick={() => onTogglePin(item.id)}>
          {item.isPinned ? 'Unpin' : 'Pin to top'}
        </button>
        <button
          type="button"
          role="menuitem"
          className="unline-tile-menu__danger"
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
