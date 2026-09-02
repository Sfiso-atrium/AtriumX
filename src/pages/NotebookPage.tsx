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

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Lock, Plus, Paperclip, Download, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  NotebookEntry, NotebookAttachment, hasNotebookSetup, setupNotebookPasscode, unlockNotebook,
  listNotebookEntries, createNotebookEntry, deleteNotebookEntry, downloadNotebookAttachment, resetNotebook,
} from '../services/notebook'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-card border border-slate-border rounded-2xl p-4">{children}</div>
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
  const [composing, setComposing] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
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
  }, [notebookKey])

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

  const handleSave = async () => {
    if (!notebookKey) return
    if (!newTitle.trim() && !newBody.trim() && newFiles.length === 0) {
      showToast('Add a title, some text, or a file first.', 'error'); return
    }
    setSaving(true)
    const { error } = await createNotebookEntry(currentUser.id, notebookKey, newTitle.trim() || 'Untitled', newBody.trim(), newFiles)
    setSaving(false)
    if (error) { showToast(error, 'error'); return }
    setNewTitle(''); setNewBody(''); setNewFiles([]); setComposing(false)
    loadEntries(notebookKey)
    showToast('Saved to your notebook.', 'success')
  }

  const handleDelete = async (id: string) => {
    await deleteNotebookEntry(id, currentUser.id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleOpenAttachment = async (attachment: NotebookAttachment) => {
    if (!notebookKey) return
    const blob = await downloadNotebookAttachment(notebookKey, attachment)
    if (!blob) { showToast('Could not open this file.', 'error'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // Top bar: left button always closes the current view (compose → back
  // to list, list → back to My Space); right side is contextual.
  const closeButtonAction = composing ? () => setComposing(false) : () => navigate('/space')
  const title = composing ? 'New note' : 'Notebook'

  return (
    <div className="min-h-[100dvh] bg-slate-deep flex flex-col">
      <div className="sticky top-0 z-10 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={closeButtonAction} className="text-cream-muted hover:text-cream transition-colors">
          <X size={20} />
        </button>
        <span className="text-cream font-bold flex-1">{title}</span>
        {composing ? (
          <button onClick={handleSave} disabled={saving} className="text-teal-light hover:opacity-80 disabled:opacity-50 font-bold text-sm transition-opacity">
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : notebookKey ? (
          <button onClick={() => setNotebookKey(null)} className="flex items-center gap-1.5 text-cream-muted hover:text-cream text-xs transition-colors">
            <Lock size={14} /> Lock
          </button>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-5">
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
          // ── Full writing view - room to type as much as they want ──
          <div className="flex-1 flex flex-col gap-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title"
              className="w-full bg-transparent border-b border-slate-border px-1 py-2 text-lg font-bold text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light" />
            <textarea
              value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write as much as you want…"
              className="flex-1 w-full min-h-[50vh] bg-transparent px-1 py-2 text-sm text-cream placeholder:text-cream-muted focus:outline-none resize-none leading-relaxed"
            />

            {newFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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

            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => { if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = '' }} />
            <button onClick={() => fileInputRef.current?.click()}
              className="self-start flex items-center gap-1.5 border border-slate-border text-cream-muted hover:border-teal-light hover:text-teal-light font-bold px-3 py-2 rounded-xl text-xs transition-colors">
              <Paperclip size={14} /> Attach a file
            </button>
          </div>

        ) : (
          // ── Notes list ──
          <div className="flex flex-col gap-4">
            <button onClick={() => setComposing(true)}
              className="flex items-center justify-center gap-1.5 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl text-sm transition-colors">
              <Plus size={16} /> New note
            </button>

            {loadingEntries ? (
              <p className="text-cream-muted text-sm">Loading your notes…</p>
            ) : entries.length === 0 ? (
              <p className="text-cream-muted text-sm">No notes yet — your first one is one tap away.</p>
            ) : (
              entries.map(entry => (
                <Card key={entry.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-cream font-bold text-sm truncate">{entry.title}</p>
                      {entry.body && <p className="text-cream-muted text-sm mt-1 whitespace-pre-wrap">{entry.body}</p>}
                    </div>
                    <button onClick={() => handleDelete(entry.id)} className="text-cream-muted hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {entry.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {entry.attachments.map(a => (
                        <button key={a.id} onClick={() => handleOpenAttachment(a)}
                          className="flex items-center gap-1.5 bg-slate-deep border border-slate-border hover:border-teal-light rounded-lg px-2.5 py-1.5 text-xs text-cream-muted hover:text-teal-light transition-colors">
                          <Download size={12} /> {a.fileName} · {formatBytes(a.sizeBytes)}
                        </button>
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
  )
}
