/**
 * Decides when a barcode reading is trustworthy enough to act on.
 *
 * - The same value must be read twice in a row, close together. A single
 *   blurry frame can produce a wrong number; two matching reads rarely do.
 * - After a barcode is accepted, that same barcode is ignored for a short
 *   while, so pointing at the same item doesn't trigger it again and again.
 */
export class ScanConfirmer {
  private candidate: { value: string; at: number } | null = null;
  private lastAccepted: { value: string; at: number } | null = null;

  constructor(
    /** How close together the two matching reads must be (ms). */
    private readonly confirmWindowMs = 1500,
    /** How long the accepted barcode is ignored afterwards (ms). */
    private readonly cooldownMs = 2500,
  ) {}

  /** Feed one reading. Returns the barcode when it is confirmed, otherwise null. */
  read(value: string, now: number): string | null {
    const code = value.trim();
    if (code === '') return null;

    if (this.lastAccepted && this.lastAccepted.value === code && now - this.lastAccepted.at < this.cooldownMs) {
      return null;
    }

    if (this.candidate && this.candidate.value === code && now - this.candidate.at <= this.confirmWindowMs) {
      this.candidate = null;
      this.lastAccepted = { value: code, at: now };
      return code;
    }

    this.candidate = { value: code, at: now };
    return null;
  }

  /** Call when scanning resumes, so the cooldown starts from that moment. */
  resume(now: number) {
    this.candidate = null;
    if (this.lastAccepted) this.lastAccepted = { ...this.lastAccepted, at: now };
  }
}
