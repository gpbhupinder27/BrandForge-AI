const DB_NAME = 'BrandForgeDB';
const STORE_NAME = 'imageStore';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(true);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(true);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject(false);
    };
  });
};

export const storeImage = (id: string, dataUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject("DB not initialized. Please call initDB() on app start.");
    }
    try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(dataUrl, id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    } catch (error) {
        reject(error);
    }
  });
};

export const getImage = (id: string): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject("DB not initialized. Please call initDB() on app start.");
    }
    try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result as string | undefined);
        request.onerror = () => reject(request.error);
    } catch(error) {
        reject(error);
    }
  });
};