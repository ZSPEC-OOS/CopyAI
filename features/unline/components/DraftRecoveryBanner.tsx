import type { Draft } from '../types';
import { previewOf } from '../utils';

interface DraftRecoveryBannerProps {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ draft, onRestore, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="unline-draft-banner" role="alert">
      <div>
        <strong>Unsaved draft recovered</strong>
        <p>
          {draft.title || 'Untitled'} — {previewOf(draft.cleanedText || draft.originalText, 90) || 'empty text'}
        </p>
      </div>
      <div className="unline-draft-banner__actions">
        <button type="button" className="unline-btn unline-btn--sm unline-btn--primary" onClick={onRestore}>
          Restore
        </button>
        <button type="button" className="unline-btn unline-btn--sm unline-btn--ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
