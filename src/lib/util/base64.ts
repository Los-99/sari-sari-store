/**
 * Base64 turns picture bytes into plain text so they fit in the JSON backup file.
 * Converted in chunks so big pictures don't overflow the phone's memory limits.
 */
export function bytesToBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Returns null when the text isn't valid base64. */
export function base64ToBytes(text: string): ArrayBuffer | null {
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}
