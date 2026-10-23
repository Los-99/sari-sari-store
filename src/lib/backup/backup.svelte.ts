import { getMeta, setMeta } from '../db/database';
import { getRestoreSafetyCopy, listProducts, replaceAllProducts, undoLastRestore } from '../db/products';
import type { Product } from '../model/product';
import { MAX_BACKUP_BYTES, backupFileName, backupToText, buildBackup, checkBackup, type BackupCheck } from './format';

const LAST_BACKUP_KEY = 'lastBackupAt';

/**
 * What the Dashboard and Settings show about backups.
 * lastBackupAt: undefined = still loading, null = never backed up on this phone.
 */
export const backupStatus = $state({
  lastBackupAt: undefined as number | null | undefined,
  /** When the last restore happened, if it can still be undone. */
  undoAvailableSince: null as number | null,
});

export async function loadBackupStatus() {
  try {
    backupStatus.lastBackupAt = (await getMeta<number>(LAST_BACKUP_KEY)) ?? null;
    backupStatus.undoAvailableSince = (await getRestoreSafetyCopy())?.savedAt ?? null;
  } catch {
    backupStatus.lastBackupAt = null;
  }
}

/** Builds the backup file from every product (active and deactivated). */
export async function createBackupFile(): Promise<File> {
  const now = new Date();
  const products = await listProducts();
  const text = backupToText(buildBackup(products, __APP_VERSION__, now));
  return new File([text], backupFileName(now), { type: 'application/json' });
}

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled' | 'needs-tap';

/**
 * Hands the file to the phone's Share sheet (iPhone: "Save to Files";
 * Android: Drive, Messenger, Files…). Where sharing isn't available, the
 * file is downloaded instead.
 */
export async function shareBackupFile(file: File): Promise<ExportOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sari-Sari Store backup' });
      await markBackedUp();
      return 'shared';
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'AbortError') return 'cancelled';
      // Some phones only allow sharing straight after a tap; the screen asks for one more tap.
      if (name === 'NotAllowedError') return 'needs-tap';
      // Anything else: fall back to a normal download.
    }
  }
  await downloadBackupFile(file);
  return 'downloaded';
}

/** Saves the file through the browser's download (usually the Downloads folder). */
export async function downloadBackupFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  await markBackedUp();
}

async function markBackedUp() {
  const now = Date.now();
  await setMeta(LAST_BACKUP_KEY, now);
  backupStatus.lastBackupAt = now;
}

/** Reads and checks a chosen backup file. Nothing is changed by this. */
export async function readBackupFile(file: File): Promise<BackupCheck> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'This file is too large to be a Sari-Sari Store backup.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'This file is empty. It may not have been copied completely.' };
  }
  try {
    return checkBackup(await file.text());
  } catch {
    return { ok: false, error: "This file couldn't be opened. Try choosing it again." };
  }
}

export async function restoreProducts(products: readonly Product[]) {
  await replaceAllProducts(products);
  await loadBackupStatus();
}

export async function undoRestore(): Promise<number> {
  const count = await undoLastRestore();
  await loadBackupStatus();
  return count;
}

/** Whole days since the last backup, or null if never. */
export function daysSinceBackup(lastBackupAt: number | null, now = Date.now()): number | null {
  if (lastBackupAt === null) return null;
  return Math.max(0, Math.floor((now - lastBackupAt) / 86_400_000));
}
