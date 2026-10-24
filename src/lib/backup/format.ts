import type { Product, ProductFields } from '../model/product';
import { PHOTO_LIMITS, PHOTO_TYPES, type PhotoImage, type ProductPhoto } from '../model/photo';
import { validateProduct } from '../util/validation';
import { base64ToBytes, bytesToBase64 } from '../util/base64';

/**
 * The backup file: a plain JSON text file described in docs/BACKUP_FORMAT.md.
 * Reading a backup checks *everything* before anything is restored, and
 * explains problems in plain words.
 *
 * Version 1 (app 1.0): products only. Version 2 (app 1.1): products and photos.
 * Both can be restored.
 */

export const BACKUP_FORMAT = 'sari-sari-store-backup';
export const BACKUP_FORMAT_VERSION = 2;
/** Larger files are refused before reading, to protect the phone's memory. */
export const MAX_BACKUP_BYTES = 250 * 1024 * 1024;

/** A picture as written in the backup file: the bytes become base64 text. */
export interface BackupImage {
  type: string;
  width: number;
  height: number;
  data: string;
}

export interface BackupPhoto {
  productId: number;
  updatedAt: number;
  full: BackupImage;
  thumb: BackupImage;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  appVersion: string;
  /** When the backup was made, e.g. "2026-10-24T06:30:00.000Z" (UTC). */
  exportedAt: string;
  /** False for "Back up without photos". */
  includesPhotos: boolean;
  productCount: number;
  photoCount: number;
  products: Product[];
  photos: BackupPhoto[];
}

export interface CheckedBackup {
  exportedAt: Date;
  appVersion: string;
  /** False for version 1 files and "without photos" backups. */
  includesPhotos: boolean;
  products: Product[];
  photos: ProductPhoto[];
}

export type BackupCheck = { ok: true; backup: CheckedBackup } | { ok: false; error: string; details?: string[] };

/** Pass `photos: null` for a backup without photos. */
export function buildBackup(
  products: readonly Product[],
  photos: readonly ProductPhoto[] | null,
  appVersion: string,
  now: Date,
): BackupFile {
  const sorted = [...products].sort((a, b) => a.id - b.id);
  const ids = new Set(sorted.map((product) => product.id));
  const kept = (photos ?? []).filter((photo) => ids.has(photo.productId)).sort((a, b) => a.productId - b.productId);
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    includesPhotos: photos !== null,
    productCount: sorted.length,
    photoCount: kept.length,
    products: sorted.map(toPlainProduct),
    photos: kept.map((photo) => ({
      productId: photo.productId,
      updatedAt: photo.updatedAt,
      full: toBackupImage(photo.full),
      thumb: toBackupImage(photo.thumb),
    })),
  };
}

/**
 * The file's text in pieces: readable product lines, then one line per photo.
 * Pieces avoid building one giant text in memory when there are many photos.
 */
export function backupToParts(backup: BackupFile): string[] {
  const { photos, ...rest } = backup;
  const head = JSON.stringify(rest, null, 2);
  const parts = [`${head.slice(0, head.lastIndexOf('}')).trimEnd()},\n  "photos": [`];
  photos.forEach((photo, index) => parts.push(`${index === 0 ? '\n' : ',\n'}    ${JSON.stringify(photo)}`));
  parts.push(photos.length > 0 ? '\n  ]\n}\n' : ']\n}\n');
  return parts;
}

export function backupToText(backup: BackupFile): string {
  return backupToParts(backup).join('');
}

/** "sarisari-backup-2026-10-24-1430.json", using the phone's local time. */
export function backupFileName(now: Date, withPhotos = true): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `sarisari-backup-${date}-${pad(now.getHours())}${pad(now.getMinutes())}${withPhotos ? '' : '-no-photos'}.json`;
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

  // Version 2 adds photos.
  let rawPhotos: unknown[] = [];
  let includesPhotos = false;
  if (data.formatVersion >= 2) {
    if (!Array.isArray(data.photos) || typeof data.includesPhotos !== 'boolean') {
      return { ok: false, error: 'This backup is damaged: the photo list is missing.' };
    }
    if (data.photoCount !== data.photos.length) {
      return {
        ok: false,
        error: `This backup is incomplete: it should have ${String(data.photoCount)} photos but has ${data.photos.length}. Try the original backup file.`,
      };
    }
    rawPhotos = data.photos;
    includesPhotos = data.includesPhotos;
  }

  const problems: string[] = [];
  const products: Product[] = [];
  const ids = new Set<number>();
  const barcodes = new Map<string, string>();
  const names = new Map<number, string>();

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
    names.set(product.id, product.name);
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

  const photos: ProductPhoto[] = [];
  const photoIds = new Set<number>();
  rawPhotos.forEach((raw, index) => {
    const productId = isObject(raw) && typeof raw.productId === 'number' ? raw.productId : NaN;
    const label = names.has(productId) ? `Photo of "${names.get(productId)}"` : `Photo ${index + 1}`;
    const photo = readPhoto(raw, ids);
    if (typeof photo === 'string') {
      problems.push(`${label}: ${photo}`);
      return;
    }
    if (photoIds.has(photo.productId)) {
      problems.push(`${label}: the product has two photos.`);
      return;
    }
    photoIds.add(photo.productId);
    photos.push(photo);
  });

  if (problems.length > 0) {
    return {
      ok: false,
      error: `This backup has ${problems.length} damaged ${problems.length === 1 ? 'item' : 'items'}, so nothing was restored.`,
      details: problems.slice(0, 5).concat(problems.length > 5 ? [`…and ${problems.length - 5} more.`] : []),
    };
  }

  return {
    ok: true,
    backup: {
      exportedAt,
      appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown',
      includesPhotos,
      products,
      photos,
    },
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

function readPhoto(raw: unknown, productIds: Set<number>): ProductPhoto | string {
  if (!isObject(raw)) return 'is not a photo.';
  const { productId, updatedAt } = raw;
  if (typeof productId !== 'number' || !productIds.has(productId)) return "it doesn't belong to any product in the backup.";
  if (!isTimestamp(updatedAt)) return 'its date is missing or wrong.';
  const full = readImage(raw.full, PHOTO_LIMITS.fullMaxBytes);
  if (typeof full === 'string') return full;
  const thumb = readImage(raw.thumb, PHOTO_LIMITS.thumbMaxBytes);
  if (typeof thumb === 'string') return thumb;
  return { productId, updatedAt, full, thumb };
}

function readImage(raw: unknown, maxBytes: number): PhotoImage | string {
  if (!isObject(raw)) return 'the picture is missing.';
  const { type, width, height, data } = raw;
  if (typeof type !== 'string' || !(PHOTO_TYPES as readonly string[]).includes(type)) return 'the picture type is not supported.';
  if (!isDimension(width) || !isDimension(height)) return 'the picture size is wrong.';
  if (typeof data !== 'string') return 'the picture data is missing.';
  const bytes = base64ToBytes(data);
  if (bytes === null || bytes.byteLength === 0) return 'the picture data is damaged.';
  if (bytes.byteLength > maxBytes) return 'the picture is too large.';
  return { type, width, height, data: bytes };
}

function toBackupImage(image: PhotoImage): BackupImage {
  return { type: image.type, width: image.width, height: image.height, data: bytesToBase64(image.data) };
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

function isDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10_000;
}
