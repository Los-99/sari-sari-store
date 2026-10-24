import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDb } from './database';
import {
  DuplicateBarcodeError,
  ProductNotFoundError,
  ProductValidationError,
  RestoreError,
  StockChangeError,
} from './errors';
import {
  adjustStock,
  createProduct,
  findProductByBarcode,
  findProductsWithSameName,
  getPhoto,
  getPhotoThumb,
  getProduct,
  getRestoreSafetyCopy,
  listCategories,
  listPhotos,
  listPhotoThumbs,
  listProducts,
  replaceAllProducts,
  setProductActive,
  setStock,
  undoLastRestore,
  updateProduct,
} from './products';
import type { ProductFields } from '../model/product';

// These checks use a pretend database that lives only in memory while the
// checks run. The real database on your phone is never touched.

function fields(overrides: Partial<ProductFields> = {}): ProductFields {
  return {
    name: 'Coke Mismo 290ml',
    barcode: '4801981116072',
    category: 'Beverages',
    costPriceCentavos: 1650,
    sellingPriceCentavos: 2000,
    stockQuantity: 24,
    unit: 'bottle',
    lowStockThreshold: 5,
    isActive: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
});

describe('createProduct', () => {
  it('saves a product with an id and timestamps', async () => {
    const saved = await createProduct(fields());
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.createdAt).toBe(saved.updatedAt);
    expect(await getProduct(saved.id)).toEqual(saved);
  });

  it('saves cleaned-up values', async () => {
    const saved = await createProduct(fields({ name: '  Coke   Mismo ', barcode: ' 0480 ' }));
    expect(saved.name).toBe('Coke Mismo');
    expect(saved.barcode).toBe('0480');
  });

  it('refuses invalid products and saves nothing', async () => {
    await expect(createProduct(fields({ name: '', stockQuantity: -1 }))).rejects.toBeInstanceOf(
      ProductValidationError,
    );
    expect(await listProducts()).toHaveLength(0);
  });

  it('refuses a barcode that is already used, and names the owner', async () => {
    const first = await createProduct(fields());
    const attempt = createProduct(fields({ name: 'Something else' }));
    await expect(attempt).rejects.toBeInstanceOf(DuplicateBarcodeError);
    await expect(attempt).rejects.toMatchObject({ existing: { id: first.id } });
    expect(await listProducts()).toHaveLength(1);
  });

  it('allows many products without a barcode', async () => {
    await createProduct(fields({ barcode: undefined, name: 'Ice' }));
    await createProduct(fields({ barcode: '', name: 'Yelo' }));
    await createProduct(fields({ barcode: '  ', name: 'Pandesal' }));
    expect(await listProducts()).toHaveLength(3);
  });

  it('treats barcodes with different leading zeros as different', async () => {
    await createProduct(fields({ barcode: '012345' }));
    await createProduct(fields({ barcode: '12345', name: 'Other' }));
    expect((await findProductByBarcode('012345'))?.name).toBe('Coke Mismo 290ml');
    expect((await findProductByBarcode('12345'))?.name).toBe('Other');
  });
});

