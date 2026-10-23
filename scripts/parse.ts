// Turns the text in the state's CSV files into typed values. Every function
// here takes text and returns a value, with no file access, so each one is
// easy to test on its own.

/**
 * Converts an AMOUNT cell to integer cents, without ever going through a
 * floating-point number.
 *
 *   "25.000000000…"  →    2500    most files pad amounts with ~50 zeros
 *   "-189.98"        →  -18998
 *   "13724."         → 1372400
 *   "$(1,234.56)"    → -123456    April 2026 writes refunds like an accountant
 *
 * Throws on anything else, including fractions of a cent, so a surprise in
 * the data stops the import instead of being guessed at.
 */
export function parseAmount(text: string): number {
  let value = text.trim();
  let sign = 1;

  if (value.startsWith('$(') && value.endsWith(')')) {
    value = value.slice(2, -1).replaceAll(',', '');
    sign = -1;
  } else if (value.startsWith('-')) {
    value = value.slice(1);
    sign = -1;
  }

  if (!/^\d+(\.\d*)?$/.test(value)) {
    throw new Error(`Unrecognized amount: "${text}"`);
  }

  const [dollars = '', decimals = ''] = value.split('.');
  if (/[^0]/.test(decimals.slice(2))) {
    throw new Error(`Amount has a fraction of a cent: "${text}"`);
  }
  const cents = Number(dollars) * 100 + Number(decimals.slice(0, 2).padEnd(2, '0'));
  return sign * cents;
}
