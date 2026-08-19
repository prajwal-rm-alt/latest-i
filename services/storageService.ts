import { DailyReport, UserProfile, Complaint, SaleItem, StoreEODEntry, AttendanceEntry, FollowUp } from '../types';
import { db, auth, logoutFirebase } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  idbSaveImages, 
  idbGetImages, 
  idbGetAllImages, 
  idbDeleteImages, 
  migrateImagesFromLocalStorage 
} from './indexedDbService';

// Run migration on init to free up any bloated localStorage quota from previous sessions
if (typeof window !== 'undefined') {
  migrateImagesFromLocalStorage().catch(console.warn);
}

const LS_KEYS = {
  USER: 'app_user_profile',
  THEME: 'app_theme_mode',
  STORE_PREFIX: 'salestrack_store_',
};

export const getUser = (): UserProfile | null => {
  try {
    const item = localStorage.getItem(LS_KEYS.USER);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

const getUid = (): string => {
  return auth.currentUser?.uid || getUser()?.uid || getUser()?.userId || 'default_user';
};

const getDocId = (key: string, storeName?: string) => {
  return storeName === 'users' ? key : `${getUid()}_${key}`;
};

// Date Normalization Helper to guarantee YYYY-MM-DD
export const normalizeDateString = (input: any): string => {
  if (!input) return new Date().toISOString().split('T')[0];
  const str = String(input).trim();
  
  // Strict YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // ISO strings 2024-05-12T...
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.split('T')[0];
  }
  
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  // YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const y = yyyymmdd[1];
    const m = yyyymmdd[2].padStart(2, '0');
    const d = yyyymmdd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fallback to JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
};

// Local storage backup keys
const getLocalKey = (storeName: string, key: string) => `${LS_KEYS.STORE_PREFIX}${storeName}_${getUid()}_${key}`;
const getLocalCollectionKey = (storeName: string) => `${LS_KEYS.STORE_PREFIX}${storeName}_${getUid()}_all`;

const getLocalItem = <T>(storeName: string, key: string): T | undefined => {
  try {
    const exact = localStorage.getItem(getLocalKey(storeName, key));
    if (exact) return JSON.parse(exact);

    // Fallback: check collection
    const all = getLocalAll<T>(storeName);
    const found = all.find((i: any) => (i?.date || i?.id || i?.uid) === key);
    return found;
  } catch {
    return undefined;
  }
};

const setLocalItem = <T>(storeName: string, key: string, data: T): void => {
  // Never store heavy images in localStorage to avoid hitting browser 5MB quota
  if (storeName === 'images') return;

  try {
    localStorage.setItem(getLocalKey(storeName, key), JSON.stringify(data));
    const all = getLocalAll<T>(storeName);
    const idKey = (data as any)?.date || (data as any)?.id || key;
    const existingIndex = all.findIndex((i: any) => (i?.date || i?.id || i?.uid) === idKey);
    if (existingIndex >= 0) {
      all[existingIndex] = data;
    } else {
      all.push(data);
    }
    localStorage.setItem(getLocalCollectionKey(storeName), JSON.stringify(all));
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.warn("Storage quota exceeded! Cleaning up legacy caches...");
      // Purge any accidental bloated image keys from localStorage
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.includes('images_') || k.includes('salestrack_store_images_'))) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(getLocalKey(storeName, key), JSON.stringify(data));
      } catch {}
    } else {
      console.warn("setLocalItem warning:", e);
    }
  }
};

const removeLocalItem = (storeName: string, key: string): void => {
  if (storeName === 'images') return;
  try {
    localStorage.removeItem(getLocalKey(storeName, key));
    const all = getLocalAll(storeName);
    const filtered = all.filter((i: any) => (i?.date || i?.id || i?.uid) !== key);
    localStorage.setItem(getLocalCollectionKey(storeName), JSON.stringify(filtered));
  } catch (e) {
    console.error("removeLocalItem error", e);
  }
};

/**
 * Universal Local Collector:
 * Gathers and merges data from the current user's local key AND any legacy/previous
 * keys in localStorage so imported reports are NEVER lost when UID changes.
 */
