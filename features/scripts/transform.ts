// Pure, dependency-free text transform engine.
//
// This is the one place line-break logic is allowed to live. UI components
// must call transformText(); they must never embed their own regex.
//
// Design: transformText never touches non-whitespace characters, so
// punctuation, capitalization, chemical formulas ("H2SO4"), scientific
// notation ("1.0 × 10^-3"), and Unicode units pass through unchanged.

import type { TransformOptions, TransformResult } from './types';

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Collapses runs of spaces/tabs (not newlines) into a single space. */
function collapseInlineWhitespace(line: string): string {
  return line.replace(/[ \t]+/g, ' ');
}

/** Splits on one or more blank (whitespace-only) lines. */
function splitIntoParagraphs(input: string): string[] {
  return input.split(/\n[ \t]*\n+/);
}

export function transformText(input: string, options: TransformOptions): TransformResult {
  const normalized = normalizeLineEndings(input ?? '');
  const inputLineCount = normalized.length === 0 ? 0 : normalized.split('\n').length;

  const processLine = (line: string): string => {
    const trimmed = options.trimSpaces ? line.trim() : line;
    return options.normalizeSpaces ? collapseInlineWhitespace(trimmed) : trimmed;
  };

  let output: string;

  if (!options.flattenLines) {
    // Line breaks are meaningful to the user; clean each line in place only.
    output = normalized.split('\n').map(processLine).join('\n');
  } else if (options.preserveParagraphs) {
    const paragraphs = splitIntoParagraphs(normalized)
      .map((paragraph) =>
        paragraph
          .split('\n')
          .map(processLine)
          .filter((line) => line.length > 0)
          .join(' ')
      )
      .filter((paragraph) => paragraph.length > 0);
    output = paragraphs.join('\n\n');
  } else {
    output = normalized
      .split('\n')
      .map(processLine)
      .filter((line) => line.length > 0)
      .join(' ');
  }

  output = output.trim();

  const outputParagraphCount =
    output.length === 0 ? 0 : output.split(/\n+/).filter((p) => p.length > 0).length;
  const wordCount = output.length === 0 ? 0 : output.split(/\s+/).filter(Boolean).length;
  const characterCount = Array.from(output).length;

  return { text: output, inputLineCount, outputParagraphCount, wordCount, characterCount };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return Array.from(text).length;
}
