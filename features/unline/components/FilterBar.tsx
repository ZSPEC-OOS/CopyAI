'use client';

import { useState } from 'react';
import type { Collection, LibraryFilter, TextItem } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface FilterBarProps {
  collections: Collection[];
  items: TextItem[];
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
}

function isSameFilter(a: LibraryFilter, b: LibraryFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'collection' && b.kind === 'collection') return a.collectionId === b.collectionId;
  return true;
}

export function FilterBar({
  collections,
  items,
  filter,
  onFilterChange,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
}: FilterBarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');

  const favoriteCount = items.filter((i) => i.isFavorite).length;

  const submitNewCollection = () => {
    const name = draftName.trim();
    if (name) onCreateCollection(name);
    setDraftName('');
    setIsCreating(false);
  };

  return (
    <nav className="unline-filterbar" aria-label="Filter saved text">
      <Pill
        label="All Text"
        count={items.length}
        active={isSameFilter(filter, { kind: 'all' })}
        onClick={() => onFilterChange({ kind: 'all' })}
      />
      <Pill
        label="Favorites"
        count={favoriteCount}
        active={isSameFilter(filter, { kind: 'favorites' })}
        onClick={() => onFilterChange({ kind: 'favorites' })}
      />
      <Pill
        label="Recent"
        active={isSameFilter(filter, { kind: 'recent' })}
        onClick={() => onFilterChange({ kind: 'recent' })}
      />

      {collections.map((collection) => (
        <CollectionPill
          key={collection.id}
          collection={collection}
          count={items.filter((i) => i.collectionId === collection.id).length}
          active={isSameFilter(filter, { kind: 'collection', collectionId: collection.id })}
          onSelect={() => onFilterChange({ kind: 'collection', collectionId: collection.id })}
          onRename={(name) => onRenameCollection(collection.id, name)}
          onDelete={() => onDeleteCollection(collection.id)}
        />
      ))}

      {isCreating ? (
        <form
          className="unline-filterbar__new-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitNewCollection();
          }}
        >
          <input
            autoFocus
            aria-label="New collection name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={submitNewCollection}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsCreating(false);
                setDraftName('');
              }
            }}
            placeholder="Collection name"
          />
        </form>
      ) : (
        <button type="button" className="unline-pill unline-pill--dashed" onClick={() => setIsCreating(true)}>
          + New Collection
        </button>
      )}
    </nav>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="unline-pill" data-active={active || undefined} onClick={onClick}>
      {label}
      {typeof count === 'number' && count > 0 && <span className="unline-pill__count">{count}</span>}
    </button>
  );
}

function CollectionPill({
  collection,
  count,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  collection: Collection;
  count: number;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(collection.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isRenaming) {
    return (
      <form
        className="unline-filterbar__new-form"
        onSubmit={(e) => {
          e.preventDefault();
          onRename(name.trim() || collection.name);
          setIsRenaming(false);
        }}
      >
        <input
          autoFocus
          aria-label={`Rename ${collection.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            onRename(name.trim() || collection.name);
            setIsRenaming(false);
          }}
          onKeyDown={(e) => e.key === 'Escape' && setIsRenaming(false)}
        />
      </form>
    );
  }

  return (
    <span className="unline-pill unline-pill--collection-wrap">
      <button type="button" className="unline-pill__label" data-active={active || undefined} onClick={onSelect}>
        📁 {collection.name}
        {count > 0 && <span className="unline-pill__count">{count}</span>}
      </button>
      <details className="unline-tile-menu">
        <summary className="unline-icon-btn unline-icon-btn--xs" aria-label={`More actions for ${collection.name}`}>
          ⋯
        </summary>
        <div className="unline-tile-menu__panel" role="menu">
          <button type="button" role="menuitem" onClick={() => setIsRenaming(true)}>
            Rename
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
      </details>
      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete "${collection.name}"?`}
          description={
            count > 0
              ? `${count} text item${count === 1 ? '' : 's'} will move to Uncategorized. They will not be deleted.`
              : 'This collection is empty and can be safely removed.'
          }
          confirmLabel="Delete collection"
          danger
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </span>
  );
}