const getLocalAll = <T>(storeName: string): T[] => {
  if (storeName === 'images') return [];
  try {
    const map = new Map<string, T>();

    // 1. Scan primary key for active UID
    const primaryKey = getLocalCollectionKey(storeName);
    const primaryRaw = localStorage.getItem(primaryKey);
    if (primaryRaw) {
      try {
        const parsed = JSON.parse(primaryRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const key = item?.date ? normalizeDateString(item.date) : (item?.id || item?.uid || JSON.stringify(item));
            if (item?.date) item.date = key;
            map.set(key, item);
          });
        }
      } catch {}
    }

    // 2. Scan ALL localStorage keys matching this storeName to catch legacy or previous-UID data
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.startsWith(`${LS_KEYS.STORE_PREFIX}${storeName}_`) && k.endsWith('_all') && k !== primaryKey) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                const key = item?.date ? normalizeDateString(item.date) : (item?.id || item?.uid || JSON.stringify(item));
                if (item?.date) item.date = key;
                if (!map.has(key)) {
                  map.set(key, item);
                }
              });
            }
          }
        } catch {}
      } else if (k.startsWith(`${LS_KEYS.STORE_PREFIX}${storeName}_`) && !k.endsWith('_all')) {
        // Individual doc keys
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const item = JSON.parse(raw);
            const key = item?.date ? normalizeDateString(item.date) : (item?.id || item?.uid);
            if (key) {
              if (item?.date) item.date = key;
              if (!map.has(key)) {
                map.set(key, item);
              }
            }
          }
        } catch {}
      }
    }

    const mergedList = Array.from(map.values());

    // Keep primary key up to date if we recovered missing items
    if (mergedList.length > 0) {
      try {
        localStorage.setItem(primaryKey, JSON.stringify(mergedList));
      } catch {}
    }

    return mergedList;
  } catch {
    return [];
  }
};

export const getFromStore = async <T>(storeName: string, key: string): Promise<T | undefined> => {
  const normKey = storeName === 'sales' || storeName === 'images' || storeName === 'attendance' || storeName === 'eod' ? normalizeDateString(key) : key;
  const docId = getDocId(normKey, storeName);

  if (storeName === 'images') {
    // 1. Check IndexedDB first
    const idbRecord = await idbGetImages(docId, normKey);
    let localVal: T | undefined = idbRecord ? ({ date: idbRecord.date, images: idbRecord.images, userId: idbRecord.userId } as T) : undefined;
    
    // 2. Check Cloud
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const docRef = doc(db, storeName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as T;
          const images = (cloudData as any)?.images || [];
          await idbSaveImages(docId, normKey, images, uid);
          return cloudData;
        }
      } catch (e) {
        console.warn("getFromStore images cloud fetch warn", e);
      }
    }
    return localVal;
  }

  const localVal = getLocalItem<T>(storeName, normKey);
  const uid = auth.currentUser?.uid;
  if (!uid) return localVal;

  try {
    const docRef = doc(db, storeName, getDocId(normKey, storeName));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as T;
      setLocalItem(storeName, normKey, data);
      return data;
    }
    return localVal;
  } catch (e) {
    console.warn("getFromStore fallback to local cache", e);
    return localVal;
  }
};

