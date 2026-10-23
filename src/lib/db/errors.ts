import type { Product } from '../model/product';
import type { FieldErrors } from '../util/validation';

/** One or more fields break the rules. `errors` says which, in plain words. */
export class ProductValidationError extends Error {
  constructor(readonly errors: FieldErrors) {
    super('Please fix the highlighted fields.');
    this.name = 'ProductValidationError';
  }
}

/** The barcode already belongs to another product. */
export class DuplicateBarcodeError extends Error {
  constructor(
    readonly barcode: string,
    /** The product that already has this barcode, when known. */
    readonly existing?: Product,
  ) {
    super(
      existing
        ? `This barcode is already used by "${existing.name}".`
        : 'This barcode is already used by another product.',
    );
    this.name = 'DuplicateBarcodeError';
  }
}

export class ProductNotFoundError extends Error {
  constructor(readonly id: number) {
    super('This product no longer exists.');
    this.name = 'ProductNotFoundError';
  }
}

export class StockChangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockChangeError';
  }
}

/** Turns any error into a short message that is safe to show the store owner. */
export function describeError(error: unknown): string {
  if (
    error instanceof ProductValidationError ||
    error instanceof DuplicateBarcodeError ||
    error instanceof ProductNotFoundError ||
    error instanceof StockChangeError
  ) {
    return error.message;
  }
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return "The phone's storage is full. Free up some space, then try again.";
      case 'InvalidStateError':
      case 'UnknownError':
        return 'The product database could not be opened. Close the app completely and open it again.';
      case 'VersionError':
        return 'A newer version of the app is open somewhere else. Close all copies of the app, then open it again.';
    }
  }
  return 'Something went wrong while saving. Please try again.';
}
