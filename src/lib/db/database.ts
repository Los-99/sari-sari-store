import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Product } from '../model/product';

/**
 * The app's database lives inside the phone's browser (IndexedDB).
 *
 * To change the structure later (e.g. add sales for POS), raise DB_VERSION
 * and add a new `if (oldVersion < N)` step in `upgrade` below. Never edit
 * an existing step: phones that already ran it would not run it again.
 */
export const DB_NAME = 'sari-sari-store';
export const DB_VERSION = 1;

export interface StoreSchema extends DBSchema {
  products: {
    key: number;
    value: Product;
    indexes: { barcode: string };
  };
  /** Small app settings and facts, e.g. when the last backup was made. */
  meta: {
    key: string;
    value: unknown;
  };
}

export type StoreDatabase = IDBPDatabase<StoreSchema>;

let connection: Promise<StoreDatabase> | null = null;

export function getDb(): Promise<StoreDatabase> {
  connection ??= openDB<StoreSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const products = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        // Two products can never share a barcode. Products without a
        // barcode are simply left out of this index.
        products.createIndex('barcode', 'barcode', { unique: true });
        db.createObjectStore('meta');
      }
    },
    blocking() {
      // A newer version of the app was opened in another window and needs
      // to upgrade the database. Step aside; the next request reconnects.
      void connection?.then((db) => db.close());
      connection = null;
    },
    terminated() {
      connection = null;
    },
  }).catch((error: unknown) => {
    connection = null;
    throw error;
  });
  return connection;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get('meta', key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('meta', value, key);
}
