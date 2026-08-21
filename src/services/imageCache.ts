// src/services/imageCache.ts
//
// On-device cache for study group chat images. Images live in Supabase
// Storage only long enough to travel from sender to recipient — once a
// device has fetched an image once, it's saved into that device's own
// IndexedDB and never re-downloaded. No new npm dependency: this uses the
// browser's native indexedDB API directly.
//
// Key = the storage path ("{groupId}/{userId}/{filename}"), so it doubles
// as a stable cache key across sessions.

const DB_NAME = 'atriumx-image-cache'
const STORE_NAME = 'group-images'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getCachedImageBlob(path: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(path)
      req.onsuccess = () => resolve((req.result as Blob) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    // IndexedDB unavailable (private browsing, storage disabled, etc.) —
    // fail soft, caller falls back to re-downloading from Supabase.
    return null
  }
}

export async function cacheImageBlob(path: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(blob, path)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Caching is a nice-to-have, not a requirement for the image to work —
    // if it fails, the image still rendered from the just-fetched blob.
  }
}

export async function deleteCachedImageBlob(path: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(path)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // no-op
  }
}

// Downscales + re-encodes an image before upload, to keep Supabase Storage
// bandwidth/cost down (this is the only point the image touches a server,
// so keeping it small matters). Caps the longest edge at 1600px and
// re-encodes as JPEG at 0.82 quality. Falls back to the original file if
// canvas processing fails for any reason (e.g. an already-tiny image).
export async function compressImageForUpload(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxEdge = 1600
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', 0.82)
    )
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
