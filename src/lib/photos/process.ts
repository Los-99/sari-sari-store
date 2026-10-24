import { PHOTO_LIMITS, type PhotoImage } from '../model/photo';

/** A photo couldn't be used; the message is safe to show the store owner. */
export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoError';
  }
}

/**
 * Turns a picture from the camera or gallery into the two stored sizes.
 * Everything happens on the phone: shrinking big camera photos (often 3–10 MB)
 * to about 50–150 KB keeps storage and backups small.
 */
export async function preparePhoto(file: File): Promise<{ full: PhotoImage; thumb: PhotoImage }> {
  if (file.size > PHOTO_LIMITS.inputMaxBytes) {
    throw new PhotoError('This picture is too large. Choose a smaller one.');
  }
  const picture = await decode(file);
  try {
    const full = await resize(picture, PHOTO_LIMITS.fullMaxSide, false, 0.8);
    const thumb = await resize(picture, PHOTO_LIMITS.thumbSide, true, 0.75);
    return { full, thumb };
  } finally {
    if ('close' in picture) picture.close();
  }
}

type Picture = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Picture> {
  // createImageBitmap also turns sideways phone photos the right way up.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Fall back to an <img>, which some phones decode more formats with.
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new PhotoError("This picture couldn't be opened. Try another photo (JPEG or PNG).");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function resize(picture: Picture, maxSide: number, square: boolean, quality: number): Promise<PhotoImage> {
  const sourceWidth = picture.width;
  const sourceHeight = picture.height;
  if (!sourceWidth || !sourceHeight) throw new PhotoError("This picture couldn't be opened. Try another photo.");

  // Square thumbnails use the middle part of the picture.
  const cropSide = Math.min(sourceWidth, sourceHeight);
  const sx = square ? (sourceWidth - cropSide) / 2 : 0;
  const sy = square ? (sourceHeight - cropSide) / 2 : 0;
  const sw = square ? cropSide : sourceWidth;
  const sh = square ? cropSide : sourceHeight;

  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError("This phone couldn't process the picture.");
  // White behind transparent PNGs, since JPEG has no transparency.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(picture, sx, sy, sw, sh, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new PhotoError("This phone couldn't process the picture.");
  return { type: 'image/jpeg', data: await blob.arrayBuffer(), width, height };
}
