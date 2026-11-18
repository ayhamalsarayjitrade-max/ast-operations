import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type FieldDraft = {
  customerId: string; newName: string; newPhone: string; address: string;
  loc: { lat: number; lng: number } | null; photo: Blob | null;
  note: string; hasOrder: boolean; items: { product_id: string; qty: number }[]; deliveryAt: string;
};
export type FieldRecord = FieldDraft & {
  id: string; owner: string; orderId: string; resolvedCustomerId: string;
  phone: string; capturedAt: string; error?: string;
};
interface FieldDB extends DBSchema {
  drafts: { key: string; value: FieldDraft };
  outbox: { key: string; value: FieldRecord };
  cache: { key: string; value: unknown };
}
// Reuse one open connection; reopening IndexedDB on every read made the app slower over time.
let dbPromise: Promise<IDBPDatabase<FieldDB>> | null = null;
export function fieldDB() {
  dbPromise ??= openDB<FieldDB>("midan-field-v1", 1, {
    upgrade(db) { db.createObjectStore("drafts"); db.createObjectStore("outbox"); db.createObjectStore("cache"); },
    terminated() { dbPromise = null; },
  }).then((db) => {
    const close = db.close.bind(db);
    db.close = () => { dbPromise = null; close(); };
    return db;
  });
  return dbPromise;
}
export async function saveDraft(owner: string, draft: FieldDraft) {
  const db = await fieldDB(); await db.put("drafts", draft, owner);
}
export async function enqueue(record: FieldRecord) {
  const db = await fieldDB();
  const tx = db.transaction(["outbox", "drafts"], "readwrite");
  await tx.objectStore("outbox").put(record, record.id);
  await tx.objectStore("drafts").delete(record.owner);
  await tx.done;
  window.dispatchEvent(new Event("field-outbox"));
}
export async function queued(owner: string) {
  return (await (await fieldDB()).getAll("outbox")).filter(r => r.owner === owner);
}
export async function cachedRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const db = await fieldDB();
  if (!navigator.onLine) {
    const value = await db.get("cache", key);
    if (value !== undefined) return value as T;
    throw new Error("لا توجد نسخة محفوظة على هذا الجهاز");
  }
  try {
    const result = await read();
    await db.put("cache", result, key);
    return result;
  } catch (error) {
    const value = await db.get("cache", key);
    if (value !== undefined) return value as T;
    throw error;
  }
}