export const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  const uid = auth.currentUser?.uid;

  if (storeName === 'images') {
    const idbList = await idbGetAllImages();
    const map = new Map<string, any>();
    idbList.forEach(r => {
      map.set(r.date, { date: r.date, images: r.images, userId: r.userId });
    });

    if (uid) {
      try {
        const q = query(collection(db, storeName), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.docs.forEach(docSnap => {
          const item = docSnap.data() as any;
          if (item?.date) {
            const norm = normalizeDateString(item.date);
            map.set(norm, { ...item, date: norm });
            idbSaveImages(getDocId(norm, storeName), norm, item.images || [], uid);
          }
        });
      } catch (e) {
        console.warn("getAllFromStore images cloud warning", e);
      }
    }

    return Array.from(map.values()) as T[];
  }

  const localList = getLocalAll<T>(storeName);
  if (!uid) return localList;

  try {
    const q = query(collection(db, storeName), where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    
    // Merge cloud data and local data seamlessly
    const mergedMap = new Map<string, T>();

    // First insert all local items
    localList.forEach((item: any) => {
      const k = item?.date ? normalizeDateString(item.date) : (item?.id || item?.uid || JSON.stringify(item));
      if (item?.date) item.date = k;
      mergedMap.set(k, item);
    });

    // Merge cloud items
    if (!querySnapshot.empty) {
      querySnapshot.docs.forEach(docSnap => {
        const item = docSnap.data() as any;
        const k = item?.date ? normalizeDateString(item.date) : (item?.id || item?.uid || docSnap.id);
        if (item?.date) item.date = k;
        mergedMap.set(k, item as T);
      });
    }

    const merged = Array.from(mergedMap.values());
    try {
      localStorage.setItem(getLocalCollectionKey(storeName), JSON.stringify(merged));
    } catch {}

    return merged;
  } catch (e) {
    console.warn("getAllFromStore fallback to local cache", e);
    return localList;
  }
};

export const putToStore = async <T>(storeName: string, key: string, data: T): Promise<void> => {
  const normKey = storeName === 'sales' || storeName === 'images' || storeName === 'attendance' || storeName === 'eod' ? normalizeDateString(key) : key;
  const uid = getUid();
  const docId = getDocId(normKey, storeName);
  const payload = { ...(data as any), userId: (data as any)?.userId || uid };
  if (payload.date) payload.date = normKey;

  if (storeName === 'images') {
    const images = (payload as any)?.images || [];
    await idbSaveImages(docId, normKey, images, uid);
  } else {
    setLocalItem(storeName, normKey, payload);
  }

  if (auth.currentUser?.uid) {
    try {
      const docRef = doc(db, storeName, docId);
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn("putToStore cloud write warning", e);
    }
  }
};

export const deleteFromStore = async (storeName: string, key: string): Promise<void> => {
  const normKey = storeName === 'sales' || storeName === 'images' || storeName === 'attendance' || storeName === 'eod' ? normalizeDateString(key) : key;
  const docId = getDocId(normKey, storeName);

  if (storeName === 'images') {
    await idbDeleteImages(docId);
    await idbDeleteImages(normKey);
  } else {
    removeLocalItem(storeName, normKey);
  }

  if (auth.currentUser?.uid) {
    try {
      await deleteDoc(doc(db, storeName, docId));
    } catch (e) {
      console.warn("deleteFromStore cloud delete warning", e);
    }
  }
};

export const saveUser = async (user: UserProfile) => {
  try {
    const activeUid = auth.currentUser?.uid || user.uid || user.userId || getUid();
    const profileToSave = { ...user, uid: activeUid, userId: activeUid };
    localStorage.setItem(LS_KEYS.USER, JSON.stringify(profileToSave));

    if (auth.currentUser?.uid) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, { 
        ...profileToSave, 
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || user.email || '' 
      }, { merge: true });
    }
  } catch (e) {
    console.error("saveUser error", e);
  }
};

export const ensureUserProfileFromGoogle = async (firebaseUser: User): Promise<UserProfile> => {
  try {
    // 1. Try to load from Firestore
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const cloudProfile = docSnap.data() as UserProfile;
      const fullProfile = { ...cloudProfile, uid: firebaseUser.uid, userId: firebaseUser.uid };
      localStorage.setItem(LS_KEYS.USER, JSON.stringify(fullProfile));
      return fullProfile;
    }
  } catch (e) {
    console.warn("Could not fetch remote user profile, using Google defaults", e);
  }

  // 2. Try from local storage
  const existingLocal = getUser();
  if (existingLocal) {
    const updated = { ...existingLocal, uid: firebaseUser.uid, userId: firebaseUser.uid };
    localStorage.setItem(LS_KEYS.USER, JSON.stringify(updated));
    return updated;
  }

  // 3. Auto-provision profile from Google Account
  const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Field Executive';
  const autoProfile: UserProfile = {
    uid: firebaseUser.uid,
    userId: firebaseUser.uid,
    name: displayName.toUpperCase(),
    email: firebaseUser.email || '',
    employeeId: `EMP-${firebaseUser.uid.slice(0, 4).toUpperCase()}`,
    phoneNumber: firebaseUser.phoneNumber || '',
    storeName: 'RELIANCE DIGITAL',
    monthlyTarget: 100000,
    avatar: firebaseUser.photoURL || undefined
  };

  try {
    localStorage.setItem(LS_KEYS.USER, JSON.stringify(autoProfile));
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, autoProfile, { merge: true });
  } catch (e) {
    console.warn("Auto-provision save warn", e);
  }

  return autoProfile;
};

