import type { Product } from '../model/product';

export type StockStatus = 'ok' | 'low' | 'out';

/**
 * - out: no stock left
 * - low: some stock, but at or below the product's low-stock alert number
 * - ok:  everything else (also when the alert is turned off with 0)
 */
export function stockStatus(product: Pick<Product, 'stockQuantity' | 'lowStockThreshold'>): StockStatus {
  if (product.stockQuantity <= 0) return 'out';
  if (product.lowStockThreshold > 0 && product.stockQuantity <= product.lowStockThreshold) return 'low';
  return 'ok';
}

export interface StockSummary {
  active: number;
  low: number;
  out: number;
}

/** Counts for the Dashboard. Deactivated products are not counted. */
export function summarizeStock(products: readonly Product[]): StockSummary {
  const summary: StockSummary = { active: 0, low: 0, out: 0 };
  for (const product of products) {
    if (!product.isActive) continue;
    summary.active += 1;
    const status = stockStatus(product);
    if (status === 'low') summary.low += 1;
    if (status === 'out') summary.out += 1;
  }
  return summary;
}
