// src/pages/NotebookPage.tsx
//
// Its own page, same pattern as /focus: My Space just has a launch card,
// the actual experience lives here with room to breathe. The only tab in
// the app that never sends anything readable to Supabase - every note
// and file is encrypted on this device before createNotebookEntry /
// downloadNotebookAttachment touch the network at all (see
// src/services/notebook.ts and notebookCrypto.ts). The passcode itself
// never leaves this component; only the key it derives is held, in
// memory, for as long as this page stays mounted - closing it (the X
// button) clears it, same as leaving Focus Mode ends that session.
//
// Layout note: the top bar and the style/attach toolbar are outside the
// scrolling content area on purpose. Attaching a file used to only show
// a confirmation chip below a very tall textarea, which on most screens
// was scrolled out of view — easy to attach something and never see any
// sign of it. Chips now render right under the toolbar, always above the
// fold, and the content area scrolls independently so nothing at the
// bottom (the attach button, in particular) can get stranded off-screen.

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Lock, Plus, Paperclip, Download, Trash2, Type, Palette, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  NotebookEntry, NotebookAttachment, NotebookStyle, DEFAULT_NOTEBOOK_STYLE,
  hasNotebookSetup, setupNotebookPasscode, unlockNotebook,
  listNotebookEntries, createNotebookEntry, updateNotebookEntry, deleteNotebookEntry,
  downloadNotebookAttachment, resetNotebook,
} from '../services/notebook'
import { NotebookDraft, saveDraft, hasDraft, loadDraft, clearDraft } from '../services/notebookDraft'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const FONT_OPTIONS: { key: NotebookStyle['font']; label: string; stack: string }[] = [
  { key: 'sans', label: 'Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { key: 'serif', label: 'Serif', stack: "'Lora', Georgia, serif" },
  { key: 'handwritten', label: 'Handwritten', stack: "'Caveat', cursive" },
  { key: 'mono', label: 'Mono', stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
]
const FONT_STACK: Record<NotebookStyle['font'], string> =
  Object.fromEntries(FONT_OPTIONS.map(f => [f.key, f.stack])) as Record<NotebookStyle['font'], string>

const BACKGROUND_OPTIONS = ['#111827', '#0A0F1E', '#1B2B1F', '#1B1F2E', '#2B2013', '#FDF3E2', '#FBE4EC', '#FFFFFF']
const TEXT_COLOR_OPTIONS = ['#F0F4F8', '#0A0F1E', '#D4A017', '#14B8A6', '#EC4899', '#8B949E', '#FDF3E2', '#3C5F94']

function Card({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-slate-card border border-slate-border rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-teal-light/50 transition-colors' : ''}`}
    >
      {children}
    </div>
  )
}

// One saved or newly-picked file, shown as a thumbnail (images) or a
// filename chip (everything else). Clicking opens it in a new tab -
// decrypted on the fly - rather than forcing a download, so "view it" is
// actually one tap, not a detour through the Downloads folder.
function AttachmentChip({
  attachment, notebookKey, onRemove,
}: {
  attachment: NotebookAttachment
  notebookKey: CryptoKey
  onRemove?: () => void
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const isImage = attachment.mimeType.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    let url: string | null = null
    downloadNotebookAttachment(notebookKey, attachment).then(blob => {
      if (blob && !cancelled) { url = URL.createObjectURL(blob); setThumbUrl(url) }
    })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id])

  const handleOpen = async () => {
    const blob = await downloadNotebookAttachment(notebookKey, attachment)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  if (isImage) {
    return (
      <div className="relative">
        <button
          onClick={handleOpen}
          className="w-16 h-16 rounded-lg overflow-hidden border border-slate-border bg-slate-deep flex items-center justify-center"
        >
          {thumbUrl ? <img src={thumbUrl} alt={attachment.fileName} className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-cream-muted" />}
        </button>
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            className="absolute -top-1.5 -right-1.5 bg-slate-deep border border-slate-border rounded-full p-0.5 text-cream-muted hover:text-red-400"
          >
            <X size={11} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-deep border border-slate-border rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs text-cream-muted">
      <button onClick={handleOpen} className="flex items-center gap-1.5 hover:text-teal-light transition-colors">
        <Download size={12} /> {attachment.fileName} · {formatBytes(attachment.sizeBytes)}
      </button>
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove() }} className="hover:text-red-400 p-0.5">
          <X size={12} />
        </button>
      )}
    </div>
  )
}

