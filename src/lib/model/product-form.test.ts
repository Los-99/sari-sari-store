import { describe, expect, it } from 'vitest';
import { emptyForm, formFromProduct, formsEqual, readForm, type ProductFormValues } from './product-form';
import type { Product } from './product';

function filled(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    ...emptyForm(),
    name: 'Lucky Me Pancit Canton',
    category: 'Noodles',
    unit: 'pack',
    cost: '14',
    selling: '16.50',
    stock: '12',
    threshold: '5',
    ...overrides,
  };
}

describe('readForm', () => {
  it('turns typed text into product fields', () => {
    const result = readForm(filled({ barcode: ' 0480 ' }), true);
    expect(result).toEqual({
      ok: true,
      fields: {
        name: 'Lucky Me Pancit Canton',
        barcode: '0480',
        category: 'Noodles',
        unit: 'pack',
        costPriceCentavos: 1400,
        sellingPriceCentavos: 1650,
        stockQuantity: 12,
        lowStockThreshold: 5,
        isActive: true,
      },
    });
  });

  it('shows each problem under the right box', () => {
    const result = readForm(filled({ name: '', cost: '', selling: 'abc', stock: '-1', threshold: '2.5', unit: '' }), true);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(
      ['cost', 'name', 'selling', 'stock', 'threshold', 'unit'].sort(),
    );
  });

  it('a new empty form is not valid until name and prices are filled', () => {
    const result = readForm(emptyForm(), true);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['cost', 'name', 'selling'].sort());
  });

  it('keeps the active status it is given', () => {
    const result = readForm(filled(), false);
    expect(result.ok && result.fields.isActive).toBe(false);
  });
});

describe('form helpers', () => {
  it('a scanned barcode is pre-filled', () => {
    expect(emptyForm('4801981116072').barcode).toBe('4801981116072');
  });

  it('a saved product reads back as the same form', () => {
    const product: Product = {
      id: 1,
      name: 'Bear Brand 33g',
      category: 'Beverages',
      unit: 'sachet',
      costPriceCentavos: 1100,
      sellingPriceCentavos: 1300,
      stockQuantity: 2,
      lowStockThreshold: 5,
      isActive: true,
      createdAt: 0,
      updatedAt: 0,
    };
    const form = formFromProduct(product);
    expect(form).toMatchObject({ barcode: '', cost: '11.00', selling: '13.00', stock: '2' });
    const result = readForm(form, true);
    expect(result.ok && result.fields.sellingPriceCentavos).toBe(1300);
  });

  it('notices changes', () => {
    expect(formsEqual(filled(), filled())).toBe(true);
    expect(formsEqual(filled(), filled({ selling: '17' }))).toBe(false);
  });
});
