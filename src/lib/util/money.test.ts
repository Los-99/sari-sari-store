import { describe, expect, it } from 'vitest';
import { centavosToInput, formatPeso, parsePeso } from './money';

function value(text: string) {
  const result = parsePeso(text);
  if (!result.ok) throw new Error(`Expected "${text}" to be valid, got: ${result.error}`);
  return result.value;
}

function error(text: string) {
  const result = parsePeso(text);
  if (result.ok) throw new Error(`Expected "${text}" to be rejected, got ${result.value}`);
  return result.error;
}

describe('parsePeso', () => {
  it('reads common ways of typing a price', () => {
    expect(value('12.50')).toBe(1250);
    expect(value('12.5')).toBe(1250);
    expect(value('12')).toBe(1200);
    expect(value('12.')).toBe(1200);
    expect(value('.75')).toBe(75);
    expect(value('0')).toBe(0);
    expect(value('  ₱ 20.00 ')).toBe(2000);
    expect(value('₱1,250.50')).toBe(125050);
    expect(value('007.05')).toBe(705);
  });

  it('never loses a centavo to rounding', () => {
    // 0.1 + 0.2 style problems would show up here with decimal math.
    expect(value('0.29')).toBe(29);
    expect(value('1.15')).toBe(115);
    expect(value('4.35')).toBe(435);
    expect(value('999999.99')).toBe(99_999_999);
  });

  it('rejects invalid prices with a helpful message', () => {
    expect(error('')).toMatch(/enter a price/);
    expect(error('   ')).toMatch(/enter a price/);
    expect(error('-5')).toMatch(/negative/);
    expect(error('12.505')).toMatch(/2 decimal places/);
    expect(error('12,50')).toMatch(/period for centavos/);
    expect(error('abc')).toMatch(/valid price/);
    expect(error('.')).toMatch(/valid price/);
    expect(error('1e3')).toMatch(/valid price/);
    expect(error('1 000')).toMatch(/valid price/);
    expect(error('1000000')).toMatch(/more than ₱999,999.99/);
  });
});

describe('formatPeso', () => {
  it('shows pesos with two centavo digits and thousands commas', () => {
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(5)).toBe('₱0.05');
    expect(formatPeso(1250)).toBe('₱12.50');
    expect(formatPeso(125050)).toBe('₱1,250.50');
    expect(formatPeso(99_999_999)).toBe('₱999,999.99');
    expect(formatPeso(-350)).toBe('-₱3.50');
  });
});

describe('centavosToInput', () => {
  it('turns a saved price back into form text that reads the same', () => {
    expect(centavosToInput(1250)).toBe('12.50');
    expect(centavosToInput(5)).toBe('0.05');
    expect(value(centavosToInput(123456))).toBe(123456);
  });
});
