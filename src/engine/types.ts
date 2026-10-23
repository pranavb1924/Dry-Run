// The shape of one year of card spend, as the engine sees it.
//
// Transactions are stored column by column: row i of every array is one
// transaction. A row takes 15 bytes, so the full year (416,939 transactions)
// is about 6.3 MB and copies to a Web Worker in one step.
//
// Text lives once in the lookup tables on Dataset; the columns hold indexes.

export interface Transactions {
  /** Number of rows. Every column has this length. */
  readonly count: number;
  /** Purchase date as days since Jul 1, 2025 (0 to 364). */
  readonly day: Uint16Array;
  /** Day of the week of the purchase, 0 = Sunday to 6 = Saturday, as in Date.getUTCDay(). */
  readonly weekday: Uint8Array;
  /** Index into Dataset.cardholders. */
  readonly cardholder: Uint16Array;
  /** Index into Dataset.merchants. */
  readonly merchant: Uint16Array;
  /** Index into Dataset.categories. */
  readonly category: Uint8Array;
  /** Index into Dataset.mccs. */
  readonly mcc: Uint16Array;
  /** Amount in integer US cents. Negative for a refund. */
  readonly amountCents: Int32Array;
  /** 1 if the transaction has a real item description, 0 if it only says "GENERAL PURCHASE". */
  readonly described: Uint8Array;
}

export interface Cardholder {
  /** A made-up name. Real names never leave the importer. */
  readonly name: string;
  /** Index into Dataset.agencies. Approval load is counted per agency. */
  readonly agency: number;
}

export interface Dataset {
  readonly transactions: Transactions;
  readonly cardholders: readonly Cardholder[];
  /** State agency names. */
  readonly agencies: readonly string[];
  /** Cleaned merchant names, with brand variants merged so all Amazon purchases share one name. */
  readonly merchants: readonly string[];
  /** The spend groups rules are written against, such as "Travel" or "Meals". */
  readonly categories: readonly string[];
  /** The original merchant category code descriptions. */
  readonly mccs: readonly string[];
}
