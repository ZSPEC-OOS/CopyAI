'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import * as storage from '../storage';
import { scriptsActions, useTextItemVersions } from '../useScriptsStore';
import { countCharacters, countWords } from '../transform';
import {
  DEFAULT_TRANSFORM_OPTIONS,
  LIMITS,
  type Collection,
  type Draft,
  type SaveStatus,
  type TextItem,
} from '../types';
import { debounce, generateId } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { VersionHistory } from './VersionHistory';

export interface EditorHandle {
  save: () => void;
  copy: () => void;
}

interface EditorProps {
  item: TextItem | null;
  initialDraft: Draft | null;
  collections: Collection[];
  onClose: () => void;
  onSaved: (item: TextItem) => void;
  onDeleted: (id: string) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { item, initialDraft, collections, onClose, onSaved, onDeleted },
  ref
) {
  // A recovered draft represents unsaved edits newer than whatever is on the
  // item (useDraftRecovery already checked draft.updatedAt > item.updatedAt),
  // so its fields take priority over the last-saved item state.
  const draftIdRef = useRef(initialDraft?.id ?? generateId());
  const [title, setTitle] = useState(initialDraft?.title ?? item?.title ?? '');
  const [text, setText] = useState(initialDraft?.cleanedText ?? item?.cleanedText ?? '');
  const [collectionId, setCollectionId] = useState<string | null>(item?.collectionId ?? null);
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [isPinned, setIsPinned] = useState(item?.isPinned ?? false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [currentItem, setCurrentItem] = useState<TextItem | null>(item);

  const versions = useTextItemVersions(currentItem?.id ?? null);
  const { state: copyState, copy: copyToClipboard } = useCopyFeedback();

  const wordCount = countWords(text);
  const characterCount = countCharacters(text);

  const savedSnapshotRef = useRef({
    title: item?.title ?? '',
    cleanedText: item?.cleanedText ?? '',
    collectionId: item?.collectionId ?? null,
    tags: item?.tags ?? [],
    isFavorite: item?.isFavorite ?? false,
    isPinned: item?.isPinned ?? false,
  });

  const isDirty =
    title !== savedSnapshotRef.current.title ||
    text !== savedSnapshotRef.current.cleanedText ||
    collectionId !== savedSnapshotRef.current.collectionId ||
    isFavorite !== savedSnapshotRef.current.isFavorite ||
    isPinned !== savedSnapshotRef.current.isPinned ||
    JSON.stringify(tags) !== JSON.stringify(savedSnapshotRef.current.tags);

  useEffect(() => {
    if (isDirty && saveStatus !== 'saving') setSaveStatus('unsaved');
    if (!isDirty && saveStatus === 'unsaved') setSaveStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const persistDraft = useMemo(
    () =>
      debounce((next: Omit<Draft, 'updatedAt'>) => {
        storage.saveDraft(next);
      }, 500),
    []
  );

  useEffect(() => {
    if (!isDirty) return;
    persistDraft({
      id: draftIdRef.current,
      textItemId: currentItem?.id ?? null,
      title,
      originalText: initialDraft?.originalText ?? item?.originalText ?? text,
      cleanedText: text,
      transformOptions: DEFAULT_TRANSFORM_OPTIONS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, text, isDirty]);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      let saved: TextItem;
      if (currentItem) {
        saved = scriptsActions.updateTextItem(currentItem.id, {
          title,
          cleanedText: text,
          collectionId,
          tags,
          isFavorite,
          isPinned,
        });
      } else {
        saved = scriptsActions.createTextItem({
          title: title || 'Untitled',
          originalText: initialDraft?.originalText ?? text,
          cleanedText: text,
          transformOptions: DEFAULT_TRANSFORM_OPTIONS,
          collectionId,
          tags,
        });
        if (isFavorite || isPinned) {
          saved = scriptsActions.updateTextItem(saved.id, { isFavorite, isPinned });
        }
      }
      setCurrentItem(saved);
      savedSnapshotRef.current = {
        title: saved.title,
        cleanedText: saved.cleanedText,
        collectionId: saved.collectionId,
        tags: saved.tags,
        isFavorite: saved.isFavorite,
        isPinned: saved.isPinned,
      };
      setSaveStatus('saved');
      storage.clearDraft();
      onSaved(saved);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Save failed. Please try again.');
    }
  }, [currentItem, title, text, collectionId, tags, isFavorite, isPinned, initialDraft, onSaved]);

  const handleCopy = useCallback(() => {
    copyToClipboard(text);
  }, [copyToClipboard, text]);

  useImperativeHandle(ref, () => ({ save: handleSave, copy: handleCopy }), [handleSave, handleCopy]);

  const addTagFromInput = () => {
    const value = tagInput.trim().slice(0, LIMITS.MAX_TAG_CHARS);
    if (value && !tags.some((t) => t.toLowerCase() === value.toLowerCase()) && tags.length < LIMITS.MAX_TAGS_PER_ITEM) {
      setTags([...tags, value]);
    }
    setTagInput('');
  };

  return (
    <aside className="scripts-editor" aria-label="Text editor">
      <header className="scripts-editor__header">
        <input
          className="scripts-editor__title"
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          maxLength={LIMITS.MAX_TITLE_CHARS}
        />
        <div className="scripts-editor__header-actions">
          <button
            type="button"
            className="scripts-icon-btn"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => setIsFavorite((v) => !v)}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button type="button" className="scripts-icon-btn" aria-label="Close editor" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <SaveStatusPill status={saveStatus} errorMessage={errorMessage} />

      <div className="scripts-editor__body">
        <section className="scripts-editor__section">
          <textarea
            className="scripts-editor__cleaned"
            aria-label="Text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text here…"
            rows={14}
            autoFocus
          />
          <div className="scripts-editor__stats">
            {wordCount} words · {characterCount} characters
          </div>
        </section>

        <section className="scripts-editor__section scripts-editor__meta">
          <label className="scripts-field">
            Collection
            <select
              value={collectionId ?? ''}
              onChange={(e) => setCollectionId(e.target.value || null)}
              aria-label="Collection"
            >
              <option value="">Uncategorized</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="scripts-field">
            Tags
            <div className="scripts-tag-input">
              {tags.map((tag) => (
                <span key={tag} className="scripts-chip scripts-chip--removable">
                  {tag}
                  <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                onBlur={addTagFromInput}
                placeholder="Add tag…"
                aria-label="Add tag"
              />
            </div>
          </label>

          <label className="scripts-checkbox">
            <input type="checkbox" checked={isPinned} onChange={() => setIsPinned((v) => !v)} />
            Pin to top of library
          </label>
        </section>
      </div>

      <footer className="scripts-editor__footer">
        <button
          type="button"
          className={`scripts-btn ${copyState === 'copied' ? 'scripts-btn--success' : ''}`}
          onClick={handleCopy}
        >
          {copyState === 'copied' ? 'Copied ✓' : 'Copy'}
        </button>
        {currentItem && (
          <button type="button" className="scripts-btn" onClick={() => setShowHistory(true)}>
            History{versions.length > 0 ? ` (${versions.length})` : ''}
          </button>
        )}
        {currentItem && (
          <button type="button" className="scripts-btn scripts-btn--danger-ghost" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}
        <button type="button" className="scripts-btn scripts-btn--primary" onClick={handleSave}>
          Save
        </button>
      </footer>

      {confirmingDelete && currentItem && (
        <ConfirmDialog
          title="Delete this text item?"
          description={`"${currentItem.title}" and its version history will be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            storage.deleteTextItem(currentItem.id);
            setConfirmingDelete(false);
            onDeleted(currentItem.id);
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {showHistory && (
        <div className="scripts-editor__history-overlay">
          <VersionHistory
            versions={versions}
            onClose={() => setShowHistory(false)}
            onRestore={(versionId) => {
              const restored = scriptsActions.restoreVersion(versionId);
              setCurrentItem(restored);
              setTitle(restored.title);
              setText(restored.cleanedText);
              savedSnapshotRef.current = {
                title: restored.title,
                cleanedText: restored.cleanedText,
                collectionId: restored.collectionId,
                tags: restored.tags,
                isFavorite: restored.isFavorite,
                isPinned: restored.isPinned,
              };
              setSaveStatus('saved');
              setShowHistory(false);
            }}
          />
        </div>
      )}
    </aside>
  );
});

function SaveStatusPill({ status, errorMessage }: { status: SaveStatus; errorMessage: string | null }) {
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Saved'
        : status === 'unsaved'
          ? 'Unsaved changes'
          : status === 'error'
            ? errorMessage ?? 'Save failed'
            : null;
  if (!label) return null;
  return (
    <div className="scripts-save-status" data-status={status} role="status">
      {label}
    </div>
  );
}
