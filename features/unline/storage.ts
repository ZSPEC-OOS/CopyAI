// Browser-only persistence for Unline. There is no backend: this module is
// the entire "server" — a validated, size-limited localStorage repository
// with a tiny pub-sub layer so React components can subscribe to changes
// via useSyncExternalStore. Keeping persistence here (not in components)
// is what makes the transform/version/collection logic independently
// testable and keeps storage swappable later (e.g. for a real API) without
// touching the UI.

import { countCharacters, countWords } from './transform';
import {
  DEFAULT_TRANSFORM_OPTIONS,
  LIMITS,
  type Collection,
  type Draft,
  type ID,
  type TextItem,
  type TextVersion,
  type TransformOptions,
} from './types';
import { clamp, generateId, nowISO } from './utils';

// All keys are namespaced by the signed-in profile's Firebase uid, set via
// setNamespace() before this module is read. This is what gives each
// CopyAI profile its own Unline library with no crossover — switching
// profiles switches the entire keyspace, not just the visible data.
let namespace = '_unauthenticated';

export function setNamespace(next: string): void {
  if (next === namespace) return;
  namespace = next;
  invalidateSnapshot();
}

export function getNamespace(): string {
  return namespace;
}

const KEYS = {
  items: () => `unline:v1:${namespace}:items`,
  collections: () => `unline:v1:${namespace}:collections`,
  versions: () => `unline:v1:${namespace}:versions`,
  draft: () => `unline:v1:${namespace}:draft`,
} as const;

const UNCATEGORIZED_ID = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    // Corrupted or foreign data in this key must never crash the app.
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Most likely quota exceeded; surface to caller instead of throwing
    // deep inside a render path.
    console.error('[unline] failed to persist', key, err);
    throw new StorageError('Could not save — local storage is full or unavailable.');
  }
}

export class StorageError extends Error {}

// ---------------------------------------------------------------------------
// Pub-sub so components can re-render via useSyncExternalStore.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface DataSnapshot {
  items: TextItem[];
  collections: Collection[];
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value between notifications (or it re-renders forever), and — for
// SSR — a distinct, equally stable getServerSnapshot so the server-rendered
// HTML and the client's first hydration pass agree (there is no
// localStorage on the server, so hydration must render as if it were also
// empty; only the callback fired below the fold, after hydration, is
// allowed to swap in the real data).
const EMPTY_SNAPSHOT: DataSnapshot = { items: [], collections: [] };
let cachedSnapshot: DataSnapshot | null = null;

function invalidateSnapshot(): void {
  cachedSnapshot = null;
  listeners.forEach((listener) => listener());
}

export function getDataSnapshot(): DataSnapshot {
  if (!cachedSnapshot) {
    cachedSnapshot = { items: loadItems(), collections: loadCollections() };
  }
  return cachedSnapshot;
}

export function getServerSnapshot(): DataSnapshot {
  return EMPTY_SNAPSHOT;
}

// ---------------------------------------------------------------------------
// Validation / sanitization at the storage boundary.
// ---------------------------------------------------------------------------

function sanitizeTitle(title: string): string {
  const trimmed = title.trim();
  return clamp(trimmed.length > 0 ? trimmed : 'Untitled', LIMITS.MAX_TITLE_CHARS);
}

function sanitizeSourceText(text: string): string {
  return clamp(text, LIMITS.MAX_SOURCE_CHARS);
}

function sanitizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of tags) {
    const tag = clamp(raw.trim(), LIMITS.MAX_TAG_CHARS);
    if (tag.length === 0) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(tag);
    if (cleaned.length >= LIMITS.MAX_TAGS_PER_ITEM) break;
  }
  return cleaned;
}

function isTextItem(value: unknown): value is TextItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.originalText === 'string' &&
    typeof v.cleanedText === 'string' &&
    Array.isArray(v.tags)
  );
}

function isCollection(value: unknown): value is Collection {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string';
}

// ---------------------------------------------------------------------------
// Text items
// ---------------------------------------------------------------------------

function loadItems(): TextItem[] {
  return readJSON<unknown[]>(KEYS.items(), []).filter(isTextItem);
}

function persistItems(items: TextItem[]): void {
  writeJSON(KEYS.items(), items);
  invalidateSnapshot();
}

export function listItems(): TextItem[] {
  return loadItems();
}

export function getItem(id: ID): TextItem | undefined {
  return loadItems().find((item) => item.id === id);
}

export interface CreateTextItemInput {
  title: string;
  originalText: string;
  cleanedText: string;
  transformOptions: TransformOptions;
  collectionId?: ID | null;
  tags?: string[];
}