export default function NotebookPage() {
  const navigate = useNavigate()
  const { currentUser, showToast } = useApp()

  const [checking, setChecking] = useState(true)
  const [setupExists, setSetupExists] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [notebookKey, setNotebookKey] = useState<CryptoKey | null>(null)

  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Compose/edit view - editingEntryId is null for a brand-new note, or
  // an existing note's id when opened for editing.
  const [composing, setComposing] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPages, setNewPages] = useState<string[]>([''])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [style, setStyle] = useState<NotebookStyle>(DEFAULT_NOTEBOOK_STYLE)
  const [existingAttachments, setExistingAttachments] = useState<NotebookAttachment[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [stylePanel, setStylePanel] = useState<'font' | 'style' | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<{ title: string; pages: string[]; style: NotebookStyle } | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [recoverableDraft, setRecoverableDraft] = useState<NotebookDraft | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!currentUser) navigate('/student')
  }, [currentUser, navigate])

  useEffect(() => {
    if (!currentUser) return
    hasNotebookSetup(currentUser.id).then(exists => { setSetupExists(exists); setChecking(false) })
  }, [currentUser])

  const loadEntries = (key: CryptoKey) => {
    if (!currentUser) return
    setLoadingEntries(true)
    listNotebookEntries(currentUser.id, key).then(list => { setEntries(list); setLoadingEntries(false) })
  }

  useEffect(() => {
    if (notebookKey) loadEntries(notebookKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookKey])

  // Unsaved changes while composing — true once the draft differs from
  // whatever it was when the note was opened (blank, for a new note; the
  // saved values, for an existing one).
  const isDirty = composing && initialSnapshot !== null && (
    newTitle !== initialSnapshot.title ||
    JSON.stringify(newPages) !== JSON.stringify(initialSnapshot.pages) ||
    JSON.stringify(style) !== JSON.stringify(initialSnapshot.style) ||
    newFiles.length > 0 ||
    removedAttachmentIds.length > 0
  )

  // Draft recovery — on unlock, check for a leftover autosaved draft (tab
  // crashed / phone died / browser closed mid-note last time) and offer
  // to resume it, rather than silently discarding or silently resuming.
  useEffect(() => {
    if (!currentUser || !notebookKey) return
    if (!hasDraft(currentUser.id)) return
    loadDraft(currentUser.id, notebookKey).then(draft => { if (draft) setRecoverableDraft(draft) })
  }, [currentUser, notebookKey])

  // Autosave — every few seconds while there's an actual unsaved change
  // to protect, bank an encrypted local draft. This is a data-loss net
  // only; it never touches Supabase, and gets cleared the moment the note
  // is actually saved or the draft is explicitly discarded.
  useEffect(() => {
    if (!currentUser || !notebookKey || !isDirty) return
    const interval = setInterval(() => {
      saveDraft(currentUser.id, notebookKey, {
        editingEntryId, title: newTitle, pages: newPages, currentPageIndex, style, savedAt: Date.now(),
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [currentUser, notebookKey, isDirty, editingEntryId, newTitle, newPages, currentPageIndex, style])

  // Covers the browser-level exits our own in-app confirm dialog can't
  // catch — closing the tab, refreshing, or navigating away by URL.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  if (!currentUser) return null

  const handleSetup = async () => {
    if (passcode.length < 6) { showToast('Use at least 6 characters for your passcode.', 'error'); return }
    if (passcode !== confirmPasscode) { showToast("Passcodes don't match.", 'error'); return }
    setUnlocking(true)
    const { key, error } = await setupNotebookPasscode(currentUser.id, passcode)
    setUnlocking(false)
    if (error || !key) { showToast(error || 'Could not set up your notebook.', 'error'); return }
    setPasscode(''); setConfirmPasscode(''); setSetupExists(true)
    setNotebookKey(key)
  }

  const handleUnlock = async () => {
    if (!passcode) return
    setUnlocking(true)
    const { key, error } = await unlockNotebook(currentUser.id, passcode)
    setUnlocking(false)
    if (error || !key) { showToast(error || 'Could not unlock your notebook.', 'error'); return }
    setPasscode('')
    setNotebookKey(key)
  }

  const handleReset = async () => {
    await resetNotebook(currentUser.id)
    setSetupExists(false)
    setConfirmingReset(false)
    setNotebookKey(null)
    setEntries([])
    showToast("Notebook wiped. You can set a new passcode whenever you're ready.", 'info')
  }

  const openNewNote = () => {
    setEditingEntryId(null)
    setNewTitle(''); setNewPages(['']); setCurrentPageIndex(0); setStyle(DEFAULT_NOTEBOOK_STYLE)
    setExistingAttachments([]); setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    setInitialSnapshot({ title: '', pages: [''], style: DEFAULT_NOTEBOOK_STYLE })
    setComposing(true)
  }

  const openEditNote = (entry: NotebookEntry) => {
    setEditingEntryId(entry.id)
    const pages = entry.pages.length > 0 ? entry.pages : ['']
    setNewTitle(entry.title); setNewPages(pages); setCurrentPageIndex(0); setStyle(entry.style)
    setExistingAttachments(entry.attachments); setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    setInitialSnapshot({ title: entry.title, pages, style: entry.style })
    setComposing(true)
  }

  // Resuming a recovered draft loads its text/style back into the
  // composer, but the "original" snapshot (for isDirty / autosave) stays
  // whatever was actually saved to Supabase — the draft itself counts as
  // an unsaved change, same as if the person had just typed it now.
  const resumeDraft = () => {
    if (!recoverableDraft) return
    const draft = recoverableDraft
    const original = draft.editingEntryId ? entries.find(e => e.id === draft.editingEntryId) : undefined
    const pages = draft.pages.length > 0 ? draft.pages : ['']
    setEditingEntryId(draft.editingEntryId)
    setNewTitle(draft.title); setNewPages(pages)
    setCurrentPageIndex(Math.min(draft.currentPageIndex ?? 0, pages.length - 1))
    setStyle(draft.style)
    setExistingAttachments(original?.attachments ?? [])
    setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    setInitialSnapshot(
      original
        ? { title: original.title, pages: original.pages.length > 0 ? original.pages : [''], style: original.style }
        : { title: '', pages: [''], style: DEFAULT_NOTEBOOK_STYLE }
    )
    setRecoverableDraft(null)
    setComposing(true)
  }

  const discardRecoveredDraft = () => {
    if (currentUser) clearDraft(currentUser.id)
    setRecoverableDraft(null)
  }

  const handleSave = async () => {
    if (!notebookKey) return
    const hasPageText = newPages.some(p => p.trim())
    if (!newTitle.trim() && !hasPageText && newFiles.length === 0 && existingAttachments.length === 0) {
      showToast('Add a title, some text, or a file first.', 'error'); return
    }
    setSaving(true)
    const title = newTitle.trim() || 'Untitled'
    const pages = newPages.map(p => p.trim())
    const { error } = editingEntryId
      ? await updateNotebookEntry(editingEntryId, currentUser.id, notebookKey, title, pages, style, newFiles, removedAttachmentIds)
      : await createNotebookEntry(currentUser.id, notebookKey, title, pages, style, newFiles)
    setSaving(false)
    if (error) { showToast(error, 'error'); return }
    clearDraft(currentUser.id)
    setComposing(false)
    loadEntries(notebookKey)
    showToast(editingEntryId ? 'Note updated.' : 'Saved to your notebook.', 'success')
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    await deleteNotebookEntry(id, currentUser.id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleting(false)
    setConfirmDeleteId(null)
    showToast('Note deleted.', 'info')
  }

  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId))
    setRemovedAttachmentIds(prev => [...prev, attachmentId])
  }

  const closeButtonAction = () => {
    if (!composing) { navigate('/space'); return }
    if (isDirty) { setConfirmDiscard(true); return }
    setComposing(false)
  }
  const title = composing ? (editingEntryId ? 'Edit note' : 'New note') : 'Notebook'

  return (
    <div className="h-[100dvh] bg-slate-deep flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
        <button onClick={closeButtonAction} className="text-cream-muted hover:text-cream transition-colors">
          <X size={20} />
        </button>
        <span className="text-cream font-bold flex-1">{title}</span>
        {composing ? (
          <button onClick={handleSave} disabled={saving} className="text-teal-light hover:opacity-80 disabled:opacity-50 font-bold text-sm transition-opacity">
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : notebookKey ? (
          <button onClick={() => { setNotebookKey(null); setConfirmDeleteId(null) }} className="flex items-center gap-1.5 text-cream-muted hover:text-cream text-xs transition-colors">
            <Lock size={14} /> Lock
          </button>
        ) : null}
      </div>

      {confirmDiscard && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => setConfirmDiscard(false)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-slate-card border border-slate-border rounded-2xl p-5 max-w-sm w-full">
            <p className="text-cream font-bold text-sm mb-1">Discard this note?</p>
            <p className="text-cream-muted text-xs mb-4 leading-relaxed">
              You have unsaved changes. Closing now will lose them for good.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDiscard(false); setComposing(false); clearDraft(currentUser.id) }}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Discard changes
              </button>
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar sits outside the scroll area, directly under the top bar,
          so the "did my file attach?" chips are always visible without
          scrolling — the bug being fixed here. */}
      {composing && notebookKey && (
        <div className="flex-shrink-0 max-w-2xl w-full mx-auto px-4 pt-3">
          <div className="flex items-center gap-5 mb-3 border-b border-slate-border">
            <button
              onClick={() => setStylePanel(p => p === 'font' ? null : 'font')}
              className={`relative flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-colors ${stylePanel === 'font' ? 'text-teal-light' : 'text-cream-muted hover:text-cream'}`}
            >
              <Type size={13} /> Font
              {stylePanel === 'font' && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-teal-light rounded-full" />}
            </button>
            <button
              onClick={() => setStylePanel(p => p === 'style' ? null : 'style')}
              className={`relative flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-colors ${stylePanel === 'style' ? 'text-teal-light' : 'text-cream-muted hover:text-cream'}`}
            >
              <Palette size={13} /> Style
              {stylePanel === 'style' && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-teal-light rounded-full" />}
            </button>
          </div>

          {stylePanel === 'font' && (
            <div className="flex gap-2 flex-wrap mb-3">
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.key} onClick={() => setStyle(s => ({ ...s, font: f.key }))} style={{ fontFamily: f.stack }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${style.font === f.key ? 'border-teal-light text-teal-light' : 'border-slate-border text-cream-muted'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {stylePanel === 'style' && (
            <div className="flex flex-col gap-2.5 mb-3">
              <div>
                <p className="text-cream-muted text-[11px] font-bold mb-1.5">Text color</p>
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLOR_OPTIONS.map(c => (
                    <button
                      key={c} onClick={() => setStyle(s => ({ ...s, textColor: c }))} style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${style.textColor === c ? 'border-teal-light' : 'border-slate-border/60'}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-cream-muted text-[11px] font-bold mb-1.5">Background</p>
                <div className="flex gap-2 flex-wrap">
                  {BACKGROUND_OPTIONS.map(c => (
                    <button
                      key={c} onClick={() => setStyle(s => ({ ...s, background: c }))} style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${style.background === c ? 'border-teal-light' : 'border-slate-border/60'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {(existingAttachments.length > 0 || newFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2 pt-1">
              {existingAttachments.map(a => (
                <AttachmentChip key={a.id} attachment={a} notebookKey={notebookKey} onRemove={() => handleRemoveExistingAttachment(a.id)} />
              ))}
              {newFiles.map((f, i) => (
                <span key={i} className="flex items-center gap-1 bg-slate-card border border-slate-border rounded-lg px-2 py-1 text-xs text-cream-muted">
                  {f.name}
                  <button onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = '' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-slate-border text-cream-muted hover:border-teal-light hover:text-teal-light font-bold px-3 py-2 rounded-xl text-xs transition-colors mb-2"
          >
            <Paperclip size={14} /> Attach a file
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto px-4 py-4 flex flex-col min-h-full">
          {checking ? (
            <p className="text-cream-muted text-sm">Loading…</p>

          ) : !setupExists ? (
            // ── Not set up yet ──
            <Card>
              <p className="text-cream font-bold text-sm mb-3">Create a passcode to keep your notebook safe.</p>
              <div className="flex flex-col gap-2">
                <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Choose a passcode"
                  className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                <input type="password" value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value)} placeholder="Confirm passcode"
                  className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                <button onClick={handleSetup} disabled={unlocking}
                  className="bg-ember hover:bg-ember-dark disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {unlocking ? 'Setting up…' : 'Set up Notebook'}
                </button>
              </div>
            </Card>

          ) : !notebookKey ? (
            // ── Set up, but locked this session ──
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-teal-light" />
                <p className="text-cream font-bold text-sm">Enter your Notebook passcode</p>
              </div>
              <div className="flex flex-col gap-2">
                <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="Passcode"
                  className="bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
                <button onClick={handleUnlock} disabled={unlocking}
                  className="bg-teal-primary hover:opacity-85 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {unlocking ? 'Unlocking…' : 'Unlock'}
                </button>
              </div>

              {!confirmingReset ? (
                <button onClick={() => setConfirmingReset(true)} className="text-cream-muted hover:text-red-400 text-xs mt-3 transition-colors">
                  Forgot your passcode?
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-border">
                  <p className="text-red-400 text-xs mb-2 leading-relaxed">
                    There's no way to recover a lost passcode. The only option is wiping everything in your
                    notebook and starting fresh with a new one. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-xs transition-colors">
                      Wipe and start over
                    </button>
                    <button onClick={() => setConfirmingReset(false)} className="flex-1 border border-slate-border text-cream-muted font-bold py-2 rounded-xl text-xs transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>

          ) : composing ? (
            // ── Writing surface - styled per the toolbar above ──
            <div
              style={{ backgroundColor: style.background }}
              className="flex-1 flex flex-col rounded-2xl p-4 min-h-[45vh]"
            >
              <input
                value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title"
                style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                className="w-full bg-transparent border-b border-current/15 pb-2 mb-2 text-lg font-bold placeholder:opacity-50 focus:outline-none"
              />
              <textarea
                value={newPages[currentPageIndex]}
                onChange={e => setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? e.target.value : p))}
                placeholder="Write as much as you want…"
                style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                className="flex-1 w-full min-h-[35vh] bg-transparent focus:outline-none resize-none leading-relaxed placeholder:opacity-50"
              />

              {/* Page navigation — a note is one or more pages; "skip to
                  the next one" is exactly the Next/Add page control below. */}
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-current/15">
                <button
                  onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
                  disabled={currentPageIndex === 0}
                  style={{ color: style.textColor }}
                  className="p-1.5 rounded-lg opacity-70 hover:opacity-100 disabled:opacity-25 transition-opacity"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                <span style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }} className="text-xs font-bold opacity-70">
                  Page {currentPageIndex + 1} of {newPages.length}
                </span>

                {currentPageIndex === newPages.length - 1 ? (
                  <button
                    onClick={() => { setNewPages(prev => [...prev, '']); setCurrentPageIndex(newPages.length) }}
                    style={{ color: style.textColor }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <Plus size={14} /> Add page
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentPageIndex(i => Math.min(newPages.length - 1, i + 1))}
                    style={{ color: style.textColor }}
                    className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Next page"
                  >
                    <ChevronRight size={17} />
                  </button>
                )}
              </div>
            </div>

          ) : (
            // ── Notes list ──
            <div className="flex flex-col gap-4">
              {recoverableDraft && (
                <div className="bg-teal-primary/10 border border-teal-light/30 rounded-2xl p-4">
                  <p className="text-cream font-bold text-sm mb-1">Resume where you left off?</p>
                  <p className="text-cream-muted text-xs mb-3 leading-relaxed">
                    Found an unsaved draft{recoverableDraft.title ? ` — "${recoverableDraft.title}"` : ''} from last time, saved automatically before it could be lost.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={resumeDraft}
                      className="flex-1 bg-teal-primary hover:opacity-85 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Resume draft
                    </button>
                    <button
                      onClick={discardRecoveredDraft}
                      className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              <button onClick={openNewNote}
                className="flex items-center justify-center gap-1.5 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl text-sm transition-colors">
                <Plus size={16} /> New note
              </button>

              {loadingEntries ? (
                <p className="text-cream-muted text-sm">Loading your notes…</p>
              ) : entries.length === 0 ? (
                <p className="text-cream-muted text-sm">No notes yet — your first one is one tap away.</p>
              ) : (
                entries.map(entry => (
                  <Card key={entry.id} onClick={() => openEditNote(entry)} style={{ backgroundColor: entry.style.background }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p style={{ color: entry.style.textColor, fontFamily: FONT_STACK[entry.style.font] }} className="font-bold text-sm truncate">
                            {entry.title}
                          </p>
                          {entry.pages.length > 1 && (
                            <span
                              style={{ color: entry.style.textColor, borderColor: `${entry.style.textColor}30` }}
                              className="flex-shrink-0 text-[10px] font-bold border rounded-full px-1.5 py-0.5 opacity-70"
                            >
                              {entry.pages.length} pages
                            </span>
                          )}
                        </div>
                        {entry.pages[0] && (
                          <p style={{ color: entry.style.textColor, fontFamily: FONT_STACK[entry.style.font] }} className="text-sm mt-1 whitespace-pre-wrap opacity-90 line-clamp-4">
                            {entry.pages[0]}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(entry.id) }}
                        style={{ color: entry.style.textColor }}
                        className="opacity-60 hover:opacity-100 hover:!text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {confirmDeleteId === entry.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="mt-3 pt-3 border-t border-current/15"
                      >
                        <p style={{ color: entry.style.textColor }} className="text-xs opacity-90 mb-2">
                          Delete this note for good? It's encrypted, so once it's gone — even we can't get it back.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 font-bold py-2 rounded-xl text-xs transition-colors"
                          >
                            {deleting ? 'Deleting…' : 'Delete note'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ borderColor: `${entry.style.textColor}40`, color: entry.style.textColor }}
                            className="flex-1 border font-bold py-2 rounded-xl text-xs transition-colors opacity-80 hover:opacity-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {entry.attachments.length > 0 && (
                      <div onClick={e => e.stopPropagation()} className="flex flex-wrap gap-2 mt-3">
                        {entry.attachments.map(a => (
                          <AttachmentChip key={a.id} attachment={a} notebookKey={notebookKey} />
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
