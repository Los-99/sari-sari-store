import type { Product } from '../model/product';
import { stockStatus } from './stock';

/**
 * Search, filter and sort for the Products list. Everything runs on the
 * phone, on products already loaded from the database, so it works offline
 * and is instant even with thousands of products.
 */

export type StockFilter = 'all' | 'low' | 'out' | 'attention';
export type SortOrder = 'name' | 'price-low' | 'price-high' | 'stock-low' | 'stock-high';

export interface ProductQuery {
  /** Typed in the search box: part of a name, or part of a barcode. */
  text: string;
  /** Show only this category; null = all categories. */
  category: string | null;
  stock: StockFilter;
  sort: SortOrder;
  showInactive: boolean;
}

export const DEFAULT_QUERY: ProductQuery = {
  text: '',
  category: null,
  stock: 'all',
  sort: 'name',
  showInactive: false,
};

export const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  all: 'All stock levels',
  attention: 'Low or out of stock',
  low: 'Low stock',
  out: 'Out of stock',
};

export const SORT_LABELS: Record<SortOrder, string> = {
  name: 'Name (A–Z)',
  'price-low': 'Price (lowest first)',
  'price-high': 'Price (highest first)',
  'stock-low': 'Stock (fewest first)',
  'stock-high': 'Stock (most first)',
};

/** True when the search box or a filter narrows the list (sorting doesn't count). */
export function isFiltered(query: ProductQuery): boolean {
  return query.text.trim() !== '' || query.category !== null || query.stock !== 'all';
}

/** Lowercase, single spaces, and accents removed, so "pina" finds "Piña". */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function filterProducts(products: readonly Product[], query: ProductQuery): Product[] {
  const words = searchKey(query.text).split(' ').filter(Boolean);
  const barcodeText = query.text.trim();

  const matches = products.filter((product) => {
    if (!query.showInactive && !product.isActive) return false;
    if (query.category !== null && product.category !== query.category) return false;

    if (query.stock !== 'all') {
      const status = stockStatus(product);
      if (query.stock === 'low' && status !== 'low') return false;
      if (query.stock === 'out' && status !== 'out') return false;
      if (query.stock === 'attention' && status === 'ok') return false;
    }

    if (words.length > 0) {
      // Every typed word must appear somewhere in the name, in any order...
      const name = searchKey(product.name);
      const nameMatches = words.every((word) => name.includes(word));
      // ...or the typed text is part of the barcode.
      const barcodeMatches = product.barcode !== undefined && product.barcode.includes(barcodeText);
      if (!nameMatches && !barcodeMatches) return false;
    }
    return true;
  });

  return matches.sort(comparator(query.sort));
}

/** Categories that at least one product uses, A to Z. */
export function categoriesInUse(products: readonly Product[]): string[] {
  return [...new Set(products.map((product) => product.category))].sort(byName);
}

// ---------------------------------------------------------------------------
// Saving the search in the screen address (e.g. "#/products?stock=low"), so
// the Back button returns to the same results and Home can link to them.

export function queryFromParams(params: URLSearchParams): ProductQuery {
  const stock = params.get('stock');
  const sort = params.get('sort');
  const category = params.get('category')?.trim();
  return {
    text: params.get('q') ?? '',
    category: category ? category : null,
    stock: stock !== null && Object.hasOwn(STOCK_FILTER_LABELS, stock) ? (stock as StockFilter) : 'all',
    sort: sort !== null && Object.hasOwn(SORT_LABELS, sort) ? (sort as SortOrder) : 'name',
    showInactive: params.get('inactive') === '1',
  };
}

/** Only settings that differ from the defaults are written, to keep addresses short. */
export function queryToParams(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.text !== '') params.set('q', query.text);
  if (query.category !== null) params.set('category', query.category);
  if (query.stock !== 'all') params.set('stock', query.stock);
  if (query.sort !== 'name') params.set('sort', query.sort);
  if (query.showInactive) params.set('inactive', '1');
  return params.toString();
}

// ---------------------------------------------------------------------------

function byName(a: string, b: string): number {
  return a.localeCompare(b, 'en-PH', { sensitivity: 'base', numeric: true });
}

function comparator(sort: SortOrder): (a: Product, b: Product) => number {
  const nameOrder = (a: Product, b: Product) => byName(a.name, b.name) || a.id - b.id;
  switch (sort) {
    case 'name':
      return nameOrder;
    case 'price-low':
      return (a, b) => a.sellingPriceCentavos - b.sellingPriceCentavos || nameOrder(a, b);
    case 'price-high':
      return (a, b) => b.sellingPriceCentavos - a.sellingPriceCentavos || nameOrder(a, b);
    case 'stock-low':
      return (a, b) => a.stockQuantity - b.stockQuantity || nameOrder(a, b);
    case 'stock-high':
      return (a, b) => b.stockQuantity - a.stockQuantity || nameOrder(a, b);
  }
}
