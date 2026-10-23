// The scanning engine (ZXing) is a WebAssembly file packed inside the app and
// saved on the phone with the rest of the app, so scanning works offline.
// `?url` asks Vite to copy the file into the build and give us its address.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

/** Retail product barcodes. QR codes are left out on purpose: fewer false reads. */
export const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] as const;

export interface Detector {
  detect(image: ImageData): Promise<{ rawValue: string; format: string }[]>;
}

let detector: Promise<Detector> | null = null;

/**
 * Loads the engine once and reuses it. The same engine is used on every phone
 * (not Android's built-in reader), so scanning behaves the same on iPhone and
 * Android and never needs to download anything.
 */
export function loadDetector(): Promise<Detector> {
  detector ??= (async () => {
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    // Never fetch the engine from the internet: always use our own copy.
    await prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
      },
      fireImmediately: true,
    });
    return new BarcodeDetector({ formats: [...PRODUCT_FORMATS] });
  })().catch((error: unknown) => {
    detector = null;
    throw error;
  });
  return detector;
}
