import { LIMITS } from '../model/product';

/**
 * Peso amounts are stored as whole centavos: ₱12.50 is 1250.
 * Text is converted with string and integer operations only, never with
 * decimal (floating-point) math, so no rounding errors can creep in.
 */

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** Reads a price typed by the user, e.g. "12.50", "₱12.5", "1,250" or "15". */
export function parsePeso(text: string): ParseResult {
  let input = text.trim().replace(/^₱\s*/, '');

  if (input === '') return { ok: false, error: 'Please enter a price.' };
  if (input.startsWith('-')) return { ok: false, error: "Price can't be negative." };

  if (input.includes(',')) {
    // Commas are only allowed as thousands separators: 1,250.50
    if (!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(input)) {
      return { ok: false, error: 'Use a period for centavos, e.g. 12.50' };
    }
    input = input.replace(/,/g, '');
  }

  const match = /^(\d*)(?:\.(\d*))?$/.exec(input);
  if (!match || (match[1] === '' && (match[2] ?? '') === '')) {
    return { ok: false, error: 'Enter a valid price, e.g. 12.50' };
  }

  const pesoDigits = match[1] || '0';
  const centavoDigits = match[2] ?? '';
  if (centavoDigits.length > 2) {
    return { ok: false, error: 'Use at most 2 decimal places, e.g. 12.50' };
  }

  const tooLarge = { ok: false, error: `Price can't be more than ${formatPeso(LIMITS.maxPriceCentavos)}.` } as const;
  if (pesoDigits.replace(/^0+/, '').length > 6) return tooLarge;

  const centavos = Number(pesoDigits) * 100 + Number(centavoDigits.padEnd(2, '0'));
  if (centavos > LIMITS.maxPriceCentavos) return tooLarge;

  return { ok: true, value: centavos };
}

/** 125050 → "₱1,250.50"; -350 → "-₱3.50" */
export function formatPeso(centavos: number): string {
  const sign = centavos < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(centavos));
  const pesos = Math.floor(absolute / 100);
  const cents = absolute % 100;
  return `${sign}₱${groupThousands(pesos)}.${String(cents).padStart(2, '0')}`;
}

/** 1250 → "12.50", for putting a saved price back into a form field. */
export function centavosToInput(centavos: number): string {
  const pesos = Math.floor(centavos / 100);
  const cents = centavos % 100;
  return `${pesos}.${String(cents).padStart(2, '0')}`;
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
