// IndexedDB 래퍼 — 교재 데이터, 점수 기록, 보상 영상(Blob), 설정 저장
const DB_NAME = "subin-app";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("korean")) {
        db.createObjectStore("korean", { keyPath: "grade" });
      }
      if (!db.objectStoreNames.contains("english")) {
        db.createObjectStore("english", { keyPath: "unit" });
      }
      if (!db.objectStoreNames.contains("records")) {
        db.createObjectStore("records", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("rewards")) {
        db.createObjectStore("rewards", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const DB = {
  async getAll(storeName) {
    const db = await openDB();
    const t = db.transaction(storeName, "readonly");
    return reqToPromise(t.objectStore(storeName).getAll());
  },
  async get(storeName, key) {
    const db = await openDB();
    const t = db.transaction(storeName, "readonly");
    return reqToPromise(t.objectStore(storeName).get(key));
  },
  async put(storeName, value) {
    const db = await openDB();
    const t = db.transaction(storeName, "readwrite");
    const result = reqToPromise(t.objectStore(storeName).put(value));
    return result;
  },
  async delete(storeName, key) {
    const db = await openDB();
    const t = db.transaction(storeName, "readwrite");
    return reqToPromise(t.objectStore(storeName).delete(key));
  },
  async clear(storeName) {
    const db = await openDB();
    const t = db.transaction(storeName, "readwrite");
    return reqToPromise(t.objectStore(storeName).clear());
  },
};

export async function kvGet(key, fallback = undefined) {
  const row = await DB.get("kv", key);
  return row ? row.value : fallback;
}

export async function kvSet(key, value) {
  return DB.put("kv", { key, value });
}

export async function seedDefaultsIfEmpty(koreanDefault, englishDefault) {
  const existingKorean = await DB.getAll("korean");
  if (existingKorean.length === 0) {
    for (const g of koreanDefault.grades) {
      await DB.put("korean", { grade: g.grade, title: g.title, warn: !!g.warn, items: g.items.map((text, i) => ({ no: i + 1, text, read: null })) });
    }
  }
  const existingEnglish = await DB.getAll("english");
  if (existingEnglish.length === 0) {
    for (const u of englishDefault.units) {
      await DB.put("english", { unit: u.unit, book: englishDefault.book, words: u.words.map((w, i) => ({ no: i + 1, ...w })) });
    }
  }
}
