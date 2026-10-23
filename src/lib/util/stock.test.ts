import { describe, expect, it } from 'vitest';
import type { Product } from '../model/product';
import { stockStatus, summarizeStock } from './stock';

function product(stockQuantity: number, lowStockThreshold: number, isActive = true): Product {
  return {
    id: 1,
    name: 'Test',
    category: 'Others',
    costPriceCentavos: 0,
    sellingPriceCentavos: 0,
    stockQuantity,
    unit: 'piece',
    lowStockThreshold,
    isActive,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('stockStatus', () => {
  it('is "out" at zero', () => {
    expect(stockStatus(product(0, 5))).toBe('out');
    expect(stockStatus(product(0, 0))).toBe('out');
  });

  it('is "low" at or below the alert number', () => {
    expect(stockStatus(product(1, 5))).toBe('low');
    expect(stockStatus(product(5, 5))).toBe('low');
  });

  it('is "ok" above the alert number, or when the alert is off', () => {
    expect(stockStatus(product(6, 5))).toBe('ok');
    expect(stockStatus(product(1, 0))).toBe('ok');
  });
});

describe('summarizeStock', () => {
  it('counts only active products', () => {
    expect(
      summarizeStock([product(10, 5), product(3, 5), product(0, 5), product(0, 5, false), product(2, 5, false)]),
    ).toEqual({ active: 3, low: 1, out: 1 });
  });

  it('handles an empty store', () => {
    expect(summarizeStock([])).toEqual({ active: 0, low: 0, out: 0 });
  });
});