export const logoutUser = async () => {
  try {
    localStorage.removeItem(LS_KEYS.USER);
    await logoutFirebase();
  } catch (e) {
    console.error("logoutUser error", e);
  }
};

export const getTheme = (): 'light' | 'dark' => {
  try {
    return (localStorage.getItem(LS_KEYS.THEME) as 'light' | 'dark') || 'light';
  } catch {
    return 'light';
  }
};

export const saveTheme = (theme: 'light' | 'dark') => {
  try {
    localStorage.setItem(LS_KEYS.THEME, theme);
  } catch {}
};

export const getSalesWithoutImages = async (): Promise<DailyReport[]> => {
  const all = await getAllFromStore<DailyReport>('sales');
  // Sort descending by date
  return all.sort((a, b) => b.date.localeCompare(a.date));
};

export const getSalesByMonth = async (monthPrefix: string): Promise<DailyReport[]> => {
  const allSales = await getSalesWithoutImages();
  return allSales.filter(s => s.date.startsWith(monthPrefix));
};

export const getSales = (): Promise<DailyReport[]> => getSalesWithoutImages();

export const getImagesForDate = async (date: string): Promise<string[]> => {
  const normDate = normalizeDateString(date);
  const record = await getFromStore<{date: string, images: string[]}>('images', normDate);
  return record?.images || [];
};

export const saveSaleEntry = async (date: string, newItems: SaleItem[], newBillImages: string[] = []) => {
  const normDate = normalizeDateString(date);
  const existing = await getFromStore<DailyReport>('sales', normDate);
  const existingImagesRecord = await getFromStore<{date: string, images: string[]}>('images', normDate);

  const calculateTotals = (items: SaleItem[]) => ({
    totalQty: items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
    totalValue: items.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0),
  });

  const existingImages = existingImagesRecord?.images || [];
  const mergedImages = [...existingImages, ...newBillImages];

  if (mergedImages.length > 0) {
    await putToStore('images', normDate, { date: normDate, images: mergedImages });
  }

  if (existing) {
    const updatedItems = [...(existing.items || []), ...newItems];
    const { totalQty, totalValue } = calculateTotals(updatedItems);
    const reportToSave: DailyReport = {
      ...existing,
      date: normDate,
      items: updatedItems,
      totalQty,
      totalValue,
    };
    delete reportToSave.billImages;
    delete reportToSave.billImage;
    await putToStore('sales', normDate, reportToSave);
  } else {
    const { totalQty, totalValue } = calculateTotals(newItems);
    const reportToSave: DailyReport = {
      date: normDate,
      items: newItems,
      totalQty,
      totalValue,
    };
    await putToStore('sales', normDate, reportToSave);
  }
};

export const updateDailyReport = async (date: string, updatedReport: DailyReport) => {
  const normDate = normalizeDateString(date);
  const reportToSave = { ...updatedReport, date: normDate };
  if (reportToSave.billImages !== undefined) {
    await putToStore('images', normDate, { date: normDate, images: reportToSave.billImages });
    delete reportToSave.billImages;
    delete reportToSave.billImage;
  }
  await putToStore('sales', normDate, reportToSave);
};

export const deleteDailyReport = async (date: string) => {
  const normDate = normalizeDateString(date);
  await deleteFromStore('sales', normDate);
  await deleteFromStore('images', normDate);
};

