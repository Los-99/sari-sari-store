import { describe, expect, it } from 'vitest';
import type { ProductFields } from '../model/product';
import { nameKey, normalizeBarcode, parseWholeNumber, sellingBelowCost, validateProduct } from './validation';

function product(overrides: Partial<ProductFields> = {}): ProductFields {
  return {
    name: 'Coke Mismo 290ml',
    barcode: '4801981116072',
    category: 'Beverages',
    costPriceCentavos: 1650,
    sellingPriceCentavos: 2000,
    stockQuantity: 24,
    unit: 'bottle',
    lowStockThreshold: 5,
    isActive: true,
    ...overrides,
  };
}

describe('validateProduct', () => {
  it('accepts a complete product', () => {
    const result = validateProduct(product());
    expect(result.ok).toBe(true);
  });

  it('cleans up text', () => {
    const result = validateProduct(product({ name: '  Lucky Me   Pancit  Canton ', category: '  ', unit: ' pack ' }));
    expect(result.ok && result.value).toMatchObject({
      name: 'Lucky Me Pancit Canton',
      category: 'Others',
      unit: 'pack',
    });
  });

  it('removes an empty barcode completely, so many products can have none', () => {
    for (const barcode of [undefined, '', '   ']) {
      const result = validateProduct(product({ barcode }));
      expect(result.ok).toBe(true);
      expect(result.ok && 'barcode' in result.value).toBe(false);
    }
  });

  it('keeps leading zeros in barcodes', () => {
    const result = validateProduct(product({ barcode: ' 0012345678905 ' }));
    expect(result.ok && result.value.barcode).toBe('0012345678905');
  });

  it('reports every broken rule at once', () => {
    const result = validateProduct(
      product({
        name: ' ',
        barcode: '123 456',
        unit: '',
        costPriceCentavos: -1,
        sellingPriceCentavos: 12.5,
        stockQuantity: -3,
        lowStockThreshold: 100_000,
      }),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(
      ['barcode', 'costPriceCentavos', 'lowStockThreshold', 'name', 'sellingPriceCentavos', 'stockQuantity', 'unit'].sort(),
    );
  });

  it('rejects names and barcodes that are too long', () => {
    expect(validateProduct(product({ name: 'x'.repeat(81) })).ok).toBe(false);
    expect(validateProduct(product({ name: 'x'.repeat(80) })).ok).toBe(true);
    expect(validateProduct(product({ barcode: '1'.repeat(65) })).ok).toBe(false);
  });

  it('rejects prices above ₱999,999.99', () => {
    expect(validateProduct(product({ sellingPriceCentavos: 100_000_000 })).ok).toBe(false);
    expect(validateProduct(product({ sellingPriceCentavos: 99_999_999 })).ok).toBe(true);
  });

  it('allows zero stock and a zero alert (alert turned off)', () => {
    expect(validateProduct(product({ stockQuantity: 0, lowStockThreshold: 0 })).ok).toBe(true);
  });
});

describe('parseWholeNumber', () => {
  it('reads whole numbers', () => {
    expect(parseWholeNumber(' 24 ', 'stock')).toEqual({ ok: true, value: 24 });
    expect(parseWholeNumber('1,200', 'stock')).toEqual({ ok: true, value: 1200 });
    expect(parseWholeNumber('0', 'stock')).toEqual({ ok: true, value: 0 });
  });

  it('rejects everything else', () => {
    expect(parseWholeNumber('', 'stock')).toMatchObject({ ok: false, error: 'Please enter the stock.' });
    expect(parseWholeNumber('-2', 'stock')).toMatchObject({ ok: false, error: "Stock can't be negative." });
    expect(parseWholeNumber('2.5', 'stock')).toMatchObject({ ok: false, error: 'Stock must be a whole number.' });
    expect(parseWholeNumber('100000', 'stock')).toMatchObject({ ok: false });
  });
});

describe('helpers', () => {
  it('matches names regardless of capitals and spaces', () => {
    expect(nameKey('  Lucky ME  pancit canton')).toBe(nameKey('Lucky Me Pancit Canton'));
  });

  it('treats a blank barcode as no barcode', () => {
    expect(normalizeBarcode('  ')).toBeUndefined();
    expect(normalizeBarcode(' 0480 ')).toBe('0480');
  });

  it('warns when selling below cost', () => {
    expect(sellingBelowCost({ costPriceCentavos: 1000, sellingPriceCentavos: 900 })).toBe(true);
    expect(sellingBelowCost({ costPriceCentavos: 1000, sellingPriceCentavos: 1000 })).toBe(false);
  });
});
