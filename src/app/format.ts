// How numbers, money and dates are written everywhere on the page.

import { WEEKS_IN_YEAR } from '../engine/prepare.ts';

const FIRST_DAY = Date.UTC(2025, 6, 1);
const DAY_MS = 86_400_000;

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const cents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

const MINUS = '−';

/** "$1,234.56", or "−$12.00" for a refund. */
export function money(amountCents: number): string {
  const sign = amountCents < 0 ? MINUS : '';
  return `${sign}$${cents.format(Math.abs(amountCents) / 100)}`;
}

/** "$2,500" for whole dollars, "$2,500.50" otherwise. Used for rule thresholds. */
export function threshold(amountCents: number): string {
  return amountCents % 100 === 0 ? `$${whole.format(amountCents / 100)}` : money(amountCents);
}

/** "$17.0M", "$812K", "$4,560". */
export function compactMoney(amountCents: number): string {
  const dollars = Math.abs(amountCents) / 100;
  const sign = amountCents < 0 ? MINUS : '';
  if (dollars >= 999_500) {
    return `${sign}$${oneDecimal.format(dollars / 1_000_000)}M`;
  }
  if (dollars >= 10_000) {
    return `${sign}$${whole.format(dollars / 1_000)}K`;
  }
  return `${sign}$${whole.format(dollars)}`;
}

/** "1,234". */
export function count(n: number): string {
  return whole.format(n);
}

/** "12.9K" from ten thousand up, "1,234" below. */
export function compactCount(n: number): string {
  return Math.abs(n) >= 10_000 ? `${oneDecimal.format(n / 1_000)}K` : whole.format(n);
}

/** A yearly total as a weekly rate: one decimal below 10, whole numbers above. */
export function perWeek(yearlyTotal: number): string {
  const rate = yearlyTotal / WEEKS_IN_YEAR;
  return rate < 10 && rate !== 0 ? oneDecimal.format(rate) : whole.format(rate);
}

/** "50.1%". */
export function percent(fraction: number): string {
  return `${oneDecimal.format(fraction * 100)}%`;
}

/** Prefixes a formatted difference with + or −, or returns "No change". */
export function signed(difference: number, format: (value: number) => string): string {
  if (difference === 0) {
    return 'No change';
  }
  return `${difference > 0 ? '+' : MINUS}${format(Math.abs(difference))}`;
}

/** Day 0 is Jul 1, 2025. */
export function dateOf(day: number): Date {
  return new Date(FIRST_DAY + day * DAY_MS);
}

/** "Jun 30". */
export function shortDay(day: number): string {
  return shortDate.format(dateOf(day));
}

/** "Tue, Jun 30, 2026". */
export function longDay(day: number): string {
  return longDate.format(dateOf(day));
}

/** "Jul 1 – Jul 7" for week 0. The last week of the year runs eight days. */
export function weekRange(week: number): string {
  const first = week * 7;
  const last = week === 51 ? 364 : first + 6;
  return `${shortDay(first)} – ${shortDay(last)}`;
}

/** "Jul" for a week's first day. */
export function monthOfWeek(week: number): string {
  return monthName.format(dateOf(week * 7));
}