export const getEODEntries = (): Promise<StoreEODEntry[]> => getAllFromStore<StoreEODEntry>('eod');
export const saveEODEntry = async (entry: StoreEODEntry) => {
  const normDate = normalizeDateString(entry.date);
  await putToStore('eod', normDate, { ...entry, date: normDate });
};
export const deleteEODEntry = async (date: string) => {
  const normDate = normalizeDateString(date);
  await deleteFromStore('eod', normDate);
};

export const getComplaints = (): Promise<Complaint[]> => getAllFromStore<Complaint>('crm');
export const saveComplaint = async (complaint: Complaint) => {
  await putToStore('crm', complaint.id, complaint);
};
export const updateComplaint = async (updated: Complaint) => {
  await putToStore('crm', updated.id, updated);
};

export const getFollowUps = (): Promise<FollowUp[]> => getAllFromStore<FollowUp>('followups');
export const saveFollowUp = async (followUp: FollowUp) => {
  await putToStore('followups', followUp.id, followUp);
};
export const updateFollowUp = async (updated: FollowUp) => {
  await putToStore('followups', updated.id, updated);
};
export const deleteFollowUp = async (id: string) => {
  await deleteFromStore('followups', id);
};

export const getAttendance = (): Promise<AttendanceEntry[]> => getAllFromStore<AttendanceEntry>('attendance');
export const saveAttendance = async (entry: AttendanceEntry) => {
  const normDate = normalizeDateString(entry.date);
  await putToStore('attendance', normDate, { ...entry, date: normDate });
};

export const forceCloudSync = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, message: 'You must be logged in to sync with the cloud.' };
    
    await getAllFromStore('sales');
    await getAllFromStore('images');
    await getAllFromStore('eod');
    await getAllFromStore('crm');
    await getAllFromStore('followups');
    await getAllFromStore('attendance');
    
    return { success: true, message: 'All data successfully synced from the cloud! ✅' };
  } catch (error: any) {
    return { success: false, message: 'Cloud sync failed: ' + (error.message || String(error)) };
  }
};

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(dataUrl);
      } else {
        reject(new Error('Canvas context unavailable'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = objectUrl;
  });
};

// FULL UNIVERSAL BACKUP ENGINE
export interface BackupPackage {
  app: 'SalesTrack';
  version: string;
  timestamp: string;
  data: {
    user?: UserProfile;
    sales?: DailyReport[];
    images?: { date: string; images: string[] }[];
    eod?: StoreEODEntry[];
    crm?: Complaint[];
    followups?: FollowUp[];
    attendance?: AttendanceEntry[];
  };
}

