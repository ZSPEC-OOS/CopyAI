'use client';

import { useMemo, useRef, useState } from 'react';
import { useDraftRecovery } from '../hooks/useDraftRecovery';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { searchTextItems, sortLibrary } from '../search';
import * as storage from '../storage';
import { transformText } from '../transform';
import { unlineActions, useUnlineData } from '../useUnlineStore';
import { DEFAULT_TRANSFORM_OPTIONS, type Draft, type LibraryFilter, type TextItem } from '../types';
import { generateId } from '../utils';
import { DraftRecoveryBanner } from './DraftRecoveryBanner';
import { DropZone } from './DropZone';
import { Editor, type EditorHandle } from './Editor';
import { FilterBar } from './FilterBar';
import { Header } from './Header';
import { Library } from './Library';

function applyFilter(items: TextItem[], filter: LibraryFilter): TextItem[] {
  switch (filter.kind) {
    case 'favorites':
      return items.filter((i) => i.isFavorite);
    case 'recent':
      return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 30);
    case 'collection':
      return items.filter((i) => i.collectionId === filter.collectionId);
    default:
      return items;
  }
}

type EditorTarget = { kind: 'item'; id: string; draft?: Draft } | { kind: 'new'; draft: Draft } | null;

export function UnlineApp() {
  const { items, collections } = useUnlineData();
  const [filter, setFilter] = useState<LibraryFilter>({ kind: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [editorSessionId, setEditorSessionId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const draftRecovery = useDraftRecovery();

  const visibleItems = useMemo(() => {
    const filtered = applyFilter(items, filter);
    const searched = searchTextItems(filtered, collections, searchQuery);
    return sortLibrary(searched);
  }, [items, collections, filter, searchQuery]);

  const openNewDraft = (rawText = '') => {
    const result = transformText(rawText, DEFAULT_TRANSFORM_OPTIONS);
    const draftId = generateId();
    setEditorSessionId(draftId);
    setEditorTarget({
      kind: 'new',
      draft: {
        id: draftId,
        textItemId: null,
        title: '',
        originalText: rawText,
        cleanedText: result.text,
        transformOptions: DEFAULT_TRANSFORM_OPTIONS,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const closeEditor = () => {
    setEditorTarget(null);
    setEditorSessionId(null);
  };

  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onNew: () => openNewDraft(),
    onSave: () => editorRef.current?.save(),
    onCopy: () => editorRef.current?.copy(),
    onEscape: () => editorTarget && closeEditor(),
  });

  const openItem = (id: string) => {
    setEditorSessionId(id);
    setEditorTarget({ kind: 'item', id });
  };

  const currentItem = editorTarget?.kind === 'item' ? (items.find((i) => i.id === editorTarget.id) ?? null) : null;
  const editorIsStale = editorTarget?.kind === 'item' && !currentItem;

  return (
    <div className="unline-root">
      <Header ref={searchInputRef} searchQuery={searchQuery} onSearchChange={setSearchQuery} onNew={() => openNewDraft()} />

      {draftRecovery.recoverable && (
        <DraftRecoveryBanner
          draft={draftRecovery.recoverable}
          onRestore={() => {
            const draft = draftRecovery.recoverable!;
            setEditorSessionId(draft.textItemId ?? draft.id);
            setEditorTarget(
              draft.textItemId ? { kind: 'item', id: draft.textItemId, draft } : { kind: 'new', draft }
            );
            draftRecovery.dismiss();
          }}
          onDiscard={draftRecovery.discard}
        />
      )}

      {rejectionMessage && (
        <div className="unline-toast unline-toast--error" role="alert">
          {rejectionMessage}
          <button type="button" onClick={() => setRejectionMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <main className="unline-main">
        <DropZone onText={openNewDraft} onRejected={setRejectionMessage} />

        <FilterBar
          collections={collections}
          items={items}
          filter={filter}
          onFilterChange={setFilter}
          onCreateCollection={(name) => unlineActions.createCollection(name)}
          onRenameCollection={(id, name) => unlineActions.renameCollection(id, name)}
          onDeleteCollection={(id) => unlineActions.deleteCollection(id)}
        />

        <Library
          items={visibleItems}
          totalItemCount={items.length}
          collections={collections}
          filter={filter}
          searchQuery={searchQuery}
          onOpenItem={openItem}
          onTogglePin={(id) => {
            const item = storage.getItem(id);
            if (item) unlineActions.updateTextItem(id, { isPinned: !item.isPinned });
          }}
          onToggleFavorite={(id) => {
            const item = storage.getItem(id);
            if (item) unlineActions.updateTextItem(id, { isFavorite: !item.isFavorite });
          }}
          onDeleteItem={(id) => {
            unlineActions.deleteTextItem(id);
            if (editorTarget?.kind === 'item' && editorTarget.id === id) closeEditor();
          }}
          onNewText={() => openNewDraft()}
        />
      </main>

      {editorTarget && !editorIsStale && (
        <div className="unline-editor-overlay" onClick={closeEditor}>
          <div className="unline-editor-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <Editor
              ref={editorRef}
              key={editorSessionId}
              item={currentItem}
              initialDraft={editorTarget.draft ?? null}
              collections={collections}
              onClose={closeEditor}
              onSaved={(saved) => setEditorTarget({ kind: 'item', id: saved.id })}
              onDeleted={closeEditor}
            />
          </div>
        </div>
      )}
    </div>
  );
}
