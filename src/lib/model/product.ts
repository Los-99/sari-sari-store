/**
 * The information the store owner enters for a product.
 *
 * Prices are whole centavos (₱12.50 → 1250) so they never suffer from
 * decimal rounding errors. Barcodes are text so leading zeros are kept.
 */
export interface ProductFields {
  name: string;
  /** Missing when the product has no barcode. Never an empty string. */
  barcode?: string;
  category: string;
  costPriceCentavos: number;
  sellingPriceCentavos: number;
  stockQuantity: number;
  unit: string;
  /** Stock at or below this number counts as "low". 0 turns the alert off. */
  lowStockThreshold: number;
  isActive: boolean;
}

/** A product as saved in the database. */
export interface Product extends ProductFields {
  id: number;
  /** Milliseconds since 1 January 1970 (UTC), as returned by Date.now(). */
  createdAt: number;
  updatedAt: number;
}

export const LIMITS = {
  nameMaxLength: 80,
  barcodeMaxLength: 64,
  categoryMaxLength: 40,
  unitMaxLength: 20,
  /** ₱999,999.99 */
  maxPriceCentavos: 99_999_999,
  maxStock: 99_999,
} as const;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const FALLBACK_CATEGORY = 'Others';

export const SUGGESTED_CATEGORIES = [
  'Beverages',
  'Snacks',
  'Noodles',
  'Canned Goods',
  'Condiments',
  'Toiletries',
  'Household',
  'Rice & Grains',
  FALLBACK_CATEGORY,
] as const;

export const SUGGESTED_UNITS = [
  'piece',
  'pack',
  'bottle',
  'sachet',
  'can',
  'box',
  'bar',
  'tie',
] as const;
