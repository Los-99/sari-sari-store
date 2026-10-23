import { DEFAULT_LOW_STOCK_THRESHOLD, LIMITS, type Product, type ProductFields } from './product';
import { centavosToInput, parsePeso } from '../util/money';
import { parseWholeNumber, validateProduct } from '../util/validation';

/** Exactly what is typed in the Add / Edit form: always text. */
export interface ProductFormValues {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  cost: string;
  selling: string;
  stock: string;
  threshold: string;
}

export type FormErrors = Partial<Record<keyof ProductFormValues, string>>;

export type FormResult = { ok: true; fields: ProductFields } | { ok: false; errors: FormErrors };

/** Which form box each saved field comes from, for showing errors in the right place. */
const FIELD_TO_INPUT: Record<keyof ProductFields, keyof ProductFormValues | null> = {
  name: 'name',
  barcode: 'barcode',
  category: 'category',
  unit: 'unit',
  costPriceCentavos: 'cost',
  sellingPriceCentavos: 'selling',
  stockQuantity: 'stock',
  lowStockThreshold: 'threshold',
  isActive: null,
};

/** The order fields appear on screen, used to jump to the first error. */
export const FORM_ORDER: (keyof ProductFormValues)[] = [
  'name',
  'barcode',
  'category',
  'unit',
  'cost',
  'selling',
  'stock',
  'threshold',
];

export function emptyForm(barcode = ''): ProductFormValues {
  return {
    name: '',
    barcode,
    category: '',
    unit: 'piece',
    cost: '',
    selling: '',
    stock: '0',
    threshold: String(DEFAULT_LOW_STOCK_THRESHOLD),
  };
}

export function formFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    barcode: product.barcode ?? '',
    category: product.category,
    unit: product.unit,
    cost: centavosToInput(product.costPriceCentavos),
    selling: centavosToInput(product.sellingPriceCentavos),
    stock: String(product.stockQuantity),
    threshold: String(product.lowStockThreshold),
  };
}

export function formsEqual(a: ProductFormValues, b: ProductFormValues): boolean {
  return FORM_ORDER.every((key) => a[key] === b[key]);
}

/** Turns the typed text into product fields, or explains what to fix. */
export function readForm(values: ProductFormValues, isActive: boolean): FormResult {
  const errors: FormErrors = {};

  const cost = parsePeso(values.cost);
  if (!cost.ok) errors.cost = cost.error;
  const selling = parsePeso(values.selling);
  if (!selling.ok) errors.selling = selling.error;
  const stock = parseWholeNumber(values.stock, 'stock', LIMITS.maxStock);
  if (!stock.ok) errors.stock = stock.error;
  const threshold = parseWholeNumber(values.threshold, 'low-stock alert', LIMITS.maxStock);
  if (!threshold.ok) errors.threshold = threshold.error;

  const candidate: ProductFields = {
    name: values.name,
    barcode: values.barcode,
    category: values.category,
    unit: values.unit,
    costPriceCentavos: cost.ok ? cost.value : 0,
    sellingPriceCentavos: selling.ok ? selling.value : 0,
    stockQuantity: stock.ok ? stock.value : 0,
    lowStockThreshold: threshold.ok ? threshold.value : 0,
    isActive,
  };

  const validated = validateProduct(candidate);
  if (!validated.ok) {
    for (const [field, message] of Object.entries(validated.errors)) {
      const input = FIELD_TO_INPUT[field as keyof ProductFields];
      if (input && !errors[input]) errors[input] = message;
    }
  }

  if (Object.keys(errors).length > 0 || !validated.ok) return { ok: false, errors };
  return { ok: true, fields: validated.value };
}
