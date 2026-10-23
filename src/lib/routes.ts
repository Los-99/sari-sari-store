/**
 * Every screen in the app has an address after the "#" in the URL,
 * e.g. "#/products/12/edit". This file turns those addresses into
 * routes (which screen to show) and back again.
 *
 * Hash addresses are used because they work on GitHub Pages and offline
 * without any server setup.
 */

import { queryFromParams, queryToParams, type ProductQuery } from './util/product-filter';

/** The three lists on the Inventory screen. */
export type InventoryView = 'low' | 'out' | 'all';

export type Route =
  | { name: 'dashboard' }
  | { name: 'products'; query: ProductQuery }
  | { name: 'product-new'; barcode?: string }
  | { name: 'product-detail'; id: number }
  | { name: 'product-edit'; id: number }
  | { name: 'scan' }
  | { name: 'inventory'; view: InventoryView }
  | { name: 'settings' }
  | { name: 'not-found' };

/** The bottom-navigation tab that is highlighted for each screen. */
export type Tab = 'home' | 'products' | 'scan' | 'inventory' | 'settings';

export const paths = {
  dashboard: '/',
  products: '/products',
  productsMatching: (query: ProductQuery) => withQuery('/products', queryToParams(query)),
  productNew: (barcode?: string) =>
    barcode ? `/products/new?barcode=${encodeURIComponent(barcode)}` : '/products/new',
  productDetail: (id: number) => `/products/${id}`,
  productEdit: (id: number) => `/products/${id}/edit`,
  scan: '/scan',
  inventory: '/inventory',
  inventoryView: (view: InventoryView) => (view === 'low' ? '/inventory' : `/inventory?view=${view}`),
  settings: '/settings',
};

function withQuery(path: string, query: string): string {
  return query === '' ? path : `${path}?${query}`;
}

export function parseRoute(hash: string): Route {
  const address = hash.replace(/^#/, '');
  const queryStart = address.indexOf('?');
  const path = queryStart === -1 ? address : address.slice(0, queryStart);
  const query = new URLSearchParams(queryStart === -1 ? '' : address.slice(queryStart + 1));
  const parts = path.split('/').filter((part) => part !== '');

  if (parts.length === 0) return { name: 'dashboard' };

  const [first, second, third] = parts;

  if (parts.length === 1) {
    switch (first) {
      case 'products':
        return { name: 'products', query: queryFromParams(query) };
      case 'scan':
        return { name: 'scan' };
      case 'inventory': {
        const view = query.get('view');
        return { name: 'inventory', view: view === 'out' || view === 'all' ? view : 'low' };
      }
      case 'settings':
        return { name: 'settings' };
    }
  }

  if (first === 'products' && second !== undefined) {
    if (second === 'new' && parts.length === 2) {
      const barcode = query.get('barcode')?.trim();
      return barcode ? { name: 'product-new', barcode } : { name: 'product-new' };
    }

    const id = parseProductId(second);
    if (id !== null) {
      if (parts.length === 2) return { name: 'product-detail', id };
      if (parts.length === 3 && third === 'edit') return { name: 'product-edit', id };
    }
  }

  return { name: 'not-found' };
}

export function tabFor(route: Route): Tab | null {
  switch (route.name) {
    case 'dashboard':
      return 'home';
    case 'products':
    case 'product-new':
    case 'product-detail':
    case 'product-edit':
      return 'products';
    case 'scan':
      return 'scan';
    case 'inventory':
      return 'inventory';
    case 'settings':
      return 'settings';
    case 'not-found':
      return null;
  }
}

function parseProductId(text: string): number | null {
  if (!/^[1-9]\d{0,14}$/.test(text)) return null;
  return Number(text);
}
