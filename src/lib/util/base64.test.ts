import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64 } from './base64';

describe('base64', () => {
  it('round-trips bytes, including large ones', () => {
    const data = new Uint8Array(200_000).map((_, i) => (i * 31) % 256);
    const back = base64ToBytes(bytesToBase64(data.buffer));
    expect(back && new Uint8Array(back)).toEqual(data);
  });

  it('rejects text that is not base64', () => {
    expect(base64ToBytes('not base64!')).toBeNull();
    expect(base64ToBytes('abc')).toBeNull();
  });

  it('handles empty data', () => {
    expect(bytesToBase64(new ArrayBuffer(0))).toBe('');
    expect(base64ToBytes('')?.byteLength).toBe(0);
  });
});
