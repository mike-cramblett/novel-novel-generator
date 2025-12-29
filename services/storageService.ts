
// services/storageService.ts

const DB_NAME = 'NovelWeaverDB';
const STORE_NAME = 'NovelState';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      dbPromise = null;
      reject('Error opening IndexedDB');
    };

    request.onblocked = () => {
      console.warn('IndexedDB opening is blocked by another tab.');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

export async function saveState(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`Failed to save state for ${key}:`, e);
  }
}

export async function loadState<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`Failed to load state for ${key}:`, e);
    return undefined;
  }
}

export async function clearState(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to clear state:', e);
  }
}

export async function hasSavedState(): Promise<boolean> {
  try {
    const outline = await loadState('outline');
    const novelContent = await loadState('novelContent');
    const isExternal = await loadState('isExternal');
    return !!(outline || novelContent || isExternal);
  } catch (e) {
    return false;
  }
}
