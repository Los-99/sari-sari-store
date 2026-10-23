import { describe, expect, it } from 'vitest';
import { parseRoute, paths, tabFor } from './routes';

describe('parseRoute', () => {
  it('opens the dashboard for an empty address', () => {
    expect(parseRoute('')).toEqual({ name: 'dashboard' });
    expect(parseRoute('#')).toEqual({ name: 'dashboard' });
    expect(parseRoute('#/')).toEqual({ name: 'dashboard' });
  });

  it('recognises the main tabs', () => {
    expect(parseRoute('#/products')).toEqual({ name: 'products' });
    expect(parseRoute('#/scan')).toEqual({ name: 'scan' });
    expect(parseRoute('#/inventory')).toEqual({ name: 'inventory' });
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
  });

  it('reads product ids', () => {
    expect(parseRoute('#/products/12')).toEqual({ name: 'product-detail', id: 12 });
    expect(parseRoute('#/products/12/edit')).toEqual({ name: 'product-edit', id: 12 });
  });

  it('rejects invalid product ids', () => {
    expect(parseRoute('#/products/0')).toEqual({ name: 'not-found' });
    expect(parseRoute('#/products/-3')).toEqual({ name: 'not-found' });
    expect(parseRoute('#/products/abc')).toEqual({ name: 'not-found' });
    expect(parseRoute('#/products/1.5')).toEqual({ name: 'not-found' });
    expect(parseRoute('#/products/12/delete')).toEqual({ name: 'not-found' });
  });

  it('keeps leading zeros in a scanned barcode', () => {
    expect(parseRoute(`#${paths.productNew('0012345678905')}`)).toEqual({
      name: 'product-new',
      barcode: '0012345678905',
    });
  });

  it('ignores an empty barcode', () => {
    expect(parseRoute('#/products/new?barcode=')).toEqual({ name: 'product-new' });
    expect(parseRoute('#/products/new')).toEqual({ name: 'product-new' });
  });

  it('shows not-found for unknown addresses', () => {
    expect(parseRoute('#/sales')).toEqual({ name: 'not-found' });
  });
});

describe('tabFor', () => {
  it('highlights Products for every product screen', () => {
    expect(tabFor({ name: 'product-new' })).toBe('products');
    expect(tabFor({ name: 'product-detail', id: 1 })).toBe('products');
    expect(tabFor({ name: 'product-edit', id: 1 })).toBe('products');
  });
});
