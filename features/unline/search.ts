// Pure search/sort helpers, kept separate from storage so they can be
// unit tested without touching localStorage and reused identically by the
// library view and the global search box.

import type { Collection, TextItem } from './types';

export function matchesQuery(item: TextItem, collectionName: string | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    item.cleanedText.toLowerCase().includes(q) ||
    item.originalText.toLowerCase().includes(q) ||
    item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    (collectionName?.toLowerCase().includes(q) ?? false)
  );
}

export function searchTextItems(
  items: TextItem[],
  collections: Collection[],
  query: string
): TextItem[] {
  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));
  return items.filter((item) =>
    matchesQuery(item, item.collectionId ? collectionNameById.get(item.collectionId) : undefined, query)
  );
}

/** Pinned items first, then most-recently-updated first, stable otherwise. */
export function sortLibrary(items: TextItem[]): TextItem[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });
}

export function listAllTags(items: TextItem[]): string[] {
  const seenKeys = new Set<string>();
  const tags: string[] = [];
  for (const item of items) {
    for (const tag of item.tags) {
      const key = tag.toLowerCase();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      tags.push(tag);
    }
  }
  return tags.sort((a, b) => a.localeCompare(b));
}
