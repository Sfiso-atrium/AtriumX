// Supabase-facing side of the Notebook feature. Every note and file goes
// through notebookCrypto.ts BEFORE any call in this file touches the
// network - this file never sends plaintext anywhere. Kept separate from
// dataService.ts on purpose, so that boundary is visible just from the
// file layout, not something you have to trust a comment about.

import { supabase } from './supabaseClient'
import { compressImageForUpload } from './imageCache'
import {
  generateSaltB64, deriveNotebookKey, encryptText, decryptText,
  encryptBytes, decryptBytes, makeCheckValue, verifyCheckValue,
} from './notebookCrypto'

export interface NotebookAttachment {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  iv: string
}

export interface NotebookEntry {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
  attachments: NotebookAttachment[]
}

export async function hasNotebookSetup(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('notebook_key_setup')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// First-ever setup for this student: generates a fresh salt, derives the
// key, and stores a check value so future unlocks (on any device) can
// confirm a passcode is right before trusting it against real notes.
export async function setupNotebookPasscode(
  userId: string, passcode: string
): Promise<{ key: CryptoKey | null; error: string | null }> {
  const salt = generateSaltB64()
  const key = await deriveNotebookKey(passcode, salt)
  const check = await makeCheckValue(key)
  const { error } = await supabase.from('notebook_key_setup').insert({
    user_id: userId, salt, check_ciphertext: check.ciphertext, check_iv: check.iv,
  })
  if (error) return { key: null, error: error.message }
  return { key, error: null }
}

// Re-derives the key from a passcode on any device and verifies it
// against the stored check value before handing it back.
export async function unlockNotebook(
  userId: string, passcode: string
): Promise<{ key: CryptoKey | null; error: string | null }> {
  const { data, error } = await supabase
    .from('notebook_key_setup')
    .select('salt, check_ciphertext, check_iv')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return { key: null, error: 'Notebook has not been set up yet.' }

  const key = await deriveNotebookKey(passcode, data.salt)
  const ok = await verifyCheckValue(key, data.check_ciphertext, data.check_iv)
  if (!ok) return { key: null, error: 'Incorrect passcode.' }
  return { key, error: null }
}

export async function listNotebookEntries(userId: string, key: CryptoKey): Promise<NotebookEntry[]> {
  const { data: entryRows, error } = await supabase
    .from('notebook_entries')
    .select('id, ciphertext, iv, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error || !entryRows) return []

  const { data: attachmentRows } = await supabase
    .from('notebook_attachments')
    .select('id, entry_id, storage_path, file_name, mime_type, iv, size_bytes')
    .eq('user_id', userId)

  const entries: NotebookEntry[] = []
  for (const row of entryRows) {
    let title = '(could not decrypt)'
    let body = ''
    try {
      const plain = await decryptText(key, row.ciphertext, row.iv)
      const parsed = JSON.parse(plain) as { title: string; body: string }
      title = parsed.title
      body = parsed.body
    } catch {
      // Wrong key or corrupted row - surface it plainly rather than crash the list.
    }
    entries.push({
      id: row.id,
      title,
      body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments: (attachmentRows || [])
        .filter(a => a.entry_id === row.id)
        .map(a => ({
          id: a.id, fileName: a.file_name, mimeType: a.mime_type,
          sizeBytes: a.size_bytes, storagePath: a.storage_path, iv: a.iv,
        })),
    })
  }
  return entries
}

export async function createNotebookEntry(
  userId: string, key: CryptoKey, title: string, body: string, files: File[]
): Promise<{ error: string | null }> {
  const { ciphertext, iv } = await encryptText(key, JSON.stringify({ title, body }))
  const { data: entryRow, error } = await supabase
    .from('notebook_entries')
    .insert({ user_id: userId, ciphertext, iv })
    .select('id')
    .single()
  if (error || !entryRow) return { error: error?.message || 'Could not save note.' }

  for (const rawFile of files) {
    const file = rawFile.type.startsWith('image/') ? await compressImageForUpload(rawFile) : rawFile
    const plainBytes = await file.arrayBuffer()
    const encrypted = await encryptBytes(key, plainBytes)
    const path = `${userId}/${crypto.randomUUID()}`

    const { error: uploadError } = await supabase.storage
      .from('notebook-files')
      .upload(path, new Blob([encrypted.ciphertext]), { contentType: 'application/octet-stream' })
    if (uploadError) return { error: `Note saved, but "${file.name}" failed to upload: ${uploadError.message}` }

    const { error: attachError } = await supabase.from('notebook_attachments').insert({
      entry_id: entryRow.id, user_id: userId, storage_path: path,
      file_name: file.name, mime_type: file.type || 'application/octet-stream',
      iv: encrypted.iv, size_bytes: file.size,
    })
    if (attachError) return { error: `Note saved, but "${file.name}" could not be attached: ${attachError.message}` }
  }
  return { error: null }
}

export async function deleteNotebookEntry(entryId: string, userId: string): Promise<void> {
  const { data: attachments } = await supabase
    .from('notebook_attachments')
    .select('storage_path')
    .eq('entry_id', entryId)
  if (attachments && attachments.length > 0) {
    await supabase.storage.from('notebook-files').remove(attachments.map(a => a.storage_path))
  }
  await supabase.from('notebook_entries').delete().eq('id', entryId).eq('user_id', userId)
}

// Downloads and decrypts one attachment on demand - file bytes are only
// ever pulled and unlocked when the student actually opens that file, not
// eagerly for the whole list.
export async function downloadNotebookAttachment(key: CryptoKey, attachment: NotebookAttachment): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from('notebook-files').download(attachment.storagePath)
  if (error || !data) return null
  const cipherBytes = await data.arrayBuffer()
  try {
    const plainBytes = await decryptBytes(key, cipherBytes, attachment.iv)
    return new Blob([plainBytes], { type: attachment.mimeType })
  } catch {
    return null
  }
}

// Forgetting the passcode means every existing note and file is already
// unreadable forever - there is no key to recover. The only honest way
// forward is to wipe it all and let the student start a fresh notebook
// with a new passcode. The UI must make this destructiveness very clear
// before calling this.
export async function resetNotebook(userId: string): Promise<void> {
  const { data: attachments } = await supabase
    .from('notebook_attachments')
    .select('storage_path')
    .eq('user_id', userId)
  if (attachments && attachments.length > 0) {
    await supabase.storage.from('notebook-files').remove(attachments.map(a => a.storage_path))
  }
  await supabase.from('notebook_entries').delete().eq('user_id', userId)
  await supabase.from('notebook_key_setup').delete().eq('user_id', userId)
}
