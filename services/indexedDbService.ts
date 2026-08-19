/**
 * IndexedDB Local Storage Engine for Large Media and Offline Records
 * Solves localStorage 5MB QuotaExceededError by storing bill images and large payloads in IndexedDB.
 */

const DB_NAME = 'SalesTrack_IndexedDB';
const DB_VERSION = 1;
const STORE_IMAGES = 'bill_images';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
};

export interface ImageRecord {
  id: string; // e.g. "default_user_2025-12-15" or "2025-12-15"
  date: string;
  images: string[];
  userId?: string;
  updatedAt: string;
}

export const idbSaveImages = async (id: string, date: string, images: string[], userId?: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const record: ImageRecord = {
        id,
        date,
        images,
        userId,
        updatedAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB idbSaveImages error:", err);
  }
};

export const idbGetImages = async (id: string, dateFallback?: string): Promise<ImageRecord | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else if (dateFallback) {
          // Try lookup by date fallback
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list: ImageRecord[] = allReq.result || [];
            const found = list.find(r => r.date === dateFallback || r.id.includes(dateFallback));
            resolve(found || null);
          };
          allReq.onerror = () => resolve(null);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("IndexedDB idbGetImages error:", err);
    return null;
  }
};

export const idbGetAllImages = async (): Promise<ImageRecord[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn("IndexedDB idbGetAllImages error:", err);
    return [];
  }
};

export const idbDeleteImages = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB idbDeleteImages error:", err);
  }
};

/**
 * Migrates any bloated image keys from localStorage into IndexedDB,
 * and clears them from localStorage to completely free up the 5MB browser quota.
 */
export const migrateImagesFromLocalStorage = async (): Promise<void> => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.includes('salestrack_store_images_') || k.startsWith('bill_images_')) {
        keysToRemove.push(k);
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              // Array of items
              for (const item of parsed) {
                if (item?.date && Array.isArray(item.images) && item.images.length > 0) {
                  await idbSaveImages(item.date, item.date, item.images, item.userId);
                }
              }
            } else if (parsed?.date && Array.isArray(parsed.images)) {
              await idbSaveImages(k, parsed.date, parsed.images, parsed.userId);
            }
          }
        } catch (e) {
          console.warn("Error migrating key to IDB:", k, e);
        }
      }
    }

    // Now safely remove large image keys from localStorage
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    if (keysToRemove.length > 0) {
      console.log(`Successfully migrated and freed ${keysToRemove.length} image keys from localStorage into IndexedDB.`);
    }
  } catch (e) {
    console.warn("migrateImagesFromLocalStorage warn:", e);
  }
};
