import type { ProjectData, ResumeSnapshot } from './data';

const DB_NAME = 'resume-studio-local';
const DB_VERSION = 2;
const STORE = 'project';
const SNAPSHOTS_STORE = 'snapshots';
const KEY = 'active';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local browser storage.'));
  });
}

export async function loadProject(): Promise<ProjectData | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function saveProject(project: ProjectData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Could not save project locally.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Local save was interrupted.'));
    };
  });
}

export async function loadSnapshots(): Promise<ResumeSnapshot[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
      const store = tx.objectStore(SNAPSHOTS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const list = (request.result as ResumeSnapshot[]) || [];
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return [];
  }
}

export async function saveSnapshot(snapshot: ResumeSnapshot): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    tx.objectStore(SNAPSHOTS_STORE).put(snapshot);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Could not save snapshot.'));
    };
  });
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
    tx.objectStore(SNAPSHOTS_STORE).delete(snapshotId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Could not delete snapshot.'));
    };
  });
}
