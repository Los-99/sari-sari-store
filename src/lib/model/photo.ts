/**
 * A product photo. Each product has at most one, stored twice:
 * - a full-size copy (about 800 px) for the details screen, and
 * - a small square thumbnail for lists, so long lists stay fast.
 *
 * Pictures are kept as raw bytes (ArrayBuffer), which every phone's
 * database stores reliably, and turned into images only when shown.
 */
export interface PhotoImage {
  /** e.g. "image/jpeg" */
  type: string;
  data: ArrayBuffer;
  width: number;
  height: number;
}

/** Both sizes of one product's photo. */
export interface ProductPhoto {
  productId: number;
  full: PhotoImage;
  thumb: PhotoImage;
  updatedAt: number;
}

/** What to do with a product's photo when the product is saved. */
export type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'set'; full: PhotoImage; thumb: PhotoImage }
  | { kind: 'remove' };

export const PHOTO_LIMITS = {
  /** Longest side of the full-size photo, in pixels. */
  fullMaxSide: 800,
  /** Thumbnails are square. */
  thumbSide: 160,
  /** Largest stored sizes accepted from a backup file. */
  fullMaxBytes: 2 * 1024 * 1024,
  thumbMaxBytes: 256 * 1024,
  /** Largest picture file the app will try to open. */
  inputMaxBytes: 40 * 1024 * 1024,
} as const;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function photoBlob(image: PhotoImage): Blob {
  return new Blob([image.data], { type: image.type });
}