describe('updateProduct', () => {
  it('saves changes and keeps the creation date', async () => {
    const saved = await createProduct(fields());
    const updated = await updateProduct(saved.id, fields({ sellingPriceCentavos: 2200 }));
    expect(updated.sellingPriceCentavos).toBe(2200);
    expect(updated.createdAt).toBe(saved.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(saved.updatedAt);
  });

  it('allows keeping its own barcode', async () => {
    const saved = await createProduct(fields());
    await expect(updateProduct(saved.id, fields({ name: 'Renamed' }))).resolves.toMatchObject({ name: 'Renamed' });
  });

  it("refuses another product's barcode and leaves both unchanged", async () => {
    const first = await createProduct(fields());
    const second = await createProduct(fields({ name: 'Sprite', barcode: '111' }));
    await expect(updateProduct(second.id, fields({ name: 'Sprite', barcode: first.barcode }))).rejects.toBeInstanceOf(
      DuplicateBarcodeError,
    );
    expect((await getProduct(second.id))?.barcode).toBe('111');
  });

  it('can remove a barcode', async () => {
    const saved = await createProduct(fields());
    const updated = await updateProduct(saved.id, fields({ barcode: '' }));
    expect('barcode' in updated).toBe(false);
    expect(await findProductByBarcode('4801981116072')).toBeUndefined();
    // The freed barcode can now be given to another product.
    await expect(createProduct(fields({ name: 'New owner' }))).resolves.toBeTruthy();
  });

  it('reports a missing product', async () => {
    await expect(updateProduct(999, fields())).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});

describe('deactivating', () => {
  it('hides a product without deleting it, and can bring it back', async () => {
    const saved = await createProduct(fields());
    expect((await setProductActive(saved.id, false)).isActive).toBe(false);
    expect(await listProducts()).toHaveLength(1);
    expect((await setProductActive(saved.id, true)).isActive).toBe(true);
  });

  it('keeps the barcode reserved while inactive', async () => {
    const saved = await createProduct(fields());
    await setProductActive(saved.id, false);
    await expect(createProduct(fields({ name: 'Copy' }))).rejects.toBeInstanceOf(DuplicateBarcodeError);
  });
});

describe('stock changes', () => {
  it('sets an exact stock count', async () => {
    const saved = await createProduct(fields());
    expect((await setStock(saved.id, 0)).stockQuantity).toBe(0);
  });

  it('adds and removes stock', async () => {
    const saved = await createProduct(fields({ stockQuantity: 2 }));
    expect((await adjustStock(saved.id, 3)).stockQuantity).toBe(5);
    expect((await adjustStock(saved.id, -5)).stockQuantity).toBe(0);
  });

  it("refuses to go below 0 and doesn't change anything", async () => {
    const saved = await createProduct(fields({ stockQuantity: 1 }));
    await expect(adjustStock(saved.id, -2)).rejects.toBeInstanceOf(StockChangeError);
    expect((await getProduct(saved.id))?.stockQuantity).toBe(1);
  });

  it('refuses invalid exact counts', async () => {
    const saved = await createProduct(fields());
    await expect(setStock(saved.id, -1)).rejects.toBeInstanceOf(StockChangeError);
    await expect(setStock(saved.id, 1.5)).rejects.toBeInstanceOf(StockChangeError);
  });

  it('does not lose quick repeated taps', async () => {
    const saved = await createProduct(fields({ stockQuantity: 0 }));
    await Promise.all(Array.from({ length: 10 }, () => adjustStock(saved.id, 1)));
    expect((await getProduct(saved.id))?.stockQuantity).toBe(10);
  });
});

describe('restore and undo', () => {
  it('replaces every product, keeping ids, barcodes and dates', async () => {
    await createProduct(fields({ name: 'Old one' }));
    const restored = [
      { ...fields({ barcode: '0012' }), id: 40, createdAt: 1, updatedAt: 2 },
      { ...fields({ name: 'No barcode', barcode: undefined }), id: 41, createdAt: 3, updatedAt: 4 },
    ];
    delete restored[1].barcode;
    await replaceAllProducts(restored);
    const all = await listProducts();
    expect(all.map((p) => p.id).sort()).toEqual([40, 41]);
    expect((await findProductByBarcode('0012'))?.createdAt).toBe(1);
  });

  it('keeps a safety copy and can undo', async () => {
    const original = await createProduct(fields({ name: 'Before restore' }));
    await replaceAllProducts([]);
    expect(await listProducts()).toHaveLength(0);
    expect((await getRestoreSafetyCopy())?.products).toHaveLength(1);

    expect(await undoLastRestore()).toBe(1);
    expect(await getProduct(original.id)).toEqual(original);
    expect(await getRestoreSafetyCopy()).toBeUndefined();
    await expect(undoLastRestore()).rejects.toBeInstanceOf(RestoreError);
  });

  it('changes nothing if the restore fails part-way', async () => {
    const original = await createProduct(fields());
    // Two products with the same barcode: the database refuses the second.
    const broken = [
      { ...fields({ name: 'A', barcode: '999' }), id: 1, createdAt: 0, updatedAt: 0 },
      { ...fields({ name: 'B', barcode: '999' }), id: 2, createdAt: 0, updatedAt: 0 },
    ];
    await expect(replaceAllProducts(broken)).rejects.toBeTruthy();
    expect(await listProducts()).toEqual([original]);
    expect(await getRestoreSafetyCopy()).toBeUndefined();
  });

  it('new products after a restore get fresh ids', async () => {
    await replaceAllProducts([{ ...fields(), id: 50, createdAt: 0, updatedAt: 0 }]);
    const added = await createProduct(fields({ name: 'New', barcode: undefined }));
    expect(added.id).toBeGreaterThan(50);
  });
});

describe('photos', () => {
  const picture = (n: number) => ({ type: 'image/jpeg', width: 10, height: 10, data: new Uint8Array([n, n, n]).buffer });
  const setPhoto = (n: number) => ({ kind: 'set' as const, full: picture(n), thumb: picture(n + 100) });

  it('saves a photo together with a new product', async () => {
    const saved = await createProduct(fields(), setPhoto(1));
    expect(new Uint8Array((await getPhoto(saved.id))!.image.data)).toEqual(new Uint8Array([1, 1, 1]));
    expect((await listPhotoThumbs()).has(saved.id)).toBe(true);
  });

  it('keeps, replaces and removes the photo when editing', async () => {
    const saved = await createProduct(fields(), setPhoto(1));
    await updateProduct(saved.id, fields({ name: 'Renamed' }));
    expect(await getPhoto(saved.id)).toBeDefined();
    await updateProduct(saved.id, fields(), setPhoto(2));
    expect(new Uint8Array((await getPhoto(saved.id))!.image.data)[0]).toBe(2);
    await updateProduct(saved.id, fields(), { kind: 'remove' });
    expect(await getPhoto(saved.id)).toBeUndefined();
    expect(await getPhotoThumb(saved.id)).toBeUndefined();
  });

  it('saves no photo if the product itself is refused', async () => {
    await createProduct(fields());
    await expect(createProduct(fields({ name: 'Copy' }), setPhoto(3))).rejects.toBeInstanceOf(DuplicateBarcodeError);
    expect(await listPhotos()).toHaveLength(0);
  });

  it('restore replaces photos too, and undo brings them back', async () => {
    const before = await createProduct(fields(), setPhoto(1));
    const restoredPhoto = { productId: 60, full: picture(9), thumb: picture(19), updatedAt: 5 };
    await replaceAllProducts([{ ...fields({ barcode: '600' }), id: 60, createdAt: 0, updatedAt: 0 }], [restoredPhoto]);
    expect(await getPhoto(before.id)).toBeUndefined();
    expect(new Uint8Array((await getPhoto(60))!.image.data)[0]).toBe(9);

    await undoLastRestore();
    expect(new Uint8Array((await getPhoto(before.id))!.image.data)[0]).toBe(1);
    expect(await getPhoto(60)).toBeUndefined();
  });

  it('restoring a backup without photos removes the old photos (undo brings them back)', async () => {
    const before = await createProduct(fields(), setPhoto(1));
    await replaceAllProducts([{ ...fields(), id: before.id, createdAt: 0, updatedAt: 0 }]);
    expect(await listPhotos()).toHaveLength(0);
    await undoLastRestore();
    expect(await listPhotos()).toHaveLength(1);
  });
});

describe('lookups', () => {
  it('finds products with the same name, ignoring capitals and spaces', async () => {
    const saved = await createProduct(fields({ barcode: undefined }));
    expect(await findProductsWithSameName('  coke  MISMO 290ml')).toHaveLength(1);
    expect(await findProductsWithSameName('coke mismo 290ml', saved.id)).toHaveLength(0);
  });

  it('lists suggested and used categories once each, A to Z', async () => {
    await createProduct(fields({ barcode: undefined, category: 'Frozen' }));
    await createProduct(fields({ barcode: undefined, category: 'Beverages', name: 'Other' }));
    const categories = await listCategories();
    expect(categories).toContain('Frozen');
    expect(categories.filter((c) => c === 'Beverages')).toHaveLength(1);
    expect([...categories].sort((a, b) => a.localeCompare(b, 'en-PH', { sensitivity: 'base' }))).toEqual(categories);
  });
});