export const exportFullBackup = async (): Promise<void> => {
  const currentUser = getUser();
  const sales = await getAllFromStore<DailyReport>('sales');
  const images = await getAllFromStore<{ date: string; images: string[] }>('images');
  const eod = await getAllFromStore<StoreEODEntry>('eod');
  const crm = await getAllFromStore<Complaint>('crm');
  const followups = await getAllFromStore<FollowUp>('followups');
  const attendance = await getAllFromStore<AttendanceEntry>('attendance');

  const backupPackage: BackupPackage = {
    app: 'SalesTrack',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    data: {
      user: currentUser || undefined,
      sales,
      images,
      eod,
      crm,
      followups,
      attendance,
    }
  };

  const jsonString = JSON.stringify(backupPackage, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = currentUser?.name ? currentUser.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Executive';
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `SalesTrack_Backup_${safeName}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Universal JSON Backup Restorer:
 * Supports every historical structure, flat array, nested package, date-keyed dictionary,
 * legacy field names, and formats with automatic date & type normalization.
 */
export const importFullBackup = async (jsonString: string): Promise<{ success: boolean; message: string; count: number }> => {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { success: false, message: 'Empty or invalid backup file.', count: 0 };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return { success: false, message: 'Invalid JSON syntax: ' + (e.message || String(e)), count: 0 };
    }

    const currentUid = getUid();
    let salesReportsToImport: DailyReport[] = [];
    let eodEntriesToImport: StoreEODEntry[] = [];
    let crmEntriesToImport: Complaint[] = [];
    let followupsToImport: FollowUp[] = [];
    let attendanceToImport: AttendanceEntry[] = [];
    let standaloneImagesToImport: { date: string; images: string[] }[] = [];
    let restoredUser: UserProfile | undefined = undefined;

    // Helper to normalize single sale item
    const normalizeSaleItem = (si: any, dateKey: string, idx: number): SaleItem => {
      const name = si.productName || si.product || si.name || si.model || si.title || si.item || 'Sales Item';
      const qty = Number(si.quantity || si.qty || si.count || si.q || 1) || 1;
      const price = Number(si.price || si.rate || si.amount || si.cost || si.unitPrice || si.mrp || 0) || 0;
      const phone = si.customerPhone || si.phone || si.mobile || si.customerMobile || si.contact || '';
      const bill = si.billId || si.invoiceNo || si.invoice || si.billNo || si.bill || '';
      const txn = si.txnNumber || si.txn || si.transactionId || '';
      const id = si.id || `item_${dateKey}_${idx}_${Date.now()}`;

      return {
        id,
        productName: String(name),
        quantity: qty,
        price: price,
        customerPhone: String(phone),
        billId: String(bill),
        txnNumber: String(txn),
      };
    };

    // CASE 1: Flat Array of Daily Reports or Flat Array of Sale Items
    if (Array.isArray(parsed)) {
      const dateMap = new Map<string, DailyReport>();

      parsed.forEach((entry: any, index: number) => {
        if (!entry) return;
        const rawDate = entry.date || entry.saleDate || entry.createdDate || entry.timestamp || new Date().toISOString();
        const dateKey = normalizeDateString(rawDate);

        if (Array.isArray(entry.items || entry.saleItems)) {
          // It's a daily report object
          const rawItems = entry.items || entry.saleItems || [];
          const normalizedItems = rawItems.map((si: any, i: number) => normalizeSaleItem(si, dateKey, i));
          const totalQty = entry.totalQty !== undefined ? Number(entry.totalQty) : normalizedItems.reduce((s: number, i: SaleItem) => s + i.quantity, 0);
          const totalValue = entry.totalValue !== undefined ? Number(entry.totalValue) : normalizedItems.reduce((s: number, i: SaleItem) => s + (i.price * i.quantity), 0);

          dateMap.set(dateKey, {
            date: dateKey,
            items: normalizedItems,
            totalQty,
            totalValue,
            isWeekOff: Boolean(entry.isWeekOff || entry.weekOff),
            notes: entry.notes || '',
            userId: currentUid,
          });
        } else if (entry.productName || entry.product || entry.name || entry.price || entry.amount) {
          // Flat individual item row
          const item = normalizeSaleItem(entry, dateKey, index);
          const existing = dateMap.get(dateKey) || {
            date: dateKey,
            items: [],
            totalQty: 0,
            totalValue: 0,
            isWeekOff: false,
            notes: '',
            userId: currentUid,
          };
          existing.items.push(item);
          existing.totalQty += item.quantity;
          existing.totalValue += (item.price * item.quantity);
          dateMap.set(dateKey, existing);
        }
      });

      salesReportsToImport = Array.from(dateMap.values());
    } 
    // CASE 2: Nested Object or Package or Key-Value Dictionary
    else if (parsed && typeof parsed === 'object') {
      const payload = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : parsed;

      // Extract User Profile
      restoredUser = payload.user || payload.userProfile || parsed.user;

      // Extract Sales
      const rawSales = payload.sales || payload.reports || payload.salesData || payload.entries || payload.dailyReports || payload.allSales;

      if (Array.isArray(rawSales)) {
        rawSales.forEach((item: any) => {
          if (!item || !item.date) return;
          const dateKey = normalizeDateString(item.date);
          const rawItems = item.items || item.saleItems || [];
          const normalizedItems = Array.isArray(rawItems) ? rawItems.map((si: any, i: number) => normalizeSaleItem(si, dateKey, i)) : [];
          const totalQty = item.totalQty !== undefined ? Number(item.totalQty) : normalizedItems.reduce((sum, i) => sum + i.quantity, 0);
          const totalValue = item.totalValue !== undefined ? Number(item.totalValue) : normalizedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

          salesReportsToImport.push({
            date: dateKey,
            items: normalizedItems,
            totalQty,
            totalValue,
            isWeekOff: Boolean(item.isWeekOff || item.weekOff),
            notes: item.notes || '',
            userId: currentUid,
          });

          const embeddedImages: string[] = item.billImages || (item.billImage ? [item.billImage] : []);
          if (embeddedImages.length > 0) {
            standaloneImagesToImport.push({ date: dateKey, images: embeddedImages });
          }
        });
      } else if (rawSales && typeof rawSales === 'object') {
        // Date-keyed object dictionary: { "2024-05-12": { items: [...] } }
        Object.entries(rawSales).forEach(([k, v]: [string, any]) => {
          if (!v) return;
          const dateKey = normalizeDateString(v.date || k);
          const rawItems = v.items || v.saleItems || (Array.isArray(v) ? v : []);
          const normalizedItems = Array.isArray(rawItems) ? rawItems.map((si: any, i: number) => normalizeSaleItem(si, dateKey, i)) : [];
          const totalQty = v.totalQty !== undefined ? Number(v.totalQty) : normalizedItems.reduce((sum, i) => sum + i.quantity, 0);
          const totalValue = v.totalValue !== undefined ? Number(v.totalValue) : normalizedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

          salesReportsToImport.push({
            date: dateKey,
            items: normalizedItems,
            totalQty,
            totalValue,
            isWeekOff: Boolean(v.isWeekOff || v.weekOff),
            notes: v.notes || '',
            userId: currentUid,
          });
        });
      } else {
        // Check if root object itself contains date keys: { "2024-05-01": {...}, "2024-05-02": {...} }
        const potentialDateKeys = Object.keys(parsed).filter(k => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(k) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(k));
        if (potentialDateKeys.length > 0) {
          potentialDateKeys.forEach(k => {
            const v = parsed[k];
            if (!v) return;
            const dateKey = normalizeDateString(v.date || k);
            const rawItems = v.items || v.saleItems || (Array.isArray(v) ? v : []);
            const normalizedItems = Array.isArray(rawItems) ? rawItems.map((si: any, i: number) => normalizeSaleItem(si, dateKey, i)) : [];
            const totalQty = v.totalQty !== undefined ? Number(v.totalQty) : normalizedItems.reduce((sum, i) => sum + i.quantity, 0);
            const totalValue = v.totalValue !== undefined ? Number(v.totalValue) : normalizedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

            salesReportsToImport.push({
              date: dateKey,
              items: normalizedItems,
              totalQty,
              totalValue,
              isWeekOff: Boolean(v.isWeekOff || v.weekOff),
              notes: v.notes || '',
              userId: currentUid,
            });
          });
        }
      }

      // Extract EOD
      const rawEod = payload.eod || payload.eodEntries || [];
      if (Array.isArray(rawEod)) {
        rawEod.forEach((entry: any) => {
          if (!entry || !entry.date) return;
          eodEntriesToImport.push({
            date: normalizeDateString(entry.date),
            achievement: Number(entry.achievement || entry.dayAchieve || 0) || 0,
            eolAchieve: Number(entry.eolAchieve || 0) || 0,
            dayTarget: Number(entry.dayTarget || 0) || 0,
            weekTarget: Number(entry.weekTarget || 0) || 0,
            eolTarget: Number(entry.eolTarget || 0) || 0,
            userId: currentUid,
          });
        });
      }

      // Extract CRM
      const rawCrm = payload.crm || payload.complaints || [];
      if (Array.isArray(rawCrm)) {
        rawCrm.forEach((comp: any) => {
          if (!comp) return;
          crmEntriesToImport.push({
            id: String(comp.id || `crm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
            customerName: comp.customerName || comp.name || 'Customer',
            phoneNumber: comp.phoneNumber || comp.phone || '',
            productModel: comp.productModel || comp.product || comp.model || 'Model',
            issueType: comp.issueType || 'Complaint',
            customProductName: comp.customProductName || '',
            status: comp.status || (comp.isResolved ? 'Resolved' : 'Raised'),
            timeline: Array.isArray(comp.timeline) ? comp.timeline : [
              { status: comp.status || 'Raised', date: comp.date || new Date().toISOString(), note: 'Imported' }
            ],
            date: normalizeDateString(comp.date || new Date().toISOString()),
            repairsDone: comp.repairsDone || '',
            partsReplaced: comp.partsReplaced || '',
            userId: currentUid,
          });
        });
      }

      // Extract Followups
      const rawFollowups = payload.followups || payload.followUps || [];
      if (Array.isArray(rawFollowups)) {
        rawFollowups.forEach((fu: any) => {
          if (!fu) return;
          followupsToImport.push({
            id: String(fu.id || `fu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
            customerName: fu.customerName || 'Customer',
            phoneNumber: fu.phoneNumber || '',
            reminderDate: normalizeDateString(fu.reminderDate || new Date().toISOString()),
            note: fu.note || '',
            isCompleted: Boolean(fu.isCompleted),
            createdAt: fu.createdAt || new Date().toISOString(),
            userId: currentUid,
          });
        });
      }

      // Extract Attendance
      const rawAttendance = payload.attendance || payload.attendanceList || [];
      if (Array.isArray(rawAttendance)) {
        rawAttendance.forEach((att: any) => {
          if (!att || !att.date) return;
          attendanceToImport.push({
            date: normalizeDateString(att.date),
            status: att.status || 'Present',
            checkInTime: att.checkInTime || '',
            location: att.location || undefined,
            userId: currentUid,
          });
        });
      }

      // Extract Images
      const rawImages = payload.images || [];
      if (Array.isArray(rawImages)) {
        rawImages.forEach((img: any) => {
          if (img && img.date && Array.isArray(img.images)) {
            standaloneImagesToImport.push({ date: normalizeDateString(img.date), images: img.images });
          }
        });
      }
    }

    // PERSIST ALL IMPORTED DATA
    // 1. User Profile
    if (restoredUser && typeof restoredUser === 'object') {
      const activeUser = getUser();
      const updatedUser: UserProfile = {
        ...restoredUser,
        uid: activeUser?.uid || restoredUser.uid || currentUid,
        userId: activeUser?.userId || restoredUser.userId || currentUid,
        name: restoredUser.name || activeUser?.name || 'Sales Executive',
        storeName: restoredUser.storeName || activeUser?.storeName || 'RELIANCE DIGITAL',
        monthlyTarget: Number(restoredUser.monthlyTarget) || activeUser?.monthlyTarget || 100000,
        employeeId: restoredUser.employeeId || activeUser?.employeeId || 'EMP-1001',
        phoneNumber: restoredUser.phoneNumber || activeUser?.phoneNumber || '',
      };
      await saveUser(updatedUser);
    }

    // 2. Sales Reports
    for (const report of salesReportsToImport) {
      await putToStore('sales', report.date, report);
    }

    // 3. Images
    for (const img of standaloneImagesToImport) {
      await putToStore('images', img.date, img);
    }

    // 4. EOD
    for (const eod of eodEntriesToImport) {
      await putToStore('eod', eod.date, eod);
    }

    // 5. CRM
    for (const crm of crmEntriesToImport) {
      await putToStore('crm', crm.id, crm);
    }

    // 6. Followups
    for (const fu of followupsToImport) {
      await putToStore('followups', fu.id, fu);
    }

    // 7. Attendance
    for (const att of attendanceToImport) {
      await putToStore('attendance', att.date, att);
    }

    return {
      success: true,
      count: salesReportsToImport.length,
      message: `Restored ${salesReportsToImport.length} sales reports, ${eodEntriesToImport.length} EOD entries, and ${crmEntriesToImport.length} CRM cases successfully.`,
    };
  } catch (err: any) {
    console.error("importFullBackup failed", err);
    return {
      success: false,
      count: 0,
      message: 'Restore failed: ' + (err?.message || String(err)),
    };
  }
};
