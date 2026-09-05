import { describe, expect, it } from 'vitest';
import { listAllTags, searchTextItems, sortLibrary } from './search';
import { DEFAULT_TRANSFORM_OPTIONS } from './types';
import type { TextItem } from './types';

function item(overrides: Partial<TextItem>): TextItem {
  return {
    id: overrides.id ?? Math.random().toString(36),
    collectionId: null,
    title: 'Untitled',
    originalText: '',
    cleanedText: '',
    tags: [],
    isFavorite: false,
    isPinned: false,
    transformOptions: DEFAULT_TRANSFORM_OPTIONS,
    wordCount: 0,
    characterCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('searchTextItems', () => {
  const items = [
    item({ id: '1', title: 'Buffer Prep Notes', cleanedText: 'Mix Tris and EDTA.', tags: ['Lab'] }),
    item({ id: '2', title: 'Client Email', cleanedText: 'Thanks for your patience.', tags: ['Client'] }),
  ];

  it('matches on title', () => {
    expect(searchTextItems(items, [], 'buffer').map((i) => i.id)).toEqual(['1']);
  });

  it('matches on cleaned text', () => {
    expect(searchTextItems(items, [], 'patience').map((i) => i.id)).toEqual(['2']);
  });

  it('matches on tag name', () => {
    expect(searchTextItems(items, [], 'lab').map((i) => i.id)).toEqual(['1']);
  });

  it('returns everything for an empty query', () => {
    expect(searchTextItems(items, [], '   ')).toHaveLength(2);
  });
});

describe('sortLibrary', () => {
  it('sorts pinned items above unpinned, then by most recently updated', () => {
    const items = [
      item({ id: 'a', isPinned: false, updatedAt: '2026-01-03T00:00:00.000Z' }),
      item({ id: 'b', isPinned: true, updatedAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'c', isPinned: false, updatedAt: '2026-01-05T00:00:00.000Z' }),
    ];
    expect(sortLibrary(items).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('listAllTags', () => {
  it('deduplicates and sorts tags', () => {
    const items = [item({ tags: ['Lab', 'SOP'] }), item({ tags: ['sop', 'Template'] })];
    expect(listAllTags(items)).toEqual(['Lab', 'SOP', 'Template']);
  });
});
