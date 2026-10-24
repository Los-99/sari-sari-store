import { describe, expect, it } from 'vitest';
import type { Product } from '../model/product';
import type { ProductPhoto } from '../model/photo';
import { BACKUP_FORMAT, backupFileName, backupToText, buildBackup, checkBackup } from './format';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Coke Mismo 290ml',
    barcode: '0480198111607',
    category: 'Beverages',
    unit: 'bottle',
    costPriceCentavos: 1650,
    sellingPriceCentavos: 2000,
    stockQuantity: 24,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: 1_790_000_000_000,
    updatedAt: 1_790_000_100_000,
    ...overrides,
  };
}

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

function photo(productId: number): ProductPhoto {
  return {
    productId,
    updatedAt: 1_790_000_200_000,
    full: { type: 'image/jpeg', width: 800, height: 600, data: bytes(255, 216, 255, 224, 1, 2, 3) },
    thumb: { type: 'image/jpeg', width: 160, height: 160, data: bytes(255, 216, 255, 9) },
  };
}

const sample = [
  product(),
  product({ id: 2, name: 'Ice tubig', barcode: undefined, category: 'Others', unit: 'piece', stockQuantity: 0 }),
  product({ id: 7, name: 'Safeguard', barcode: '4800888141125', isActive: false }),
];
const samplePhotos = [photo(1), photo(7)];
const when = new Date('2026-10-24T06:30:00Z');

/** A backup file's text with some top-level fields or the product list replaced. */
function fileText(overrides: Record<string, unknown> = {}, products: unknown[] = sample) {
  const backup = { ...buildBackup(sample, samplePhotos, '1.1.0', when), ...overrides } as Record<string, unknown>;
  backup.products = products;
  if (!('productCount' in overrides)) backup.productCount = products.length;
  return JSON.stringify(backup);
}

