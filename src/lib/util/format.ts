import { SUGGESTED_UNITS } from '../model/product';

const PLURALS: Record<string, string> = Object.fromEntries(
  SUGGESTED_UNITS.map((unit) => [unit, /(x|s|ch|sh)$/.test(unit) ? `${unit}es` : `${unit}s`]),
);

/**
 * "24 bottles", "1 bottle". Only the suggested units are made plural;
 * custom units (e.g. "pcs", "kilo") are shown exactly as typed.
 */
export function formatQuantity(quantity: number, unit: string): string {
  const shown = quantity === 1 ? unit : (PLURALS[unit] ?? unit);
  return `${quantity.toLocaleString('en-PH')} ${shown}`;
}

/** "Oct 24, 2026" */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "Oct 24, 2026, 2:30 PM" */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
