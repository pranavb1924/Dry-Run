import { describe, expect, test } from 'vitest';
import { parseAmount, parseDate, splitLine } from './parse.ts';

describe('parseAmount', () => {
  test('reads every plain amount shape in the files as integer cents', () => {
    expect(parseAmount('25.000000000000000000000000000000000000000000000000000')).toBe(2500);
    expect(parseAmount('-189.98')).toBe(-18998);
    expect(parseAmount('-393.5')).toBe(-39350);
    expect(parseAmount('-641')).toBe(-64100);
    expect(parseAmount('13724.')).toBe(1372400);
  });

  test('reads accounting-style refunds as negative', () => {
    expect(parseAmount('$(121.52)')).toBe(-12152);
    expect(parseAmount('$(1,234.56)')).toBe(-123456);
  });

  test('ignores the spaces April 2026 puts around amounts', () => {
    expect(parseAmount(' 42.10 ')).toBe(4210);
  });

  test('is exact where floating point is not', () => {
    // 4.35 * 100 is 434.99999999999994 in JavaScript.
    expect(parseAmount('4.35')).toBe(435);
  });

  test('rejects fractions of a cent', () => {
    expect(() => parseAmount('1.005')).toThrow('fraction of a cent');
  });

  test('rejects any shape it does not recognize', () => {
    for (const text of ['', 'abc', '$1.00', '1,234.56', '.5', '--5', '$(-5.00)', '1.2.3']) {
      expect(() => parseAmount(text), text).toThrow('Unrecognized amount');
    }
  });
});

describe('parseDate', () => {
  test('reads both day styles in the files', () => {
    expect(parseDate('27-Feb-26')).toBe('2026-02-27');
    expect(parseDate('5-Jul-25')).toBe('2025-07-05');
  });

  test('knows every month name', () => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(names.map((name) => parseDate(`1-${name}-26`))).toEqual([
      '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01',
      '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
    ]);
  });

  test('knows which years are leap years', () => {
    expect(parseDate('29-Feb-24')).toBe('2024-02-29');
    expect(() => parseDate('29-Feb-26')).toThrow('No such date');
  });

  test('rejects dates that do not exist', () => {
    for (const text of ['31-Feb-26', '31-Apr-26', '0-Jan-26', '32-Jan-26']) {
      expect(() => parseDate(text), text).toThrow('No such date');
    }
  });

  test('rejects month names it does not know', () => {
    for (const text of ['27-FEB-26', '27-feb-26', '27-Foo-26']) {
      expect(() => parseDate(text), text).toThrow('Unknown month');
    }
  });

  test('rejects any shape it does not recognize', () => {
    for (const text of ['', '27/02/26', '2026-02-27', '27-Feb-2026', '27-Sept-26', ' 27-Feb-26', '127-Feb-26']) {
      expect(() => parseDate(text), text).toThrow('Unrecognized date');
    }
  });
});

describe('splitLine', () => {
  test('splits a plain line at its commas', () => {
    expect(splitLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  test('keeps a comma inside quotes as part of the field and drops the quotes', () => {
    expect(splitLine('GENERAL PURCHASE," $(1,234.56)",OFFICE DEPOT')).toEqual([
      'GENERAL PURCHASE',
      ' $(1,234.56)',
      'OFFICE DEPOT',
    ]);
    expect(splitLine('"1,2",b')).toEqual(['1,2', 'b']);
    expect(splitLine('a,"1,2"')).toEqual(['a', '1,2']);
  });

  test('keeps empty fields', () => {
    expect(splitLine('a,,b')).toEqual(['a', '', 'b']);
    expect(splitLine('a,b,')).toEqual(['a', 'b', '']);
  });

  test('rejects a quote in the middle of a field', () => {
    expect(() => splitLine('a,b"c')).toThrow('Quote in the middle of a field');
  });

  test('rejects text after a closing quote, including a doubled quote', () => {
    expect(() => splitLine('"1,2"x,b')).toThrow('Text after a closing quote');
    expect(() => splitLine('"12"" pipe",b')).toThrow('Text after a closing quote');
  });

  test('rejects a line that ends inside quotes', () => {
    expect(() => splitLine('a,"1,2')).toThrow('Line ends inside quotes');
  });
});
