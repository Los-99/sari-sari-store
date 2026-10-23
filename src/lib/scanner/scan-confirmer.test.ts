import { describe, expect, it } from 'vitest';
import { ScanConfirmer } from './scan-confirmer';

describe('ScanConfirmer', () => {
  it('accepts a barcode only after two matching reads', () => {
    const confirmer = new ScanConfirmer();
    expect(confirmer.read('4801981116072', 0)).toBeNull();
    expect(confirmer.read('4801981116072', 200)).toBe('4801981116072');
  });

  it('ignores a single wrong read in between', () => {
    const confirmer = new ScanConfirmer();
    expect(confirmer.read('4801981116072', 0)).toBeNull();
    expect(confirmer.read('4801981116079', 150)).toBeNull();
    expect(confirmer.read('4801981116072', 300)).toBeNull();
    expect(confirmer.read('4801981116072', 450)).toBe('4801981116072');
  });

  it('needs the two reads close together', () => {
    const confirmer = new ScanConfirmer(1500);
    expect(confirmer.read('123', 0)).toBeNull();
    expect(confirmer.read('123', 2000)).toBeNull();
    expect(confirmer.read('123', 2100)).toBe('123');
  });

  it('does not trigger the same barcode again right away', () => {
    const confirmer = new ScanConfirmer(1500, 2500);
    confirmer.read('123', 0);
    expect(confirmer.read('123', 100)).toBe('123');
    expect(confirmer.read('123', 200)).toBeNull();
    expect(confirmer.read('123', 300)).toBeNull();
    // After the cooldown it can be scanned again.
    expect(confirmer.read('123', 3000)).toBeNull();
    expect(confirmer.read('123', 3100)).toBe('123');
  });

  it('accepts a different barcode immediately after one was accepted', () => {
    const confirmer = new ScanConfirmer();
    confirmer.read('111', 0);
    expect(confirmer.read('111', 100)).toBe('111');
    confirmer.read('222', 200);
    expect(confirmer.read('222', 300)).toBe('222');
  });

  it('restarts the cooldown when scanning resumes', () => {
    const confirmer = new ScanConfirmer(1500, 2500);
    confirmer.read('123', 0);
    confirmer.read('123', 100);
    confirmer.resume(10_000);
    confirmer.read('123', 10_100);
    expect(confirmer.read('123', 10_200)).toBeNull();
  });

  it('keeps leading zeros and ignores blank reads', () => {
    const confirmer = new ScanConfirmer();
    expect(confirmer.read('   ', 0)).toBeNull();
    confirmer.read('0012345678905', 0);
    expect(confirmer.read(' 0012345678905 ', 100)).toBe('0012345678905');
  });
});
