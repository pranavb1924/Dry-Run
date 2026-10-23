import { describe, expect, test } from 'vitest';
import { parseAmount } from './parse.ts';

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
