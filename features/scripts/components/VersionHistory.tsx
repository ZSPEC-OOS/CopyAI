'use client';

import { useState } from 'react';
import type { TextVersion } from '../types';
import { formatRelativeDate, previewOf } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';

interface VersionHistoryProps {
  versions: TextVersion[];
  onRestore: (versionId: string) => void;
  onClose: () => void;
}

export function VersionHistory({ versions, onRestore, onClose }: VersionHistoryProps) {
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const pending = versions.find((v) => v.id === pendingRestoreId) ?? null;

  return (
    <div className="scripts-version-history">
      <header className="scripts-version-history__header">
        <h2>Version history</h2>
        <button type="button" className="scripts-icon-btn" aria-label="Close version history" onClick={onClose}>
          ×
        </button>
      </header>

      {versions.length === 0 ? (
        <EmptyState icon="🕘" title="No history yet" description="Versions are created each time you save a meaningful change." />
      ) : (
        <ol className="scripts-version-history__list">
          {versions.map((version, index) => (
            <li key={version.id} className="scripts-version-history__item">
              <div className="scripts-version-history__meta">
                <span className="scripts-version-history__title">
                  {version.title} {index === 0 && <em>(current)</em>}
                </span>
                <time dateTime={version.createdAt}>{formatRelativeDate(version.createdAt)}</time>
              </div>
              <p className="scripts-version-history__preview">{previewOf(version.cleanedText, 160)}</p>
              {index !== 0 && (
                <button type="button" className="scripts-btn scripts-btn--sm" onClick={() => setPendingRestoreId(version.id)}>
                  Restore this version
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {pending && (
        <ConfirmDialog
          title="Restore this version?"
          description="The current text will be replaced with this version's content. A new version is created, so nothing is lost."
          confirmLabel="Restore"
          onConfirm={() => {
            onRestore(pending.id);
            setPendingRestoreId(null);
          }}
          onCancel={() => setPendingRestoreId(null)}
        />
      )}
    </div>
  );
}
