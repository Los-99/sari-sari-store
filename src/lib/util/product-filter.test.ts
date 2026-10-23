import { describe, expect, it } from 'vitest';
import type { Product } from '../model/product';
import {
  DEFAULT_QUERY,
  categoriesInUse,
  filterProducts,
  isFiltered,
  queryFromParams,
  queryToParams,
  searchKey,
  type ProductQuery,
} from './product-filter';

let nextId = 1;
function product(overrides: Partial<Product>): Product {
  return {
    id: nextId++,
    name: 'Product',
    category: 'Others',
    costPriceCentavos: 0,
    sellingPriceCentavos: 1000,
    stockQuantity: 10,
    unit: 'piece',
    lowStockThreshold: 5,
    isActive: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const coke = product({ name: 'Coke Mismo 290ml', barcode: '4801981116072', category: 'Beverages', sellingPriceCentavos: 2000, stockQuantity: 24 });
const canton = product({ name: 'Lucky Me Pancit Canton', category: 'Noodles', sellingPriceCentavos: 1600, stockQuantity: 3 });
const pina = product({ name: 'Del Monte Piña Juice', barcode: '0048000123', category: 'Beverages', sellingPriceCentavos: 3500, stockQuantity: 0 });
const soap = product({ name: 'Safeguard White 60g', category: 'Toiletries', sellingPriceCentavos: 3200, stockQuantity: 7, isActive: false });
const all = [soap, pina, canton, coke];

function names(query: Partial<ProductQuery>) {
  return filterProducts(all, { ...DEFAULT_QUERY, ...query }).map((p) => p.name);
}

describe('filterProducts', () => {
  it('shows active products A to Z by default', () => {
    expect(names({})).toEqual(['Coke Mismo 290ml', 'Del Monte Piña Juice', 'Lucky Me Pancit Canton']);
  });

  it('can include deactivated products', () => {
    expect(names({ showInactive: true })).toContain('Safeguard White 60g');
  });

  it('searches names by any words, in any order, ignoring capitals and accents', () => {
    expect(names({ text: 'canton' })).toEqual(['Lucky Me Pancit Canton']);
    expect(names({ text: 'CANTON lucky' })).toEqual(['Lucky Me Pancit Canton']);
    expect(names({ text: 'pina' })).toEqual(['Del Monte Piña Juice']);
    expect(names({ text: 'piña' })).toEqual(['Del Monte Piña Juice']);
    expect(names({ text: 'sprite' })).toEqual([]);
  });

  it('searches barcodes, including partial ones and leading zeros', () => {
    expect(names({ text: '4801981116072' })).toEqual(['Coke Mismo 290ml']);
    expect(names({ text: '116072' })).toEqual(['Coke Mismo 290ml']);
    expect(names({ text: '0048' })).toEqual(['Del Monte Piña Juice']);
  });

  it('filters by category', () => {
    expect(names({ category: 'Beverages' })).toEqual(['Coke Mismo 290ml', 'Del Monte Piña Juice']);
  });

  it('filters by stock level', () => {
    expect(names({ stock: 'low' })).toEqual(['Lucky Me Pancit Canton']);
    expect(names({ stock: 'out' })).toEqual(['Del Monte Piña Juice']);
    expect(names({ stock: 'attention' })).toEqual(['Del Monte Piña Juice', 'Lucky Me Pancit Canton']);
  });

  it('combines search and filters', () => {
    expect(names({ text: 'juice', category: 'Beverages', stock: 'out' })).toEqual(['Del Monte Piña Juice']);
    expect(names({ text: 'coke', stock: 'out' })).toEqual([]);
  });

  it('sorts by price and by stock', () => {
    expect(names({ sort: 'price-low' })).toEqual(['Lucky Me Pancit Canton', 'Coke Mismo 290ml', 'Del Monte Piña Juice']);
    expect(names({ sort: 'price-high' })).toEqual(['Del Monte Piña Juice', 'Coke Mismo 290ml', 'Lucky Me Pancit Canton']);
    expect(names({ sort: 'stock-low' })).toEqual(['Del Monte Piña Juice', 'Lucky Me Pancit Canton', 'Coke Mismo 290ml']);
    expect(names({ sort: 'stock-high' })).toEqual(['Coke Mismo 290ml', 'Lucky Me Pancit Canton', 'Del Monte Piña Juice']);
  });

  it('does not change the original list', () => {
    const copy = [...all];
    filterProducts(all, { ...DEFAULT_QUERY, sort: 'price-high' });
    expect(all).toEqual(copy);
  });
});

describe('helpers', () => {
  it('lists the categories in use, once each', () => {
    expect(categoriesInUse(all)).toEqual(['Beverages', 'Noodles', 'Toiletries']);
  });

  it('knows when the list is narrowed', () => {
    expect(isFiltered(DEFAULT_QUERY)).toBe(false);
    expect(isFiltered({ ...DEFAULT_QUERY, sort: 'price-low' })).toBe(false);
    expect(isFiltered({ ...DEFAULT_QUERY, text: ' x ' })).toBe(true);
    expect(isFiltered({ ...DEFAULT_QUERY, stock: 'low' })).toBe(true);
  });

  it('makes search keys', () => {
    expect(searchKey('  Piña   COLADA ')).toBe('pina colada');
  });
});

describe('saving the search in the address', () => {
  it('round-trips every setting', () => {
    const query: ProductQuery = { text: 'coke 1.5L', category: 'Rice & Grains', stock: 'low', sort: 'stock-low', showInactive: true };
    expect(queryFromParams(new URLSearchParams(queryToParams(query)))).toEqual(query);
  });

  it('writes nothing for the defaults', () => {
    expect(queryToParams(DEFAULT_QUERY)).toBe('');
  });

  it('ignores unknown values', () => {
    expect(queryFromParams(new URLSearchParams('stock=lots&sort=random&inactive=yes&category='))).toEqual(DEFAULT_QUERY);
    expect(queryFromParams(new URLSearchParams('stock=constructor&sort=toString'))).toEqual(DEFAULT_QUERY);
  });
});