describe('export then restore', () => {
  it('gives back exactly the same products and photos', () => {
    const result = checkBackup(backupToText(buildBackup(sample, samplePhotos, '1.1.0', when)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.products).toEqual(sample);
    expect(result.backup.photos).toEqual(samplePhotos);
    expect(result.backup.includesPhotos).toBe(true);
    expect(result.backup.exportedAt.toISOString()).toBe('2026-10-24T06:30:00.000Z');
  });

  it('writes readable, valid JSON with or without photos', () => {
    expect(() => JSON.parse(backupToText(buildBackup(sample, samplePhotos, '1.1.0', when)))).not.toThrow();
    expect(() => JSON.parse(backupToText(buildBackup(sample, [], '1.1.0', when)))).not.toThrow();
    expect(() => JSON.parse(backupToText(buildBackup([], null, '1.1.0', when)))).not.toThrow();
  });

  it('keeps leading zeros, centavos and deactivated products', () => {
    const text = backupToText(buildBackup(sample, null, '1.1.0', new Date()));
    expect(text).toContain('"barcode": "0480198111607"');
    expect(text).toContain('"sellingPriceCentavos": 2000');
    const result = checkBackup(text);
    expect(result.ok && result.backup.products.find((p) => p.id === 7)?.isActive).toBe(false);
  });

  it('leaves out the barcode field for products without one', () => {
    const backup = buildBackup(sample, null, '1.1.0', new Date());
    expect('barcode' in backup.products[1]).toBe(false);
  });

  it('can leave photos out ("Back up without photos")', () => {
    const result = checkBackup(backupToText(buildBackup(sample, null, '1.1.0', when)));
    expect(result.ok && result.backup.includesPhotos).toBe(false);
    expect(result.ok && result.backup.photos).toEqual([]);
  });

  it('skips photos of products that are not in the backup', () => {
    const backup = buildBackup([product()], [photo(1), photo(99)], '1.1.0', when);
    expect(backup.photos.map((p) => p.productId)).toEqual([1]);
  });

  it('accepts an empty store', () => {
    const result = checkBackup(backupToText(buildBackup([], [], '1.1.0', new Date())));
    expect(result.ok && result.backup.products).toEqual([]);
  });
});

describe('older backups', () => {
  it('still restores version 1 files (no photos)', () => {
    const v1 = JSON.stringify({
      format: BACKUP_FORMAT,
      formatVersion: 1,
      appVersion: '1.0.0',
      exportedAt: when.toISOString(),
      productCount: 1,
      products: [product()],
    });
    const result = checkBackup(v1);
    expect(result.ok).toBe(true);
    expect(result.ok && result.backup.includesPhotos).toBe(false);
    expect(result.ok && result.backup.products).toHaveLength(1);
  });
});

describe('refusing bad files', () => {
  it('refuses text that is not JSON (e.g. a cut-off file)', () => {
    const text = backupToText(buildBackup(sample, samplePhotos, '1.1.0', new Date()));
    expect(checkBackup(text.slice(0, text.length / 2))).toMatchObject({ ok: false });
    expect(checkBackup('hello')).toMatchObject({ ok: false });
  });

  it('refuses other JSON files', () => {
    expect(checkBackup('{"name":"something else"}')).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a Sari-Sari Store backup/) });
    expect(checkBackup('[1,2,3]')).toMatchObject({ ok: false });
  });

  it('refuses backups from a newer app version', () => {
    expect(checkBackup(fileText({ formatVersion: 3 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('refuses incomplete backups', () => {
    expect(checkBackup(fileText({ productCount: 5 }))).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
    expect(checkBackup(fileText({ photoCount: 5 }))).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
    expect(checkBackup(fileText({ photos: undefined }))).toMatchObject({ ok: false });
    expect(checkBackup(fileText({ exportedAt: 'yesterday' }))).toMatchObject({ ok: false });
    expect(checkBackup(fileText({ format: undefined }))).toMatchObject({ ok: false });
  });

  it('refuses invalid products and explains which ones', () => {
    const result = checkBackup(
      fileText({}, [product(), product({ id: 2, name: 'Bad price', barcode: undefined, sellingPriceCentavos: -5 }), product({ id: 7, barcode: '1' })]),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.details?.[0]).toMatch(/Product 2 \("Bad price"\)/);
  });

  it('refuses prices with decimals (must be whole centavos)', () => {
    expect(checkBackup(fileText({}, [product({ costPriceCentavos: 16.5 }), product({ id: 7, barcode: '1' })])).ok).toBe(false);
  });

  it('refuses duplicate barcodes and duplicate ids', () => {
    expect(checkBackup(fileText({ photos: [], photoCount: 0 }, [product(), product({ id: 2, name: 'Copy' })])).ok).toBe(false);
    expect(checkBackup(fileText({ photos: [], photoCount: 0 }, [product(), product({ barcode: '111', name: 'Same id' })])).ok).toBe(false);
  });

  it('refuses missing ids, dates or names', () => {
    const noPhotos = { photos: [], photoCount: 0 };
    expect(checkBackup(fileText(noPhotos, [{ ...product(), id: undefined }])).ok).toBe(false);
    expect(checkBackup(fileText(noPhotos, [{ ...product(), createdAt: 'today' }])).ok).toBe(false);
    expect(checkBackup(fileText(noPhotos, [{ ...product(), name: undefined }])).ok).toBe(false);
    expect(checkBackup(fileText(noPhotos, [{ ...product(), barcode: 4801 }])).ok).toBe(false);
  });

  it('refuses damaged photos', () => {
    const good = buildBackup(sample, samplePhotos, '1.1.0', when);
    const withPhoto = (change: (p: Record<string, unknown>) => void) => {
      const copy = JSON.parse(JSON.stringify(good));
      change(copy.photos[0]);
      return checkBackup(JSON.stringify(copy));
    };
    expect(withPhoto((p) => (p.productId = 42)).ok).toBe(false); // belongs to no product
    expect(withPhoto((p) => ((p.full as Record<string, unknown>).data = 'not base64!')).ok).toBe(false);
    expect(withPhoto((p) => ((p.full as Record<string, unknown>).type = 'text/html')).ok).toBe(false);
    expect(withPhoto((p) => ((p.thumb as Record<string, unknown>).width = 0)).ok).toBe(false);
    expect(withPhoto((p) => delete p.thumb).ok).toBe(false);
    expect(withPhoto((p) => (p.productId = 7)).ok).toBe(false); // product 7 would have two photos
  });

  it('limits the list of problems shown', () => {
    const bad = Array.from({ length: 9 }, (_, i) => product({ id: i + 1, barcode: undefined, stockQuantity: -1 }));
    const result = checkBackup(fileText({ photos: [], photoCount: 0 }, bad));
    expect(!result.ok && result.details).toHaveLength(6);
  });
});

describe('backupFileName', () => {
  it('uses the local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 4, 9, 5))).toBe('sarisari-backup-2026-10-04-0905.json');
    expect(backupFileName(new Date(2026, 9, 4, 9, 5), false)).toBe('sarisari-backup-2026-10-04-0905-no-photos.json');
  });
});
