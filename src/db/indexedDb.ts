const DB_NAME = 'ChaiTrackSQLite';
const STORE_NAME = 'sqlite_store';
const DB_KEY = 'main_db_binary';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSqliteFromIndexedDB(): Promise<Uint8Array | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(DB_KEY);
    req.onsuccess = () => {
      const result = req.result;
      if (result instanceof Uint8Array) {
        resolve(result);
      } else if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSqliteToIndexedDB(bytes: Uint8Array): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(bytes, DB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
