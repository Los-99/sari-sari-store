import { getDb, getMeta, setMeta } from './database';
import { describeError } from './errors';

/**
 * Health of the on-phone database, shown on the Dashboard and in Settings.
 * - persisted: true when the browser promised not to clear the data on its own
 *   (it can still be lost if the app is removed, so backups still matter).
 * - openCount / firstOpenedAt: a simple way to see that saved data survives
 *   closing and reopening the app.
 */
export const storage = $state({
  status: 'loading' as 'loading' | 'ready' | 'error',
  errorMessage: '',
  persisted: null as boolean | null,
  openCount: 0,
  firstOpenedAt: null as number | null,
});

export async function initStorage() {
  try {
    await getDb();
    const firstOpenedAt = (await getMeta<number>('firstOpenedAt')) ?? Date.now();
    const openCount = ((await getMeta<number>('openCount')) ?? 0) + 1;
    await setMeta('firstOpenedAt', firstOpenedAt);
    await setMeta('openCount', openCount);
    storage.firstOpenedAt = firstOpenedAt;
    storage.openCount = openCount;
    storage.status = 'ready';
  } catch (error) {
    console.error('Could not open the database.', error);
    storage.errorMessage = describeError(error);
    storage.status = 'error';
    return;
  }

  storage.persisted = await requestPersistentStorage();
}

async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
