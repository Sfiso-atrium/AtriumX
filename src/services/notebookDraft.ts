// Local draft autosave for the Notebook compose view. Purely a data-loss
// safety net for a crashed tab / dead phone / closed browser mid-note -
// it never touches Supabase.
//
// The draft is encrypted with the same notebookKey as everything else
// before it touches localStorage, using the same AES-GCM helpers as
// notebook.ts. That keeps it inside the same "nothing about a note's
// content sits on this device in plaintext" boundary the rest of the
// feature already promises, rather than quietly carving out an exception
// for autosave.
//
// One slot per user - this UI only ever composes one note at a time, so
// there's nothing to key drafts by beyond that.

import { encryptText, decryptText } from './notebookCrypto'
import { NotebookStyle, NotebookPageData } from './notebook'

export interface NotebookDraft {
  editingEntryId: string | null
  title: string
  pages: NotebookPageData[]
  currentPageIndex: number
  style: NotebookStyle
  tags: string[]
  savedAt: number
}

function draftKey(userId: string): string {
  return `notebook_draft_${userId}`
}

export async function saveDraft(userId: string, key: CryptoKey, draft: NotebookDraft): Promise<void> {
  const { ciphertext, iv } = await encryptText(key, JSON.stringify(draft))
  localStorage.setItem(draftKey(userId), JSON.stringify({ ciphertext, iv }))
}

// Only a presence check, safe to call before the notebook is unlocked
// (there's no key yet to decrypt with) - just enough to know whether to
// offer "resume where you left off" once unlocking succeeds.
export function hasDraft(userId: string): boolean {
  return localStorage.getItem(draftKey(userId)) !== null
}

export async function loadDraft(userId: string, key: CryptoKey): Promise<NotebookDraft | null> {
  const raw = localStorage.getItem(draftKey(userId))
  if (!raw) return null
  try {
    const { ciphertext, iv } = JSON.parse(raw)
    const plaintext = await decryptText(key, ciphertext, iv)
    return JSON.parse(plaintext) as NotebookDraft
  } catch {
    // Wrong key (different passcode since the draft was saved) or
    // corrupted entry - either way, not recoverable, so clear it rather
    // than getting stuck offering a draft that will never decrypt.
    localStorage.removeItem(draftKey(userId))
    return null
  }
}

export function clearDraft(userId: string): void {
  localStorage.removeItem(draftKey(userId))
}
