import type { Draft } from '../types';
import { previewOf } from '../utils';

interface DraftRecoveryBannerProps {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ draft, onRestore, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="scripts-draft-banner" role="alert">
      <div>
        <strong>Unsaved draft recovered</strong>
        <p>
          {draft.title || 'Untitled'} — {previewOf(draft.cleanedText || draft.originalText, 90) || 'empty text'}
        </p>
      </div>
      <div className="scripts-draft-banner__actions">
        <button type="button" className="scripts-btn scripts-btn--sm scripts-btn--primary" onClick={onRestore}>
          Restore
        </button>
        <button type="button" className="scripts-btn scripts-btn--sm scripts-btn--ghost" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
