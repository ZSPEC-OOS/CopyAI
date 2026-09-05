'use client';

import type { Collection, LibraryFilter, TextItem } from '../types';
import { DropZone } from './DropZone';
import { EmptyState } from './EmptyState';
import { TextTile } from './TextTile';

interface LibraryProps {
  items: TextItem[];
  totalItemCount: number;
  collections: Collection[];
  filter: LibraryFilter;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onDropText: (text: string) => void;
  onDropRejected: (reason: string) => void;
  onOpenItem: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onNewText: () => void;
}

function emptyStateFor(filter: LibraryFilter, hasSearch: boolean, totalItemCount: number) {
  if (hasSearch) {
    return { icon: '🔍', title: 'No matches', description: 'Try a different search term, tag, or collection name.' };
  }
  if (totalItemCount === 0) {
    return {
      icon: '✂️',
      title: 'No saved text yet',
      description: 'Paste or drop text above, clean it up, and save it as your first reusable tile.',
    };
  }
  switch (filter.kind) {
    case 'favorites':
      return { icon: '★', title: 'No favorites yet', description: 'Star a text item to pin it here for quick access.' };
    case 'recent':
      return { icon: '🕒', title: 'Nothing recent', description: 'Items you create or edit will show up here.' };
    case 'collection':
      return { icon: '📁', title: 'This collection is empty', description: 'Move or save text items into it from the editor.' };
    default:
      return { icon: '📄', title: 'No text items', description: 'Paste or drop text above to get started.' };
  }
}

export function Library({
  items,
  totalItemCount,
  collections,
  filter,
  searchQuery,
  viewMode,
  onViewModeChange,
  onDropText,
  onDropRejected,
  onOpenItem,
  onTogglePin,
  onToggleFavorite,
  onDeleteItem,
  onNewText,
}: LibraryProps) {
  const collectionById = new Map(collections.map((c) => [c.id, c]));
  const empty = emptyStateFor(filter, searchQuery.trim().length > 0, totalItemCount);

  return (
    <section className="unline-library" aria-label="Text library">
      <DropZone onText={onDropText} onRejected={onDropRejected} />

      <div className="unline-library__toolbar">
        <span className="unline-library__count">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        <div className="unline-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            aria-pressed={viewMode === 'grid'}
            onClick={() => onViewModeChange('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
          >
            List
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={
            totalItemCount === 0 && (
              <button type="button" className="unline-btn unline-btn--primary" onClick={onNewText}>
                + New Text
              </button>
            )
          }
        />
      ) : (
        <div className={`unline-tile-grid unline-tile-grid--${viewMode}`}>
          {items.map((item) => (
            <TextTile
              key={item.id}
              item={item}
              collection={item.collectionId ? collectionById.get(item.collectionId) : undefined}
              onOpen={onOpenItem}
              onTogglePin={onTogglePin}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}
