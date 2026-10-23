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

const MONTHS: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Converts a date as the files write it (day, month name, two-digit year)
 * to the standard YYYY-MM-DD form, which sorts correctly as text.
 *
 *   "27-Feb-26"  →  "2026-02-27"
 *   "5-Jul-25"   →  "2025-07-05"    days below 10 have no leading zero
 *
 * Throws on any other shape, an unknown month name, or a date that doesn't
 * exist, such as 31-Feb-26.
 */
export function parseDate(text: string): string {
  if (!/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(text)) {
    throw new Error(`Unrecognized date: "${text}"`);
  }

  const [dayText = '', monthName = '', yearText = ''] = text.split('-');
  const month = MONTHS.indexOf(monthName) + 1;
  if (month === 0) {
    throw new Error(`Unknown month in date: "${text}"`);
  }
  const year = 2000 + Number(yearText);
  const day = Number(dayText);

  // Let JavaScript's calendar decide which dates exist. Date.UTC quietly turns
  // Feb 31 into Mar 3, so a date that comes back different didn't exist.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`No such date: "${text}"`);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Splits one line of a file, with its line ending already removed, into
 * its fields.
 *
 *   'a,"1,2",b'  →  ['a', '1,2', 'b']
 *
 * In these files quotes only ever wrap a whole field: the 58 April refunds
 * of $1,000 or more, like " $(1,234.56)". The full CSV standard also allows
 * doubled quotes and line breaks inside a quoted field. The files never use
 * them, so any other quote throws instead of being guessed at.
 */
export function splitLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  // Where we are in the current field. After a closing quote, only a comma
  // or the end of the line may come.
  let state: 'unquoted' | 'quoted' | 'closed' = 'unquoted';

  for (const char of line) {
    if (state === 'quoted') {
      if (char === '"') {
        state = 'closed';
      } else {
        field += char;
      }
    } else if (char === ',') {
      fields.push(field);
      field = '';
      state = 'unquoted';
    } else if (state === 'closed') {
      throw new Error(`Text after a closing quote: ${line}`);
    } else if (char === '"') {
      if (field !== '') {
        throw new Error(`Quote in the middle of a field: ${line}`);
      }
      state = 'quoted';
    } else {
      field += char;
    }
  }

  if (state === 'quoted') {
    throw new Error(`Line ends inside quotes: ${line}`);
  }
  fields.push(field);
  return fields;
}
