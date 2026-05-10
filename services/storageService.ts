/**
 * IndexedDB storage service for project persistence.
 * Replaces localStorage for image-heavy project data.
 *
 * DB schema:
 *   shopee-db / projects (keyPath: id) -> ShopeeProject
 *
 * localStorage remains for lightweight data (API keys, project list, preferences).
 */

import type { ShopeeProject } from '../types/shopee';

const DB_NAME = 'shopee-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

// ============================================================================
// DB connection
// ============================================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Full-project operations
// ============================================================================

export async function saveProjectToDB(project: ShopeeProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(project);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Save project metadata while preserving any existing images in IndexedDB */
export async function mergeProjectToDB(project: ShopeeProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(project.id);
    getReq.onsuccess = () => {
      const existing: ShopeeProject | undefined = getReq.result;
      if (existing?.images && Object.keys(existing.images).length > 0) {
        project.images = { ...existing.images, ...(project.images || {}) };
      }
      // Preserve original creation time
      if (existing?.createdAt) project.createdAt = existing.createdAt;
      store.put(project);
    };
    getReq.onerror = () => { db.close(); reject(getReq.error); };
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

export async function loadProjectFromDB(id: string): Promise<ShopeeProject | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ============================================================================
// Image-specific operations (partial updates to project.images)
// ============================================================================

export async function saveProjectImage(
  projectId: string,
  promptId: string,
  dataUrl: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(projectId);
    getReq.onsuccess = () => {
      const project: ShopeeProject | undefined = getReq.result;
      if (project) {
        project.images = { ...(project.images || {}), [promptId]: dataUrl };
        project.updatedAt = Date.now();
        store.put(project);
      } else {
        // Project doesn't exist in IndexedDB yet — create it with this image
        // (handles projects created before IndexedDB migration)
        const newProject: ShopeeProject = {
          id: projectId,
          projectName: '',
          status: 'partial' as const,
          visualStyle: 'gen-z-impact' as const,
          products: [],
          skuOptions: [],
          listing: null,
          images: { [promptId]: dataUrl },
          taskMap: {},
          generationHistory: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        store.put(newProject);
      }
    };
    getReq.onerror = () => { db.close(); reject(getReq.error); };
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

export async function loadProjectImages(
  projectId: string,
): Promise<Record<string, string>> {
  const project = await loadProjectFromDB(projectId);
  return project?.images || {};
}
