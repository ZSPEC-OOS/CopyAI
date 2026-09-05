'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import * as storage from '../storage';
import { unlineActions } from '../useUnlineStore';
import { countCharacters, countWords, transformText } from '../transform';
import {
  DEFAULT_TRANSFORM_OPTIONS,
  LIMITS,
  type Collection,
  type Draft,
  type SaveStatus,
  type TextItem,
  type TransformOptions,
} from '../types';
import { debounce, generateId } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { VersionHistory } from './VersionHistory';
import { useTextItemVersions } from '../useUnlineStore';

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

const OPTION_LABELS: { key: keyof TransformOptions; label: string }[] = [
  { key: 'flattenLines', label: 'Flatten Lines' },
  { key: 'trimSpaces', label: 'Trim Spaces' },
  { key: 'normalizeSpaces', label: 'Normalize Spaces' },
  { key: 'preserveParagraphs', label: 'Preserve Paragraphs' },
];

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { item, initialDraft, collections, onClose, onSaved, onDeleted },
  ref
) {
  // A recovered draft represents unsaved edits newer than whatever is on the
  // item (useDraftRecovery already checked draft.updatedAt > item.updatedAt),
  // so its fields take priority over the last-saved item state.
  const draftIdRef = useRef(initialDraft?.id ?? generateId());
  const [title, setTitle] = useState(initialDraft?.title ?? item?.title ?? '');
  const [originalText, setOriginalText] = useState(initialDraft?.originalText ?? item?.originalText ?? '');
  const [cleanedText, setCleanedText] = useState(initialDraft?.cleanedText ?? item?.cleanedText ?? '');
  const [transformOptions, setTransformOptions] = useState<TransformOptions>(
    initialDraft?.transformOptions ?? item?.transformOptions ?? DEFAULT_TRANSFORM_OPTIONS
  );
  const [collectionId, setCollectionId] = useState<string | null>(item?.collectionId ?? null);
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [isPinned, setIsPinned] = useState(item?.isPinned ?? false);
  const [manualEdit, setManualEdit] = useState(() => {
    if (!initialDraft) return false;
    const freshTransform = transformText(initialDraft.originalText, initialDraft.transformOptions).text;
    return initialDraft.cleanedText !== freshTransform;
  });
  const [pendingOptions, setPendingOptions] = useState<TransformOptions | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [currentItem, setCurrentItem] = useState<TextItem | null>(item);

  const versions = useTextItemVersions(currentItem?.id ?? null);
  const { state: copyState, copy: copyToClipboard } = useCopyFeedback();

  // Only recomputed from the source text + options, not from every
  // keystroke in the editable cleaned-text field.
  const lastTransformStats = useMemo(
    () => transformText(originalText, transformOptions),
    [originalText, transformOptions]
  );

  const wordCount = countWords(cleanedText);
  const characterCount = countCharacters(cleanedText);

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
    cleanedText !== savedSnapshotRef.current.cleanedText ||
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
      originalText,
      cleanedText,
      transformOptions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, originalText, cleanedText, transformOptions, isDirty]);

  const applyTransform = useCallback(
    (options: TransformOptions) => {
      const result = transformText(originalText, options);
      setCleanedText(result.text);
      setTransformOptions(options);
      setManualEdit(false);
    },
    [originalText]
  );

  const handleOptionToggle = (key: keyof TransformOptions) => {
    const next = { ...transformOptions, [key]: !transformOptions[key] };
    if (manualEdit && cleanedText.trim().length > 0) {
      setPendingOptions(next);
    } else {
      applyTransform(next);
    }
  };

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      let saved: TextItem;
      if (currentItem) {
        saved = unlineActions.updateTextItem(currentItem.id, {
          title,
          originalText,
          cleanedText,
          transformOptions,
          collectionId,
          tags,
          isFavorite,
          isPinned,
        });
      } else {
        saved = unlineActions.createTextItem({
          title: title || 'Untitled',
          originalText,
          cleanedText,
          transformOptions,
          collectionId,
          tags,
        });
        if (isFavorite || isPinned) {
          saved = unlineActions.updateTextItem(saved.id, { isFavorite, isPinned });
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
  }, [currentItem, title, originalText, cleanedText, transformOptions, collectionId, tags, isFavorite, isPinned, onSaved]);

  const handleCopy = useCallback(() => {
    copyToClipboard(cleanedText);
  }, [copyToClipboard, cleanedText]);

  useImperativeHandle(ref, () => ({ save: handleSave, copy: handleCopy }), [handleSave, handleCopy]);

  const addTagFromInput = () => {
    const value = tagInput.trim().slice(0, LIMITS.MAX_TAG_CHARS);
    if (value && !tags.some((t) => t.toLowerCase() === value.toLowerCase()) && tags.length < LIMITS.MAX_TAGS_PER_ITEM) {
      setTags([...tags, value]);
    }
    setTagInput('');
  };

  return (
    <aside className="unline-editor" aria-label="Text editor">
      <header className="unline-editor__header">
        <input
          className="unline-editor__title"
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          maxLength={LIMITS.MAX_TITLE_CHARS}
        />
        <div className="unline-editor__header-actions">
          <button
            type="button"
            className="unline-icon-btn"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => setIsFavorite((v) => !v)}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button type="button" className="unline-icon-btn" aria-label="Close editor" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <SaveStatusPill status={saveStatus} errorMessage={errorMessage} />

      <div className="unline-editor__body">
        <section className="unline-editor__section">
          <h3>Original text</h3>
          <textarea
            className="unline-editor__original"
            aria-label="Original source text (unedited)"
            value={originalText}
            onChange={(e) => {
              const next = e.target.value;
              setOriginalText(next);
              if (!manualEdit) {
                setCleanedText(transformText(next, transformOptions).text);
              }
            }}
            placeholder="Paste raw text here…"
            rows={6}
          />
        </section>

        <section className="unline-editor__section">
          <div className="unline-editor__transform-summary">
            {lastTransformStats.inputLineCount} line{lastTransformStats.inputLineCount === 1 ? '' : 's'} →{' '}
            {lastTransformStats.outputParagraphCount} paragraph{lastTransformStats.outputParagraphCount === 1 ? '' : 's'}
          </div>
          <div className="unline-editor__options" role="group" aria-label="Transform options">
            {OPTION_LABELS.map(({ key, label }) => (
              <label key={key} className="unline-checkbox">
                <input
                  type="checkbox"
                  checked={transformOptions[key]}
                  onChange={() => handleOptionToggle(key)}
                />
                {label}
              </label>
            ))}
          </div>

          <h3>Cleaned text</h3>
          <textarea
            className="unline-editor__cleaned"
            aria-label="Cleaned, editable text"
            value={cleanedText}
            onChange={(e) => {
              setCleanedText(e.target.value);
              setManualEdit(true);
            }}
            rows={10}
          />
          <div className="unline-editor__stats">
            {wordCount} words · {characterCount} characters
          </div>
        </section>

        <section className="unline-editor__section unline-editor__meta">
          <label className="unline-field">
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

          <label className="unline-field">
            Tags
            <div className="unline-tag-input">
              {tags.map((tag) => (
                <span key={tag} className="unline-chip unline-chip--removable">
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

          <label className="unline-checkbox">
            <input type="checkbox" checked={isPinned} onChange={() => setIsPinned((v) => !v)} />
            Pin to top of library
          </label>
        </section>
      </div>

      <footer className="unline-editor__footer">
        <button
          type="button"
          className={`unline-btn ${copyState === 'copied' ? 'unline-btn--success' : ''}`}
          onClick={handleCopy}
        >
          {copyState === 'copied' ? 'Copied ✓' : 'Copy'}
        </button>
        {currentItem && (
          <button type="button" className="unline-btn" onClick={() => setShowHistory(true)}>
            History{versions.length > 0 ? ` (${versions.length})` : ''}
          </button>
        )}
        {currentItem && (
          <button type="button" className="unline-btn unline-btn--danger-ghost" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}
        <button type="button" className="unline-btn unline-btn--primary" onClick={handleSave}>
          Save
        </button>
      </footer>

      {pendingOptions && (
        <ConfirmDialog
          title="Re-run transform from original?"
          description="You've manually edited the cleaned text. Changing transform settings will regenerate it from the original text and discard those edits."
          confirmLabel="Regenerate"
          danger
          onConfirm={() => {
            applyTransform(pendingOptions);
            setPendingOptions(null);
          }}
          onCancel={() => setPendingOptions(null)}
        />
      )}

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
        <div className="unline-editor__history-overlay">
          <VersionHistory
            versions={versions}
            onClose={() => setShowHistory(false)}
            onRestore={(versionId) => {
              const restored = unlineActions.restoreVersion(versionId);
              setCurrentItem(restored);
              setTitle(restored.title);
              setOriginalText(restored.originalText);
              setCleanedText(restored.cleanedText);
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
    <div className="unline-save-status" data-status={status} role="status">
      {label}
    </div>
  );
}
