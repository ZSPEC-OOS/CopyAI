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
    <div className="unline-version-history">
      <header className="unline-version-history__header">
        <h2>Version history</h2>
        <button type="button" className="unline-icon-btn" aria-label="Close version history" onClick={onClose}>
          ×
        </button>
      </header>

      {versions.length === 0 ? (
        <EmptyState icon="🕘" title="No history yet" description="Versions are created each time you save a meaningful change." />
      ) : (
        <ol className="unline-version-history__list">
          {versions.map((version, index) => (
            <li key={version.id} className="unline-version-history__item">
              <div className="unline-version-history__meta">
                <span className="unline-version-history__title">
                  {version.title} {index === 0 && <em>(current)</em>}
                </span>
                <time dateTime={version.createdAt}>{formatRelativeDate(version.createdAt)}</time>
              </div>
              <p className="unline-version-history__preview">{previewOf(version.cleanedText, 160)}</p>
              {index !== 0 && (
                <button type="button" className="unline-btn unline-btn--sm" onClick={() => setPendingRestoreId(version.id)}>
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
