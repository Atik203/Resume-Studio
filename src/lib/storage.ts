import type { ProjectData } from './data';

const DB_NAME = 'resume-studio-local';
const STORE = 'project';
const KEY = 'active';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local browser storage.'));
  });
}

export async function loadProject(): Promise<ProjectData | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function saveProject(project: ProjectData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project, KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Could not save project locally.')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Local save was interrupted.')); };
  });
}
