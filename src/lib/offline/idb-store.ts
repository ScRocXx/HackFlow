// Lightweight, zero-dependency browser IndexedDB store for offline resilience.

const DB_NAME = 'hackflow_offline_v1'
const DB_VERSION = 1
const STORE_OUTBOX = 'outbox_mutations'
const STORE_CACHE = 'cached_state'

export interface OutboxMutation {
  id: string
  type: 'DELIVERABLE_TOGGLE' | 'DELIVERABLE_CLAIM' | 'DELIVERABLE_ADD' | 'SCRATCHPAD_UPDATE'
  payload: any
  timestamp: number
  retryCount: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addOutboxMutation(
  mutation: Omit<OutboxMutation, 'id' | 'timestamp' | 'retryCount'>
): Promise<OutboxMutation> {
  const db = await openDB()
  const entry: OutboxMutation = {
    ...mutation,
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retryCount: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite')
    const store = tx.objectStore(STORE_OUTBOX)
    const req = store.add(entry)
    req.onsuccess = () => resolve(entry)
    req.onerror = () => reject(req.error)
  })
}

export async function getOutboxMutations(): Promise<OutboxMutation[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly')
      const store = tx.objectStore(STORE_OUTBOX)
      const req = store.getAll()
      req.onsuccess = () => {
        const sorted = (req.result as OutboxMutation[]).sort(
          (a, b) => a.timestamp - b.timestamp
        )
        resolve(sorted)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function removeOutboxMutation(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite')
      const store = tx.objectStore(STORE_OUTBOX)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore cleanup error
  }
}

export async function setCachedData(key: string, data: any): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite')
      const store = tx.objectStore(STORE_CACHE)
      const req = store.put({ key, data, updatedAt: Date.now() })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore cache error
  }
}

export async function getCachedData<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readonly')
      const store = tx.objectStore(STORE_CACHE)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ? req.result.data : null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}
