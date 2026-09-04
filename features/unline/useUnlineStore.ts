'use client';

// Thin React binding over storage.ts. Storage owns all persistence and
// mutation logic (and already calls notify() on every write); this hook's
// only job is to re-read the current snapshot whenever that happens, via
// useSyncExternalStore, and expose the mutation functions so components
// never touch localStorage directly.

import { useSyncExternalStore } from 'react';
import * as storage from './storage';
import type { DataSnapshot } from './storage';

export type UnlineData = DataSnapshot;

export function useUnlineData(): UnlineData {
  return useSyncExternalStore(storage.subscribe, storage.getDataSnapshot, storage.getServerSnapshot);
}

const EMPTY_VERSIONS: ReturnType<typeof storage.listVersions> = [];

/**
 * Re-reads on every data-snapshot change (any save creates a version).
 * Only ever mounted client-side, inside the already-open Editor, so it
 * carries no hydration risk of its own.
 */
export function useTextItemVersions(textItemId: string | null) {
  useSyncExternalStore(storage.subscribe, storage.getDataSnapshot, storage.getServerSnapshot);
  return textItemId ? storage.listVersions(textItemId) : EMPTY_VERSIONS;
}

export const unlineActions = {
  createTextItem: storage.createTextItem,
  updateTextItem: storage.updateTextItem,
  deleteTextItem: storage.deleteTextItem,
  createCollection: storage.createCollection,
  renameCollection: storage.renameCollection,
  deleteCollection: storage.deleteCollection,
  reorderCollections: storage.reorderCollections,
  restoreVersion: storage.restoreVersion,
};
