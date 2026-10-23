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

/** One transaction as the state recorded it, with every field trimmed. */
export interface SourceRow {
  /** Five digits. */
  readonly agencyNumber: string;
  readonly agencyName: string;
  readonly lastName: string;
  readonly firstInitial: string;
  /** ITEM_DESCR. Often just "GENERAL PURCHASE". */
  readonly description: string;
  /** Negative for a refund. */
  readonly amountCents: number;
  readonly merchant: string;
  /** MCC_DESCRIPTION, the merchant category. */
  readonly mcc: string;
  /** TRANSACTION_DATE as YYYY-MM-DD. */
  readonly purchaseDate: string;
}

/**
 * Reads the full text of one monthly file into rows, purchases outside our
 * year included.
 *
 * Columns are found by name, because Jul–Sep 2025 add a ROWID column and
 * April 2026 pads the AMOUNT header. Every field is trimmed: agency numbers
 * often carry a leading space that would otherwise make each agency appear
 * twice. Errors name the line they happened on.
 */
export function parseFile(text: string): SourceRow[] {
  // The September 2026 file starts with an invisible byte order mark. The
  // trim() of the header below would remove it too; this says so out loud.
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.at(-1) === '') {
    lines.pop();
  }
  const [headerLine = '', ...dataLines] = lines;
  const header = splitLine(headerLine).map((name) => name.trim());

  // Find every column up front, so a missing one fails before any row is read.
  const index = (name: string): number => {
    const i = header.indexOf(name);
    if (i === -1) {
      throw new Error(`Missing column: ${name}`);
    }
    return i;
  };
  const columns = {
    agencyNumber: index('AGENCYNBR'),
    agencyName: index('AGENCYNAME'),
    lastName: index('LAST_NAME'),
    firstInitial: index('FIRST_INITIAL'),
    description: index('ITEM_DESCR'),
    amount: index('AMOUNT'),
    merchant: index('MERCHANT'),
    mcc: index('MCC_DESCRIPTION'),
    purchaseDate: index('TRANSACTION_DATE'),
  };

  return dataLines.map((line, i): SourceRow => {
    try {
      const fields = splitLine(line).map((field) => field.trim());
      if (fields.length !== header.length) {
        throw new Error(`Expected ${header.length} fields, found ${fields.length}`);
      }
      // The length check above means every column exists; ?? '' is only for TypeScript.
      const get = (column: number): string => fields[column] ?? '';
      return {
        agencyNumber: get(columns.agencyNumber),
        agencyName: get(columns.agencyName),
        lastName: get(columns.lastName),
        firstInitial: get(columns.firstInitial),
        description: get(columns.description),
        amountCents: parseAmount(get(columns.amount)),
        merchant: get(columns.merchant),
        mcc: get(columns.mcc),
        purchaseDate: parseDate(get(columns.purchaseDate)),
      };
    } catch (error) {
      // The header is line 1, so dataLines[i] is line i + 2.
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`line ${i + 2}: ${message}`, { cause: error });
    }
  });
}
