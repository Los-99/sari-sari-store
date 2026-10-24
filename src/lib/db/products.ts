import type { IDBPTransaction } from 'idb';
import { getDb, type StoreSchema } from './database';
import {
  DuplicateBarcodeError,
  ProductNotFoundError,
  ProductValidationError,
  RestoreError,
  StockChangeError,
} from './errors';
import { LIMITS, SUGGESTED_CATEGORIES, type Product, type ProductFields } from '../model/product';
import type { PhotoChange, ProductPhoto } from '../model/photo';
import { nameKey, normalizeBarcode, validateProduct } from '../util/validation';

/**
 * The product repository: every screen reads and saves products through
 * these functions, so the rules (validation, unique barcodes, timestamps)
 * are applied the same way everywhere.
 */

type WriteStores = ['products', 'photos', 'photoThumbs'];
type ProductTransaction = IDBPTransaction<StoreSchema, WriteStores, 'readwrite'>;
const WRITE_STORES: WriteStores = ['products', 'photos', 'photoThumbs'];

/** Fires after any product or product photo is created or changed, so open screens can refresh. */
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

/** Saves a new product, and its photo if one is given, in one step. */
export async function createProduct(fields: ProductFields, photo: PhotoChange = { kind: 'keep' }): Promise<Product> {
  const value = validOrThrow(fields);
  const product = await writeProducts(async (tx) => {
    await assertBarcodeFree(tx, value.barcode);
    const now = Date.now();
    const record = { ...value, createdAt: now, updatedAt: now } as Product;
    const id = await tx.objectStore('products').add(record);
    await applyPhotoChange(tx, id, photo, now);
    return { ...record, id };
  }, value.barcode);
  announceChange();
  return product;
}

