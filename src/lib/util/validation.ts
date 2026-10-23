import { FALLBACK_CATEGORY, LIMITS, type ProductFields } from '../model/product';
import type { ParseResult } from './money';

export type FieldErrors = Partial<Record<keyof ProductFields, string>>;

export type ValidationResult = { ok: true; value: ProductFields } | { ok: false; errors: FieldErrors };

/** Trims the ends and turns runs of spaces into one space. */
export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** An empty or blank barcode means "no barcode". Leading zeros are kept. */
export function normalizeBarcode(barcode: string | undefined): string | undefined {
  const trimmed = barcode?.trim() ?? '';
  return trimmed === '' ? undefined : trimmed;
}

/** Used to spot two products with the same name, ignoring capital letters and extra spaces. */
export function nameKey(name: string): string {
  return normalizeText(name).toLocaleLowerCase('en-PH');
}

/** Reads a whole number typed by the user, e.g. stock quantity. */
export function parseWholeNumber(text: string, label: string, max: number = LIMITS.maxStock): ParseResult {
  const input = text.trim().replace(/,/g, '');
  if (input === '') return { ok: false, error: `Please enter the ${label}.` };
  if (input.startsWith('-')) return { ok: false, error: `${capitalize(label)} can't be negative.` };
  if (!/^\d+$/.test(input)) return { ok: false, error: `${capitalize(label)} must be a whole number.` };
  const value = Number(input);
  if (value > max) return { ok: false, error: `${capitalize(label)} can't be more than ${max.toLocaleString('en-PH')}.` };
  return { ok: true, value };
}

/**
 * Checks every rule before a product is saved, and returns cleaned-up values
 * (trimmed text, empty barcode removed, empty category → "Others").
 * The database layer always calls this, so no screen can skip it.
 */
export function validateProduct(fields: ProductFields): ValidationResult {
  const errors: FieldErrors = {};

  const name = normalizeText(fields.name ?? '');
  if (name === '') errors.name = 'Please enter a product name.';
  else if (name.length > LIMITS.nameMaxLength) errors.name = `Name can be at most ${LIMITS.nameMaxLength} characters.`;

  const barcode = normalizeBarcode(fields.barcode);
  if (barcode !== undefined) {
    if (/\s/.test(barcode)) errors.barcode = "Barcode can't contain spaces.";
    else if (!/^[\x21-\x7E]+$/.test(barcode)) errors.barcode = 'Barcode can only use letters, numbers and symbols.';
    else if (barcode.length > LIMITS.barcodeMaxLength) errors.barcode = `Barcode can be at most ${LIMITS.barcodeMaxLength} characters.`;
  }

  const category = normalizeText(fields.category ?? '') || FALLBACK_CATEGORY;
  if (category.length > LIMITS.categoryMaxLength) {
    errors.category = `Category can be at most ${LIMITS.categoryMaxLength} characters.`;
  }

  const unit = normalizeText(fields.unit ?? '');
  if (unit === '') errors.unit = 'Please choose a unit, e.g. piece or pack.';
  else if (unit.length > LIMITS.unitMaxLength) errors.unit = `Unit can be at most ${LIMITS.unitMaxLength} characters.`;

  const priceError = checkWholeNumber(fields.costPriceCentavos, LIMITS.maxPriceCentavos, 'Cost price');
  if (priceError) errors.costPriceCentavos = priceError;
  const sellingError = checkWholeNumber(fields.sellingPriceCentavos, LIMITS.maxPriceCentavos, 'Selling price');
  if (sellingError) errors.sellingPriceCentavos = sellingError;
  const stockError = checkWholeNumber(fields.stockQuantity, LIMITS.maxStock, 'Stock');
  if (stockError) errors.stockQuantity = stockError;
  const thresholdError = checkWholeNumber(fields.lowStockThreshold, LIMITS.maxStock, 'Low-stock alert');
  if (thresholdError) errors.lowStockThreshold = thresholdError;

  if (typeof fields.isActive !== 'boolean') errors.isActive = 'Active status is missing.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const value: ProductFields = {
    name,
    category,
    costPriceCentavos: fields.costPriceCentavos,
    sellingPriceCentavos: fields.sellingPriceCentavos,
    stockQuantity: fields.stockQuantity,
    unit,
    lowStockThreshold: fields.lowStockThreshold,
    isActive: fields.isActive,
  };
  // Leave the property out entirely when there is no barcode, so the
  // database's "unique barcode" rule ignores this product.
  if (barcode !== undefined) value.barcode = barcode;
  return { ok: true, value };
}

/** Things that are allowed but worth a second look before saving. */
export function sellingBelowCost(fields: Pick<ProductFields, 'costPriceCentavos' | 'sellingPriceCentavos'>): boolean {
  return fields.sellingPriceCentavos < fields.costPriceCentavos;
}

function checkWholeNumber(value: unknown, max: number, label: string): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return `${label} must be a whole number.`;
  if (value < 0) return `${label} can't be negative.`;
  if (value > max) return `${label} is too large.`;
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
