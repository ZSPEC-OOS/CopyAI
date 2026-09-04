import { describe, expect, it } from 'vitest';
import { countCharacters, countWords, transformText } from './transform';
import { DEFAULT_TRANSFORM_OPTIONS, type TransformOptions } from './types';

const flatten = (input: string, overrides: Partial<TransformOptions> = {}) =>
  transformText(input, { ...DEFAULT_TRANSFORM_OPTIONS, ...overrides });

describe('transformText', () => {
  it('flattens Unix (LF) line endings into one paragraph', () => {
    const result = flatten('Prepare the sample.\nAdd 10 mL solvent.\nMix for 30 minutes.');
    expect(result.text).toBe('Prepare the sample. Add 10 mL solvent. Mix for 30 minutes.');
    expect(result.inputLineCount).toBe(3);
    expect(result.outputParagraphCount).toBe(1);
  });

  it('flattens Windows (CRLF) line endings', () => {
    const result = flatten('Line one.\r\nLine two.\r\nLine three.');
    expect(result.text).toBe('Line one. Line two. Line three.');
  });

  it('flattens legacy Mac (CR) line endings', () => {
    const result = flatten('Line one.\rLine two.');
    expect(result.text).toBe('Line one. Line two.');
  });

  it('collapses multiple blank lines when not preserving paragraphs', () => {
    const result = flatten('First.\n\n\n\nSecond.\n\nThird.');
    expect(result.text).toBe('First. Second. Third.');
  });

  it('preserves paragraph breaks when preserveParagraphs is true', () => {
    const result = flatten('Para one line one.\nPara one line two.\n\nPara two.', {
      preserveParagraphs: true,
    });
    expect(result.text).toBe('Para one line one. Para one line two.\n\nPara two.');
    expect(result.outputParagraphCount).toBe(2);
  });

  it('collapses tabs used as inline separators', () => {
    const result = flatten('Name\tValue\tUnit');
    expect(result.text).toBe('Name Value Unit');
  });

  it('trims leading spaces from each line', () => {
    const result = flatten('   Indented line one.\n    Indented line two.');
    expect(result.text).toBe('Indented line one. Indented line two.');
  });

  it('trims trailing spaces from each line', () => {
    const result = flatten('Line one.   \nLine two.    ');
    expect(result.text).toBe('Line one. Line two.');
  });

  it('returns empty stats for empty input', () => {
    const result = flatten('');
    expect(result.text).toBe('');
    expect(result.inputLineCount).toBe(0);
    expect(result.outputParagraphCount).toBe(0);
    expect(result.wordCount).toBe(0);
    expect(result.characterCount).toBe(0);
  });

  it('passes single-line input through unchanged (aside from trim)', () => {
    const result = flatten('  A single line of text.  ');
    expect(result.text).toBe('A single line of text.');
    expect(result.outputParagraphCount).toBe(1);
  });

  it('preserves Unicode text and counts characters correctly', () => {
    const result = flatten('café naïve\nrésumé 😀');
    expect(result.text).toBe('café naïve résumé 😀');
    expect(result.characterCount).toBe(countCharacters(result.text));
  });

  it('does not alter scientific notation', () => {
    const result = flatten('The rate constant is\n1.4 × 10^-3 s^-1 at 298 K.');
    expect(result.text).toBe('The rate constant is 1.4 × 10^-3 s^-1 at 298 K.');
  });

  it('does not alter symbols or punctuation', () => {
    const result = flatten('Cost: $12.50 (± 5%)\n-> see note #3 @ 50% yield!');
    expect(result.text).toBe('Cost: $12.50 (± 5%) -> see note #3 @ 50% yield!');
  });

  it('does not alter chemical formulas', () => {
    const result = flatten('Dissolve NaCl in H2O.\nAdd CuSO4·5H2O slowly.');
    expect(result.text).toBe('Dissolve NaCl in H2O. Add CuSO4·5H2O slowly.');
  });

  it('handles very long text without altering content, only breaks', () => {
    const lines = Array.from({ length: 5000 }, (_, i) => `Line number ${i}.`);
    const result = flatten(lines.join('\n'));
    expect(result.text.startsWith('Line number 0. Line number 1.')).toBe(true);
    expect(result.text.endsWith('Line number 4999.')).toBe(true);
    expect(result.inputLineCount).toBe(5000);
    expect(result.wordCount).toBe(countWords(result.text));
  });

  it('keeps line breaks intact when flattenLines is false', () => {
    const result = flatten('Line one.  \n   Line two.', { flattenLines: false });
    expect(result.text).toBe('Line one.\nLine two.');
  });

  it('does not collapse spaces when normalizeSpaces is false', () => {
    const result = flatten('a    b', { normalizeSpaces: false, trimSpaces: false });
    expect(result.text).toBe('a    b');
  });
});

describe('countWords / countCharacters', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('one  two\tthree\nfour')).toBe(4);
    expect(countWords('   ')).toBe(0);
    expect(countWords('')).toBe(0);
  });

  it('counts Unicode characters, not UTF-16 code units', () => {
    expect(countCharacters('abc')).toBe(3);
    expect(countCharacters('😀😀')).toBe(2);
  });
});
