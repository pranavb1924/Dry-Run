import { describe, expect, test } from 'vitest';
import type { Dataset } from '../engine/types.ts';
import { decodeDataset, encodeDataset } from './format.ts';

const DATASET: Dataset = {
  transactions: {
    count: 3,
    day: Uint16Array.of(0, 1, 364),
    weekday: Uint8Array.of(2, 3, 2),
    cardholder: Uint16Array.of(0, 1, 0),
    merchant: Uint16Array.of(0, 1, 1),
    category: Uint8Array.of(0, 1, 0),
    mcc: Uint16Array.of(0, 0, 1),
    amountCents: Int32Array.of(2500, -12152, 48_684_900),
    described: Uint8Array.of(1, 0, 1),
  },
  cardholders: [
    { name: 'Maria Chen', agency: 0 },
    { name: 'James Ortiz', agency: 1 },
  ],
  agencies: ['Department of Testing', 'Office of Examples'],
  merchants: ['Amazon', 'Grainger'],
  categories: ['Online & retail', 'Industrial & equipment'],
  mccs: ['BOOK STORES', 'INDUSTRIAL SUPPLIES NOT ESLEWHERE CLASSI'],
};

describe('the data file format', () => {
  test('reads back exactly what was written', () => {
    const bytes = encodeDataset(DATASET);
    expect(decodeDataset(bytes.slice().buffer)).toEqual(DATASET);
  });

  test('starts every column at a multiple of 4 bytes', () => {
    const decoded = decodeDataset(encodeDataset(DATASET).slice().buffer);
    for (const array of Object.values(decoded.transactions)) {
      if (ArrayBuffer.isView(array)) {
        expect(array.byteOffset % 4).toBe(0);
      }
    }
  });

  test('rejects a file that is not a data file', () => {
    expect(() => decodeDataset(new TextEncoder().encode('NOPE....').buffer)).toThrow('Not a Dry Run data file');
  });
});