/** Saves changes to a product, and to its photo if asked, in one step. */
export async function updateProduct(
  id: number,
  fields: ProductFields,
  photo: PhotoChange = { kind: 'keep' },
): Promise<Product> {
  const value = validOrThrow(fields);
  const product = await writeProducts(async (tx) => {
    const store = tx.objectStore('products');
    const existing = await store.get(id);
    if (!existing) throw new ProductNotFoundError(id);
    await assertBarcodeFree(tx, value.barcode, id);
    const now = Date.now();
    const updated: Product = { ...value, id, createdAt: existing.createdAt, updatedAt: now };
    await store.put(updated);
    await applyPhotoChange(tx, id, photo, now);
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
// Photos (reading). Saving happens together with the product, above.

/** The small list pictures of all products, by product id. */
export async function listPhotoThumbs(): Promise<Map<number, StoreSchema['photoThumbs']['value']['image']>> {
  const db = await getDb();
  const thumbs = await db.getAll('photoThumbs');
  return new Map(thumbs.map((thumb) => [thumb.productId, thumb.image]));
}

/** A product's small picture with its date (to tell whether it changed), if it has one. */
export async function getPhotoThumb(productId: number) {
  const db = await getDb();
  return db.get('photoThumbs', productId);
}

/** A product's full-size picture with its date (to tell whether it changed), if it has one. */
export async function getPhoto(productId: number) {
  const db = await getDb();
  return db.get('photos', productId);
}

/** Every photo with both sizes, e.g. for a backup. */
export async function listPhotos(): Promise<ProductPhoto[]> {
  const db = await getDb();
  const tx = db.transaction(['photos', 'photoThumbs'], 'readonly');
  const [full, thumbs] = await Promise.all([tx.objectStore('photos').getAll(), tx.objectStore('photoThumbs').getAll()]);
  return joinPhotos(full, thumbs);
}

// ---------------------------------------------------------------------------
// Restore from backup

/** The products and photos as they were just before the last restore, kept so it can be undone. */
export interface RestoreSafetyCopy {
  savedAt: number;
  products: Product[];
  /** Missing in safety copies made before photos existed (version 1.0). */
  photos?: ProductPhoto[];
}

const SAFETY_COPY_KEY = 'restoreSafetyCopy';

/**
 * Replaces ALL products and photos with the given ones (already checked by
 * the backup reader). The current ones are first saved as a safety copy, in
 * the same transaction: either everything happens, or nothing changes.
 */
export async function replaceAllProducts(
  products: readonly Product[],
  photos: readonly ProductPhoto[] = [],
): Promise<void> {
  await writeAll(async (tx) => {
    const current = await tx.objectStore('products').getAll();
    const currentPhotos = joinPhotos(
      await tx.objectStore('photos').getAll(),
      await tx.objectStore('photoThumbs').getAll(),
    );
    const safetyCopy: RestoreSafetyCopy = { savedAt: Date.now(), products: current, photos: currentPhotos };
    await tx.objectStore('meta').put(safetyCopy, SAFETY_COPY_KEY);
    await putEverything(tx, products, photos);
  });
  announceChange();
}

export async function getRestoreSafetyCopy(): Promise<RestoreSafetyCopy | undefined> {
  const db = await getDb();
  return (await db.get('meta', SAFETY_COPY_KEY)) as RestoreSafetyCopy | undefined;
}

/** Puts back the products and photos from before the last restore, then forgets the safety copy. */
export async function undoLastRestore(): Promise<number> {
  let count = 0;
  await writeAll(async (tx) => {
    const safetyCopy = (await tx.objectStore('meta').get(SAFETY_COPY_KEY)) as RestoreSafetyCopy | undefined;
    if (!safetyCopy) throw new RestoreError('There is no restore to undo.');
    await putEverything(tx, safetyCopy.products, safetyCopy.photos ?? []);
    await tx.objectStore('meta').delete(SAFETY_COPY_KEY);
    count = safetyCopy.products.length;
  });
  announceChange();
  return count;
}

// ---------------------------------------------------------------------------

type AllStores = ['products', 'photos', 'photoThumbs', 'meta'];
type AllTransaction = IDBPTransaction<StoreSchema, AllStores, 'readwrite'>;

/** Clears products and photos, then adds the given ones. */
async function putEverything(tx: AllTransaction, products: readonly Product[], photos: readonly ProductPhoto[]) {
  const productStore = tx.objectStore('products');
  const photoStore = tx.objectStore('photos');
  const thumbStore = tx.objectStore('photoThumbs');
  await Promise.all([productStore.clear(), photoStore.clear(), thumbStore.clear()]);
  await Promise.all([
    ...products.map((product) => productStore.put(product)),
    ...photos.flatMap((photo) => [
      photoStore.put({ productId: photo.productId, image: photo.full, updatedAt: photo.updatedAt }),
      thumbStore.put({ productId: photo.productId, image: photo.thumb, updatedAt: photo.updatedAt }),
    ]),
  ]);
}

function joinPhotos(
  full: StoreSchema['photos']['value'][],
  thumbs: StoreSchema['photoThumbs']['value'][],
): ProductPhoto[] {
  const thumbById = new Map(thumbs.map((thumb) => [thumb.productId, thumb.image]));
  return full.flatMap((photo) => {
    const thumb = thumbById.get(photo.productId);
    return thumb ? [{ productId: photo.productId, full: photo.image, thumb, updatedAt: photo.updatedAt }] : [];
  });
}

async function applyPhotoChange(tx: ProductTransaction, productId: number, change: PhotoChange, now: number) {
  if (change.kind === 'keep') return;
  if (change.kind === 'remove') {
    await Promise.all([tx.objectStore('photos').delete(productId), tx.objectStore('photoThumbs').delete(productId)]);
    return;
  }
  await Promise.all([
    tx.objectStore('photos').put({ productId, image: change.full, updatedAt: now }),
    tx.objectStore('photoThumbs').put({ productId, image: change.thumb, updatedAt: now }),
  ]);
}

function validOrThrow(fields: ProductFields): ProductFields {
  const result = validateProduct(fields);
  if (!result.ok) throw new ProductValidationError(result.errors);
  return result.value;
}

async function assertBarcodeFree(tx: ProductTransaction, barcode: string | undefined, ownId?: number) {
  if (barcode === undefined) return;
  const owner = await tx.objectStore('products').index('barcode').get(barcode);
  if (owner && owner.id !== ownId) throw new DuplicateBarcodeError(barcode, owner);
}

/** Reads one product, changes it and saves it, all in one transaction. */
async function changeProduct(id: number, change: (product: Product) => Product): Promise<Product> {
  const product = await writeProducts(async (tx) => {
    const store = tx.objectStore('products');
    const existing = await store.get(id);
    if (!existing) throw new ProductNotFoundError(id);
    const updated = { ...change(existing), id, createdAt: existing.createdAt, updatedAt: Date.now() };
    await store.put(updated);
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
  const tx = db.transaction(WRITE_STORES, 'readwrite');
  try {
    return await runTransaction(tx, () => work(tx));
  } catch (error) {
    // Safety net: the database itself refused a duplicate barcode.
    if (error instanceof DOMException && error.name === 'ConstraintError' && barcode !== undefined) {
      throw new DuplicateBarcodeError(barcode);
    }
    throw error;
  }
}

async function writeAll(work: (tx: AllTransaction) => Promise<void>): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['products', 'photos', 'photoThumbs', 'meta'], 'readwrite');
  await runTransaction(tx, () => work(tx));
}

async function runTransaction<T>(
  tx: { done: Promise<void>; abort(): void },
  work: () => Promise<T>,
): Promise<T> {
  // Errors are reported through `work` below; avoid a second, unhandled report.
  tx.done.catch(() => {});
  try {
    const result = await work();
    await tx.done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Already finished or aborted.
    }
    throw error;
  }
}
