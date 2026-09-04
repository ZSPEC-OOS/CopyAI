// Core domain types for the Unline text-cleanup module.
// This module is self-contained: nothing here is imported by the rest
// of the CopyAI app, and nothing outside features/unline or app/unline
// should need to import CopyAI internals.

export type ID = string;

export interface TransformOptions {
  flattenLines: boolean;
  trimSpaces: boolean;
  normalizeSpaces: boolean;
  preserveParagraphs: boolean;
}

export const DEFAULT_TRANSFORM_OPTIONS: TransformOptions = {
  flattenLines: true,
  trimSpaces: true,
  normalizeSpaces: true,
  preserveParagraphs: false,
};

export interface TransformResult {
  text: string;
  inputLineCount: number;
  outputParagraphCount: number;
  wordCount: number;
  characterCount: number;
}

export interface Collection {
  id: ID;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TextVersion {
  id: ID;
  textItemId: ID;
  title: string;
  originalText: string;
  cleanedText: string;
  createdAt: string;
}

export interface TextItem {
  id: ID;
  collectionId: ID | null;
  title: string;
  originalText: string;
  cleanedText: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  transformOptions: TransformOptions;
  wordCount: number;
  characterCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Draft {
  id: ID;
  textItemId: ID | null;
  title: string;
  originalText: string;
  cleanedText: string;
  transformOptions: TransformOptions;
  updatedAt: string;
}

export type LibraryFilter =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'recent' }
  | { kind: 'collection'; collectionId: ID };

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

/** Hard limits, documented in the README, enforced at the storage boundary. */
export const LIMITS = {
  MAX_SOURCE_CHARS: 200_000,
  MAX_TITLE_CHARS: 200,
  MAX_TAG_CHARS: 40,
  MAX_TAGS_PER_ITEM: 20,
  MAX_VERSIONS_PER_ITEM: 50,
} as const;