export function createTextItem(input: CreateTextItemInput): TextItem {
  const originalText = sanitizeSourceText(input.originalText);
  const cleanedText = sanitizeSourceText(input.cleanedText);
  const timestamp = nowISO();

  const item: TextItem = {
    id: generateId(),
    collectionId: input.collectionId ?? UNCATEGORIZED_ID,
    title: sanitizeTitle(input.title),
    originalText,
    cleanedText,
    tags: sanitizeTags(input.tags ?? []),
    isFavorite: false,
    isPinned: false,
    transformOptions: input.transformOptions,
    wordCount: countWords(cleanedText),
    characterCount: countCharacters(cleanedText),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const items = loadItems();
  persistItems([item, ...items]);
  createVersion(item);
  return item;
}

export interface UpdateTextItemInput {
  title?: string;
  cleanedText?: string;
  originalText?: string;
  transformOptions?: TransformOptions;
  collectionId?: ID | null;
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
}

/**
 * Updates a text item. Creates a new version when the title or cleaned
 * text meaningfully changes (i.e. not for favorite/pin/collection-only
 * updates), per the "save creates a version on content change" rule.
 */
export function updateTextItem(id: ID, patch: UpdateTextItemInput): TextItem {
  const items = loadItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new StorageError('Text item not found.');
  const current = items[index];

  const nextTitle = patch.title !== undefined ? sanitizeTitle(patch.title) : current.title;
  const nextCleaned =
    patch.cleanedText !== undefined ? sanitizeSourceText(patch.cleanedText) : current.cleanedText;
  const nextOriginal =
    patch.originalText !== undefined
      ? sanitizeSourceText(patch.originalText)
      : current.originalText;

  const contentChanged = nextTitle !== current.title || nextCleaned !== current.cleanedText;

  const updated: TextItem = {
    ...current,
    title: nextTitle,
    cleanedText: nextCleaned,
    originalText: nextOriginal,
    transformOptions: patch.transformOptions ?? current.transformOptions,
    collectionId: patch.collectionId !== undefined ? patch.collectionId : current.collectionId,
    tags: patch.tags !== undefined ? sanitizeTags(patch.tags) : current.tags,
    isFavorite: patch.isFavorite ?? current.isFavorite,
    isPinned: patch.isPinned ?? current.isPinned,
    wordCount: countWords(nextCleaned),
    characterCount: countCharacters(nextCleaned),
    updatedAt: nowISO(),
  };

  const next = [...items];
  next[index] = updated;
  persistItems(next);

  if (contentChanged) {
    createVersion(updated);
  }

  return updated;
}

export function deleteTextItem(id: ID): void {
  persistItems(loadItems().filter((item) => item.id !== id));
  const versions = loadVersions().filter((v) => v.textItemId !== id);
  writeJSON(KEYS.versions(), versions);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

function loadCollections(): Collection[] {
  return readJSON<unknown[]>(KEYS.collections(), []).filter(isCollection);
}

function persistCollections(collections: Collection[]): void {
  writeJSON(KEYS.collections(), collections);
  invalidateSnapshot();
}

export function listCollections(): Collection[] {
  return loadCollections().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createCollection(name: string, description?: string): Collection {
  const collections = loadCollections();
  const timestamp = nowISO();
  const collection: Collection = {
    id: generateId(),
    name: sanitizeTitle(name),
    description: description?.trim() || null,
    sortOrder: collections.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  persistCollections([...collections, collection]);
  return collection;
}

export function renameCollection(id: ID, name: string): void {
  const collections = loadCollections().map((c) =>
    c.id === id ? { ...c, name: sanitizeTitle(name), updatedAt: nowISO() } : c
  );
  persistCollections(collections);
}

export function reorderCollections(orderedIds: ID[]): void {
  const collections = loadCollections();
  const byId = new Map(collections.map((c) => [c.id, c]));
  const reordered = orderedIds
    .map((id, index) => {
      const c = byId.get(id);
      return c ? { ...c, sortOrder: index } : null;
    })
    .filter((c): c is Collection => c !== null);
  persistCollections(reordered);
}

/** Deleting a collection never deletes its items — they move to Uncategorized. */
export function deleteCollection(id: ID): void {
  persistCollections(loadCollections().filter((c) => c.id !== id));
  const items = loadItems().map((item) =>
    item.collectionId === id ? { ...item, collectionId: UNCATEGORIZED_ID } : item
  );
  persistItems(items);
}

export function collectionItemCount(id: ID): number {
  return loadItems().filter((item) => item.collectionId === id).length;
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

function loadVersions(): TextVersion[] {
  return readJSON<TextVersion[]>(KEYS.versions(), []);
}

function createVersion(item: TextItem): TextVersion {
  const versions = loadVersions();
  const version: TextVersion = {
    id: generateId(),
    textItemId: item.id,
    title: item.title,
    originalText: item.originalText,
    cleanedText: item.cleanedText,
    createdAt: nowISO(),
  };

  const itemVersions = versions.filter((v) => v.textItemId === item.id);
  const otherVersions = versions.filter((v) => v.textItemId !== item.id);
  const trimmed = [version, ...itemVersions].slice(0, LIMITS.MAX_VERSIONS_PER_ITEM);

  writeJSON(KEYS.versions(), [...otherVersions, ...trimmed]);
  return version;
}

export function listVersions(textItemId: ID): TextVersion[] {
  return loadVersions()
    .filter((v) => v.textItemId === textItemId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Restoring a version creates a new current version rather than deleting history. */
export function restoreVersion(versionId: ID): TextItem {
  const version = loadVersions().find((v) => v.id === versionId);
  if (!version) throw new StorageError('Version not found.');
  return updateTextItem(version.textItemId, {
    title: version.title,
    originalText: version.originalText,
    cleanedText: version.cleanedText,
  });
}

// ---------------------------------------------------------------------------
// Draft (unsaved editor state, recovered after refresh)
// ---------------------------------------------------------------------------

export function getDraft(): Draft | null {
  return readJSON<Draft | null>(KEYS.draft(), null);
}

export function saveDraft(draft: Omit<Draft, 'updatedAt'>): void {
  const value: Draft = { ...draft, updatedAt: nowISO() };
  writeJSON(KEYS.draft(), value);
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEYS.draft());
}

export function createEmptyDraft(): Draft {
  return {
    id: generateId(),
    textItemId: null,
    title: '',
    originalText: '',
    cleanedText: '',
    transformOptions: DEFAULT_TRANSFORM_OPTIONS,
    updatedAt: nowISO(),
  };
}
