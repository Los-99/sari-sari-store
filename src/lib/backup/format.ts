import type { Product, ProductFields } from '../model/product';
import { validateProduct } from '../util/validation';

/**
 * The backup file: a plain JSON text file described in docs/BACKUP_FORMAT.md.
 * Reading a backup checks *everything* before anything is restored, and
 * explains problems in plain words.
 */

export const BACKUP_FORMAT = 'sari-sari-store-backup';
export const BACKUP_FORMAT_VERSION = 1;
/** Larger files are refused before reading, to protect the phone's memory. */
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  /** When the backup was made, e.g. "2026-10-24T06:30:00.000Z" (UTC). */
  exportedAt: string;
  productCount: number;
  products: Product[];
}

export interface CheckedBackup {
  exportedAt: Date;
  appVersion: string;
  products: Product[];
}

export type BackupCheck = { ok: true; backup: CheckedBackup } | { ok: false; error: string; details?: string[] };

export function buildBackup(products: readonly Product[], appVersion: string, now: Date): BackupFile {
  const sorted = [...products].sort((a, b) => a.id - b.id);
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    productCount: sorted.length,
    products: sorted.map(toPlainProduct),
  };
}

export function backupToText(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** "sarisari-backup-2026-10-24-1430.json", using the phone's local time. */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `sarisari-backup-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

/** Checks a backup file's text completely. Nothing is changed by this. */
export function checkBackup(text: string): BackupCheck {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return {
      ok: false,
      error: "This file isn't a readable backup. It may be damaged or only partly copied. Try the original backup file.",
    };
  }

  if (!isObject(data) || data.format !== BACKUP_FORMAT) {
    return { ok: false, error: "This file isn't a Sari-Sari Store backup. Choose a file named like sarisari-backup-….json." };
  }
  if (typeof data.formatVersion !== 'number' || !Number.isInteger(data.formatVersion) || data.formatVersion < 1) {
    return { ok: false, error: 'This backup is damaged: its version number is missing.' };
  }
  if (data.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'This backup was made by a newer version of the app. Update the app (open it with internet on), then try again.',
    };
  }
  if (!Array.isArray(data.products)) {
    return { ok: false, error: 'This backup is damaged: the product list is missing.' };
  }
  if (data.productCount !== data.products.length) {
    return {
      ok: false,
      error: `This backup is incomplete: it should have ${String(data.productCount)} products but has ${data.products.length}. Try the original backup file.`,
    };
  }
  const exportedAt = typeof data.exportedAt === 'string' ? new Date(data.exportedAt) : new Date(NaN);
  if (Number.isNaN(exportedAt.getTime())) {
    return { ok: false, error: 'This backup is damaged: its date is missing.' };
  }

  const problems: string[] = [];
  const products: Product[] = [];
  const ids = new Set<number>();
  const barcodes = new Map<string, string>();

  data.products.forEach((raw: unknown, index: number) => {
    const label = `Product ${index + 1}${isObject(raw) && typeof raw.name === 'string' ? ` ("${raw.name}")` : ''}`;
    const product = readProduct(raw);
    if (typeof product === 'string') {
      problems.push(`${label}: ${product}`);
      return;
    }
    if (ids.has(product.id)) {
      problems.push(`${label}: its ID number is used twice.`);
      return;
    }
    ids.add(product.id);
    if (product.barcode !== undefined) {
      const owner = barcodes.get(product.barcode);
      if (owner) {
        problems.push(`${label}: barcode ${product.barcode} is also used by "${owner}".`);
        return;
      }
      barcodes.set(product.barcode, product.name);
    }
    products.push(product);
  });

  if (problems.length > 0) {
    return {
      ok: false,
      error: `This backup has ${problems.length} damaged ${problems.length === 1 ? 'product' : 'products'}, so nothing was restored.`,
      details: problems.slice(0, 5).concat(problems.length > 5 ? [`…and ${problems.length - 5} more.`] : []),
    };
  }

  return {
    ok: true,
    backup: { exportedAt, appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown', products },
  };
}

// ---------------------------------------------------------------------------

function readProduct(raw: unknown): Product | string {
  if (!isObject(raw)) return 'is not a product.';
  const { id, createdAt, updatedAt } = raw;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) return 'its ID number is missing or wrong.';
  if (!isTimestamp(createdAt) || !isTimestamp(updatedAt)) return 'its dates are missing or wrong.';
  if (raw.barcode !== undefined && raw.barcode !== null && typeof raw.barcode !== 'string') {
    return 'its barcode must be text.';
  }
  for (const key of ['name', 'category', 'unit'] as const) {
    if (typeof raw[key] !== 'string') return `its ${key} is missing.`;
  }

  const fields: ProductFields = {
    name: raw.name as string,
    barcode: (raw.barcode as string | null | undefined) ?? undefined,
    category: raw.category as string,
    unit: raw.unit as string,
    costPriceCentavos: raw.costPriceCentavos as number,
    sellingPriceCentavos: raw.sellingPriceCentavos as number,
    stockQuantity: raw.stockQuantity as number,
    lowStockThreshold: raw.lowStockThreshold as number,
    isActive: raw.isActive as boolean,
  };
  const checked = validateProduct(fields);
  if (!checked.ok) return Object.values(checked.errors)[0] ?? 'has invalid values.';
  return { ...checked.value, id, createdAt: createdAt as number, updatedAt: updatedAt as number };
}

/** Only the documented fields, in a fixed order, so files are easy to read. */
function toPlainProduct(product: Product): Product {
  const plain: Product = {
    id: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    costPriceCentavos: product.costPriceCentavos,
    sellingPriceCentavos: product.sellingPriceCentavos,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
  if (product.barcode !== undefined) plain.barcode = product.barcode;
  return plain;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
