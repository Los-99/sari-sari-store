import type { IDBPTransaction } from 'idb';
import { getDb, type StoreSchema } from './database';
import { DuplicateBarcodeError, ProductNotFoundError, ProductValidationError, StockChangeError } from './errors';
import { LIMITS, SUGGESTED_CATEGORIES, type Product, type ProductFields } from '../model/product';
import { nameKey, normalizeBarcode, validateProduct } from '../util/validation';

/**
 * The product repository: every screen reads and saves products through
 * these functions, so the rules (validation, unique barcodes, timestamps)
 * are applied the same way everywhere.
 */

type ProductTransaction = IDBPTransaction<StoreSchema, ['products'], 'readwrite'>;

/** Fires after any product is created or changed, so open screens can refresh. */
export const productChanges = new EventTarget();

function announceChange() {
  productChanges.dispatchEvent(new Event('change'));
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAll('products');
}

export async function getProduct(id: number): Promise<Product | undefined> {
  const db = await getDb();
  return db.get('products', id);
}

export async function findProductByBarcode(barcode: string): Promise<Product | undefined> {
  const normalized = normalizeBarcode(barcode);
  if (normalized === undefined) return undefined;
  const db = await getDb();
  return db.getFromIndex('products', 'barcode', normalized);
}

/** Other products with the same name (ignoring capitals and extra spaces). Used for a warning only. */
export async function findProductsWithSameName(name: string, excludeId?: number): Promise<Product[]> {
  const key = nameKey(name);
  if (key === '') return [];
  const products = await listProducts();
  return products.filter((product) => product.id !== excludeId && nameKey(product.name) === key);
}

/** Categories already used by products, plus the suggested ones, in A–Z order. */
export async function listCategories(): Promise<string[]> {
  const products = await listProducts();
  const categories = new Set<string>(SUGGESTED_CATEGORIES);
  for (const product of products) categories.add(product.category);
  return [...categories].sort((a, b) => a.localeCompare(b, 'en-PH', { sensitivity: 'base' }));
}

export async function createProduct(fields: ProductFields): Promise<Product> {
  const value = validOrThrow(fields);
  const product = await writeProducts(async (tx) => {
    await assertBarcodeFree(tx, value.barcode);
    const now = Date.now();
    const record = { ...value, createdAt: now, updatedAt: now } as Product;
    const id = await tx.store.add(record);
    return { ...record, id };
  }, value.barcode);
  announceChange();
  return product;
}

export async function updateProduct(id: number, fields: ProductFields): Promise<Product> {
  const value = validOrThrow(fields);
  const product = await writeProducts(async (tx) => {
    const existing = await tx.store.get(id);
    if (!existing) throw new ProductNotFoundError(id);
    await assertBarcodeFree(tx, value.barcode, id);
    const updated: Product = { ...value, id, createdAt: existing.createdAt, updatedAt: Date.now() };
    await tx.store.put(updated);
    return updated;
  }, value.barcode);
  announceChange();
  return product;
}

/** Deactivate (hide) or reactivate a product. Products are never deleted. */
export async function setProductActive(id: number, isActive: boolean): Promise<Product> {
  return changeProduct(id, (product) => ({ ...product, isActive }));
}

/** Set the stock to an exact number, e.g. after counting the shelf. */
export async function setStock(id: number, quantity: number): Promise<Product> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > LIMITS.maxStock) {
    throw new StockChangeError(`Stock must be a whole number from 0 to ${LIMITS.maxStock.toLocaleString('en-PH')}.`);
  }
  return changeProduct(id, (product) => ({ ...product, stockQuantity: quantity }));
}

/** Add to (+) or take from (−) the current stock, e.g. the +1 / −1 buttons. */
export async function adjustStock(id: number, change: number): Promise<Product> {
  if (!Number.isInteger(change)) throw new StockChangeError('Stock changes must be whole numbers.');
  return changeProduct(id, (product) => {
    const quantity = product.stockQuantity + change;
    if (quantity < 0) throw new StockChangeError("Stock can't go below 0.");
    if (quantity > LIMITS.maxStock) throw new StockChangeError('Stock is already at the maximum.');
    return { ...product, stockQuantity: quantity };
  });
}

// ---------------------------------------------------------------------------

function validOrThrow(fields: ProductFields): ProductFields {
  const result = validateProduct(fields);
  if (!result.ok) throw new ProductValidationError(result.errors);
  return result.value;
}

async function assertBarcodeFree(tx: ProductTransaction, barcode: string | undefined, ownId?: number) {
  if (barcode === undefined) return;
  const owner = await tx.store.index('barcode').get(barcode);
  if (owner && owner.id !== ownId) throw new DuplicateBarcodeError(barcode, owner);
}

/** Reads one product, changes it and saves it, all in one transaction. */
async function changeProduct(id: number, change: (product: Product) => Product): Promise<Product> {
  const product = await writeProducts(async (tx) => {
    const existing = await tx.store.get(id);
    if (!existing) throw new ProductNotFoundError(id);
    const updated = { ...change(existing), id, createdAt: existing.createdAt, updatedAt: Date.now() };
    await tx.store.put(updated);
    return updated;
  });
  announceChange();
  return product;
}

/**
 * Runs `work` inside one database transaction: either every change in it
 * is saved, or (if anything fails) none of them are.
 */
async function writeProducts<T>(work: (tx: ProductTransaction) => Promise<T>, barcode?: string): Promise<T> {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  // Errors are reported through `work` below; avoid a second, unhandled report.
  tx.done.catch(() => {});
  try {
    const result = await work(tx);
    await tx.done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Already finished or aborted.
    }
    // Safety net: the database itself refused a duplicate barcode.
    if (error instanceof DOMException && error.name === 'ConstraintError' && barcode !== undefined) {
      throw new DuplicateBarcodeError(barcode);
    }
    throw error;
  }
}
