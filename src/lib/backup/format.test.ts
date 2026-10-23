import { describe, expect, it } from 'vitest';
import type { Product } from '../model/product';
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

const sample = [
  product(),
  product({ id: 2, name: 'Ice tubig', barcode: undefined, category: 'Others', unit: 'piece', stockQuantity: 0 }),
  product({ id: 7, name: 'Safeguard', barcode: '4800888141125', isActive: false }),
];

function fileText(overrides: Record<string, unknown> = {}, products: unknown[] = sample) {
  const backup = { ...buildBackup(sample, '0.6.0', new Date('2026-10-24T06:30:00Z')), ...overrides } as Record<string, unknown>;
  backup.products = products;
  if (!('productCount' in overrides)) backup.productCount = products.length;
  return JSON.stringify(backup);
}

describe('export then restore', () => {
  it('gives back exactly the same products', () => {
    const text = backupToText(buildBackup(sample, '0.6.0', new Date('2026-10-24T06:30:00Z')));
    const result = checkBackup(text);
    expect(result.ok).toBe(true);
    expect(result.ok && result.backup.products).toEqual(sample);
    expect(result.ok && result.backup.exportedAt.toISOString()).toBe('2026-10-24T06:30:00.000Z');
  });

  it('keeps leading zeros, centavos and deactivated products', () => {
    const text = backupToText(buildBackup(sample, '0.6.0', new Date()));
    expect(text).toContain('"barcode": "0480198111607"');
    expect(text).toContain('"sellingPriceCentavos": 2000');
    const result = checkBackup(text);
    expect(result.ok && result.backup.products.find((p) => p.id === 7)?.isActive).toBe(false);
  });

  it('leaves out the barcode field for products without one', () => {
    const backup = buildBackup(sample, '0.6.0', new Date());
    expect('barcode' in backup.products[1]).toBe(false);
  });

  it('accepts an empty store', () => {
    const result = checkBackup(backupToText(buildBackup([], '0.6.0', new Date())));
    expect(result.ok && result.backup.products).toEqual([]);
  });
});

describe('refusing bad files', () => {
  it('refuses text that is not JSON (e.g. a cut-off file)', () => {
    const text = backupToText(buildBackup(sample, '0.6.0', new Date()));
    expect(checkBackup(text.slice(0, text.length / 2))).toMatchObject({ ok: false });
    expect(checkBackup('hello')).toMatchObject({ ok: false });
  });

  it('refuses other JSON files', () => {
    expect(checkBackup('{"name":"something else"}')).toMatchObject({ ok: false, error: expect.stringMatching(/isn't a Sari-Sari Store backup/) });
    expect(checkBackup('[1,2,3]')).toMatchObject({ ok: false });
  });

  it('refuses backups from a newer app version', () => {
    expect(checkBackup(fileText({ formatVersion: 2 }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('refuses incomplete backups', () => {
    expect(checkBackup(fileText({ productCount: 5 }))).toMatchObject({ ok: false, error: expect.stringMatching(/incomplete/) });
    expect(checkBackup(fileText({ exportedAt: 'yesterday' }))).toMatchObject({ ok: false });
    expect(checkBackup(fileText({ format: undefined }))).toMatchObject({ ok: false });
  });

  it('refuses invalid products and explains which ones', () => {
    const result = checkBackup(
      fileText({}, [product(), product({ id: 2, name: 'Bad price', barcode: undefined, sellingPriceCentavos: -5 })]),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.details?.[0]).toMatch(/Product 2 \("Bad price"\)/);
  });

  it('refuses prices with decimals (must be whole centavos)', () => {
    expect(checkBackup(fileText({}, [product({ costPriceCentavos: 16.5 })])).ok).toBe(false);
  });

  it('refuses duplicate barcodes and duplicate ids', () => {
    expect(checkBackup(fileText({}, [product(), product({ id: 2, name: 'Copy' })])).ok).toBe(false);
    expect(checkBackup(fileText({}, [product(), product({ barcode: '111', name: 'Same id' })])).ok).toBe(false);
  });

  it('refuses missing ids, dates or names', () => {
    expect(checkBackup(fileText({}, [{ ...product(), id: undefined }])).ok).toBe(false);
    expect(checkBackup(fileText({}, [{ ...product(), createdAt: 'today' }])).ok).toBe(false);
    expect(checkBackup(fileText({}, [{ ...product(), name: undefined }])).ok).toBe(false);
    expect(checkBackup(fileText({}, [{ ...product(), barcode: 4801 }])).ok).toBe(false);
  });

  it('limits the list of problems shown', () => {
    const bad = Array.from({ length: 9 }, (_, i) => product({ id: i + 1, barcode: undefined, stockQuantity: -1 }));
    const result = checkBackup(fileText({}, bad));
    expect(!result.ok && result.details).toHaveLength(6);
  });
});

describe('backupFileName', () => {
  it('uses the local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 4, 9, 5))).toBe('sarisari-backup-2026-10-04-0905.json');
  });

  it('marks the file type clearly', () => {
    expect(BACKUP_FORMAT).toBe('sari-sari-store-backup');
  });
});
