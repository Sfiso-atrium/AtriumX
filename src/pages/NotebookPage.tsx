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

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Lock, Plus, Paperclip, Download, Trash2, Type, Palette, Image as ImageIcon,
  ChevronLeft, ChevronRight, Search, Pencil, Copy, PenLine, Eraser,
  Bold, Italic, List, Heading1, Undo2, Redo2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  NotebookEntry, NotebookAttachment, NotebookStyle, NotebookPageData, DEFAULT_NOTEBOOK_STYLE, emptyTextPage,
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

// "Last edited X ago" label on note cards - coarse buckets are enough
// here, this isn't a precise timestamp, just a glance-able freshness cue.
function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}mo ago`
  return `${Math.floor(month / 12)}y ago`
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

// Shared by "copy as text" and "download .txt" so both exports stay
// identical - multi-page notes get a plain page separator, single-page
// notes are just the title followed by the body. Drawing pages have no
// text of their own, so they're represented with a plain placeholder -
// a .txt file can't hold the image itself. Exported as the raw Markdown
// source (not the rendered version) - a .txt file has no way to show
// bold/italic/bullets/headings as anything other than their plain symbols.
function buildNoteText(title: string, pages: NotebookPageData[]): string {
  const pageText = (p: NotebookPageData) => p.type === 'drawing' ? '[Drawing page]' : p.text
  const body = pages.length > 1
    ? pages.map((p, i) => `--- Page ${i + 1} ---\n${pageText(p)}`).join('\n\n')
    : (pageText(pages[0]) || '')
  return `${title || 'Untitled'}\n\n${body}`
}

// ── Basic Markdown-style formatting ──
//
// Deliberately a source editor, not a WYSIWYG one: the textarea always
// shows the raw **bold**/*italic*/- bullet/# heading syntax while editing
// (so what you type is exactly what's stored, easy to reason about, and
// needs no rich-text editing library), and it's only rendered into actual
// bold text/bullets/headings in the read-only preview view. Typing the
// syntax by hand always works too - the toolbar buttons are a shortcut
// for wrapping/prefixing the current selection, not the only way in.

// Inline spans within one line: **bold** before *italic* so "**x**" isn't
// misread as an empty italic run followed by stray asterisks.
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/
  while (remaining.length > 0) {
    const match = remaining.match(pattern)
    if (!match || match.index === undefined) { parts.push(remaining); break }
    if (match.index > 0) parts.push(remaining.slice(0, match.index))
    if (match[1] !== undefined) parts.push(<strong key={key++}>{match[1]}</strong>)
    else parts.push(<em key={key++}>{match[2]}</em>)
    remaining = remaining.slice(match.index + match[0].length)
  }
  return parts
}

// Block-level: groups consecutive "- "/"* " lines into one <ul>, "# "/"##
// "/"### " lines into headings, everything else into paragraphs.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let bulletBuffer: string[] = []
  let key = 0

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return
    blocks.push(
      <ul key={`ul-${key++}`} className="list-disc pl-5 my-1 space-y-0.5">
        {bulletBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ul>
    )
    bulletBuffer = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (headingMatch) {
      flushBullets()
      const level = headingMatch[1].length
      const sizeClass = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base'
      blocks.push(<p key={key++} className={`${sizeClass} font-bold mt-2 mb-1`}>{renderInline(headingMatch[2])}</p>)
    } else if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1])
    } else {
      flushBullets()
      if (line.trim() === '') blocks.push(<div key={key++} className="h-3" />)
      else blocks.push(<p key={key++} className="mb-1">{renderInline(line)}</p>)
    }
  }
  flushBullets()
  return blocks
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

// Freehand drawing for a single page. Keyed by page index in the parent
// (see `key={currentPageIndex}` below) so switching pages remounts this
// fresh - the canvas only needs to load `initialDrawing` once, draw
// locally at full speed, and hand back a finished PNG data URL on
// pointer-up rather than re-rendering from that data URL on every stroke.
// Clearing is exposed as an imperative handle rather than driven off a
// prop, because the canvas's pixels live in the browser's own canvas
// bitmap, not in React state — flipping `drawing` to null in the parent
// has nothing to redraw against, so the button needs to reach in and
// wipe the actual canvas directly.
export interface DrawingCanvasHandle {
  clear: () => void
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, {
  initialDrawing: string | null
  strokeColor: string
  mode: 'pen' | 'eraser'
  onChange: (dataUrl: string) => void
}>(function DrawingCanvas({ initialDrawing, strokeColor, mode, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !initialDrawing) return
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = initialDrawing
    // Intentionally runs once on mount only - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onChange('')
    },
  }))

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current!.getContext('2d')
    if (!ctx) return
    const point = pointFromEvent(e)
    const last = lastPointRef.current
    if (last) {
      // Eraser is a pen that paints in "destination-out" instead of a
      // color - wherever the stroke passes, it punches a transparent hole
      // in whatever's already drawn there, rather than only being able to
      // wipe the whole page at once.
      ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = mode === 'eraser' ? 22 : 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
    lastPointRef.current = point
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    onChange(canvasRef.current!.toDataURL('image/png'))
  }

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={450}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full flex-1 min-h-[35vh] rounded-lg touch-none"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
    />
  )
})

// One point in the note-level undo/redo history - the whole note as a
// unit (title + every page + style), not per-field. This is deliberately
// separate from the browser's native textarea undo, which only covers one
// field and forgets everything the moment focus moves to another page.
interface NoteSnapshot {
  title: string
  pages: NotebookPageData[]
  style: NotebookStyle
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
  const [readOnly, setReadOnly] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPages, setNewPages] = useState<NotebookPageData[]>([emptyTextPage()])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [style, setStyle] = useState<NotebookStyle>(DEFAULT_NOTEBOOK_STYLE)
  const [existingAttachments, setExistingAttachments] = useState<NotebookAttachment[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [stylePanel, setStylePanel] = useState<'font' | 'style' | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState<NoteSnapshot | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [recoverableDraft, setRecoverableDraft] = useState<NotebookDraft | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'updated' | 'title' | 'oldest'>('updated')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null)
  const [drawMode, setDrawMode] = useState<'pen' | 'eraser'>('pen')

  // Undo/redo - a stack of whole-note snapshots, separate from initialSnapshot
  // (which is only used to detect unsaved changes / dirtiness).
  const [undoStack, setUndoStack] = useState<NoteSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<NoteSnapshot[]>([])
  const lastSnapshotRef = useRef<NoteSnapshot | null>(null)
  const skipHistoryRef = useRef(false)
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Undo/redo history capture — debounced so rapid typing banks one
  // history entry per pause rather than one per keystroke. Tracks the
  // whole note (title + pages + style) as a single unit.
  useEffect(() => {
    if (!composing || readOnly) return
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return }
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current)
    historyDebounceRef.current = setTimeout(() => {
      const snapshot: NoteSnapshot = { title: newTitle, pages: newPages, style }
      const prev = lastSnapshotRef.current
      if (prev && JSON.stringify(prev) === JSON.stringify(snapshot)) return
      if (prev) setUndoStack(stack => [...stack, prev])
      setRedoStack([])
      lastSnapshotRef.current = snapshot
    }, 600)
    return () => { if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTitle, newPages, style, composing, readOnly])

  useEffect(() => { setDrawMode('pen') }, [currentPageIndex])

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

  // Resets undo/redo history to a clean slate anchored on `snapshot` -
  // shared by openNewNote/openEditNote/resumeDraft so every entry point
  // into the composer starts with an empty, correctly-anchored history.
  const resetHistory = (snapshot: NoteSnapshot) => {
    setUndoStack([]); setRedoStack([])
    lastSnapshotRef.current = snapshot
    skipHistoryRef.current = false
  }

  const openNewNote = () => {
    setEditingEntryId(null)
    const startPages = [emptyTextPage()]
    setNewTitle(''); setNewPages(startPages); setCurrentPageIndex(0); setStyle(DEFAULT_NOTEBOOK_STYLE)
    setExistingAttachments([]); setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    setInitialSnapshot({ title: '', pages: startPages, style: DEFAULT_NOTEBOOK_STYLE })
    resetHistory({ title: '', pages: startPages, style: DEFAULT_NOTEBOOK_STYLE })
    setReadOnly(false)
    setComposing(true)
  }

  // Opens straight into a read-only glance view rather than the editor -
  // tapping a note card shouldn't put you one accidental keystroke away
  // from changing it. The "Edit" button in that view is what flips
  // readOnly off.
  const openEditNote = (entry: NotebookEntry) => {
    setEditingEntryId(entry.id)
    const pages = entry.pages.length > 0 ? entry.pages : [emptyTextPage()]
    setNewTitle(entry.title); setNewPages(pages); setCurrentPageIndex(0); setStyle(entry.style)
    setExistingAttachments(entry.attachments); setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    setInitialSnapshot({ title: entry.title, pages, style: entry.style })
    resetHistory({ title: entry.title, pages, style: entry.style })
    setReadOnly(true)
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
    const pages = draft.pages.length > 0 ? draft.pages : [emptyTextPage()]
    setEditingEntryId(draft.editingEntryId)
    setNewTitle(draft.title); setNewPages(pages)
    setCurrentPageIndex(Math.min(draft.currentPageIndex ?? 0, pages.length - 1))
    setStyle(draft.style)
    setExistingAttachments(original?.attachments ?? [])
    setRemovedAttachmentIds([]); setNewFiles([])
    setStylePanel(null)
    const original_snapshot: NoteSnapshot = original
      ? { title: original.title, pages: original.pages.length > 0 ? original.pages : [emptyTextPage()], style: original.style }
      : { title: '', pages: [emptyTextPage()], style: DEFAULT_NOTEBOOK_STYLE }
    setInitialSnapshot(original_snapshot)
    // History is anchored on the resumed draft itself (not the original
    // saved note) - undoing from here should step back through the
    // draft's own edit history first, same as if this session never lost focus.
    resetHistory({ title: draft.title, pages, style: draft.style })
    setRecoverableDraft(null)
    setReadOnly(false)
    setComposing(true)
  }

  const discardRecoveredDraft = () => {
    if (currentUser) clearDraft(currentUser.id)
    setRecoverableDraft(null)
  }

  const handleUndo = () => {
    if (undoStack.length === 0 || !lastSnapshotRef.current) return
    const current = lastSnapshotRef.current
    const previous = undoStack[undoStack.length - 1]
    setUndoStack(stack => stack.slice(0, -1))
    setRedoStack(stack => [...stack, current])
    skipHistoryRef.current = true
    setNewTitle(previous.title)
    setNewPages(previous.pages)
    setStyle(previous.style)
    setCurrentPageIndex(i => Math.min(i, previous.pages.length - 1))
    lastSnapshotRef.current = previous
  }

  const handleRedo = () => {
    if (redoStack.length === 0 || !lastSnapshotRef.current) return
    const current = lastSnapshotRef.current
    const next = redoStack[redoStack.length - 1]
    setRedoStack(stack => stack.slice(0, -1))
    setUndoStack(stack => [...stack, current])
    skipHistoryRef.current = true
    setNewTitle(next.title)
    setNewPages(next.pages)
    setStyle(next.style)
    setCurrentPageIndex(i => Math.min(i, next.pages.length - 1))
    lastSnapshotRef.current = next
  }

  // Wraps the current textarea selection in prefix/suffix (bold, italic) -
  // works on a selection or, with none, just inserts the markers at the
  // cursor for the next thing typed.
  const applyInlineWrap = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd, value } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    const newText = value.slice(0, selectionStart) + prefix + selected + suffix + value.slice(selectionEnd)
    setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, text: newText } : p))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length + selected.length)
    })
  }

  // Toggles a line-start prefix (bullet, heading) across every line the
  // selection touches - clicking again with the same lines selected
  // removes it, so the toolbar button doubles as on/off.
  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd, value } = textarea
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
    const nextBreak = value.indexOf('\n', selectionEnd)
    const lineEnd = nextBreak === -1 ? value.length : nextBreak
    const lines = value.slice(lineStart, lineEnd).split('\n')
    const allPrefixed = lines.every(l => l.startsWith(prefix))
    const newLines = allPrefixed ? lines.map(l => l.slice(prefix.length)) : lines.map(l => (l.startsWith(prefix) ? l : prefix + l))
    const newBlock = newLines.join('\n')
    const newText = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
    setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, text: newText } : p))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newBlock.length)
    })
  }

  const handleSave = async () => {
    if (!notebookKey) return
    const hasPageContent = newPages.some(p => p.type === 'drawing' ? !!p.drawing : p.text.trim())
    if (!newTitle.trim() && !hasPageContent && newFiles.length === 0 && existingAttachments.length === 0) {
      showToast('Add a title, some text or a drawing, or a file first.', 'error'); return
    }
    setSaving(true)
    const title = newTitle.trim() || 'Untitled'
    const pages = newPages.map(p => ({ ...p, text: p.text.trim() }))
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
  const title = composing ? (readOnly ? 'Note' : (editingEntryId ? 'Edit note' : 'New note')) : 'Notebook'

  const enterEditMode = () => setReadOnly(false)

  const handleCopyNote = async () => {
    try {
      await navigator.clipboard.writeText(buildNoteText(newTitle, newPages))
      showToast('Copied note text to clipboard.', 'success')
    } catch {
      showToast('Could not copy — try again.', 'error')
    }
  }

  const handleDownloadNote = () => {
    const blob = new Blob([buildNoteText(newTitle, newPages)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(newTitle.trim() || 'note').replace(/[^\w-]+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Search and sort are client-side over the already-decrypted list -
  // nothing here ever leaves the device, same as the rest of the feature.
  const visibleEntries = entries
    .filter(e => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.trim().toLowerCase()
      return e.title.toLowerCase().includes(q) || e.pages.some(p => p.type === 'text' && p.text.toLowerCase().includes(q))
    })
    .slice()
    .sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title)
      if (sortMode === 'oldest') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  return (
    <div className="h-[100dvh] bg-slate-deep flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4 gap-3">
        <button onClick={closeButtonAction} className="text-cream-muted hover:text-cream transition-colors">
          <X size={20} />
        </button>
        <span className="text-cream font-bold flex-1">{title}</span>
        {composing && readOnly ? (
          <button onClick={enterEditMode} className="flex items-center gap-1.5 text-teal-light hover:opacity-80 font-bold text-sm transition-opacity">
            <Pencil size={14} /> Edit
          </button>
        ) : composing ? (
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
      {composing && notebookKey && readOnly && (
        // Preview toolbar - no styling or attach controls here, just a
        // way out into edit mode and the export actions, so glancing at a
        // note never leaves you one keystroke from changing it.
        <div className="flex-shrink-0 max-w-2xl w-full mx-auto px-4 pt-3">
          <div className="flex items-center gap-4 mb-3 pb-3 border-b border-slate-border">
            <button onClick={enterEditMode} className="flex items-center gap-1.5 text-teal-light hover:opacity-80 font-bold text-xs transition-opacity">
              <Pencil size={13} /> Edit
            </button>
            <button onClick={handleCopyNote} className="flex items-center gap-1.5 text-cream-muted hover:text-cream font-bold text-xs transition-colors">
              <Copy size={13} /> Copy text
            </button>
            <button onClick={handleDownloadNote} className="flex items-center gap-1.5 text-cream-muted hover:text-cream font-bold text-xs transition-colors">
              <Download size={13} /> Download .txt
            </button>
          </div>
          {existingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {existingAttachments.map(a => (
                <AttachmentChip key={a.id} attachment={a} notebookKey={notebookKey} />
              ))}
            </div>
          )}
        </div>
      )}

      {composing && notebookKey && !readOnly && (
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
              {readOnly ? (
                <p
                  style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                  className="w-full border-b border-current/15 pb-2 mb-2 text-lg font-bold"
                >
                  {newTitle || 'Untitled'}
                </p>
              ) : (
                <input
                  value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title"
                  style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                  className="w-full bg-transparent border-b border-current/15 pb-2 mb-2 text-lg font-bold placeholder:opacity-50 focus:outline-none"
                />
              )}

              {!readOnly && (
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    onClick={() => setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, type: 'text' } : p))}
                    style={{ color: style.textColor }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${newPages[currentPageIndex].type === 'text' ? 'opacity-100 border-current/40' : 'opacity-50 border-current/15'}`}
                  >
                    <Type size={12} /> Text
                  </button>
                  <button
                    onClick={() => setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, type: 'drawing' } : p))}
                    style={{ color: style.textColor }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${newPages[currentPageIndex].type === 'drawing' ? 'opacity-100 border-current/40' : 'opacity-50 border-current/15'}`}
                  >
                    <PenLine size={12} /> Draw
                  </button>
                  {newPages[currentPageIndex].type === 'drawing' && (
                    <>
                      <button
                        onClick={() => setDrawMode('pen')}
                        style={{ color: style.textColor }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${drawMode === 'pen' ? 'opacity-100 border-current/40' : 'opacity-50 border-current/15'}`}
                      >
                        <PenLine size={12} /> Pen
                      </button>
                      <button
                        onClick={() => setDrawMode('eraser')}
                        style={{ color: style.textColor }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${drawMode === 'eraser' ? 'opacity-100 border-current/40' : 'opacity-50 border-current/15'}`}
                      >
                        <Eraser size={12} /> Eraser
                      </button>
                    </>
                  )}
                  {newPages[currentPageIndex].type === 'drawing' && newPages[currentPageIndex].drawing && (
                    <button
                      onClick={() => drawingCanvasRef.current?.clear()}
                      style={{ color: style.textColor }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-current/15 text-xs font-bold opacity-50 hover:opacity-80 transition-opacity"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}

                  <div className="flex-1" />

                  {/* Note-level undo/redo - separate from the browser's own
                      per-field undo, which forgets everything the moment
                      you switch pages. Works for drawing changes too,
                      since a page's whole state (including its drawing)
                      is part of each history snapshot. */}
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    style={{ color: style.textColor }}
                    className="p-1.5 rounded-full opacity-70 hover:opacity-100 disabled:opacity-20 transition-opacity"
                    aria-label="Undo"
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    style={{ color: style.textColor }}
                    className="p-1.5 rounded-full opacity-70 hover:opacity-100 disabled:opacity-20 transition-opacity"
                    aria-label="Redo"
                  >
                    <Redo2 size={15} />
                  </button>
                </div>
              )}

              {!readOnly && newPages[currentPageIndex].type === 'text' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyInlineWrap('**')} style={{ color: style.textColor }}
                    className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyInlineWrap('*')} style={{ color: style.textColor }}
                    className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Italic"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyLinePrefix('- ')} style={{ color: style.textColor }}
                    className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Bullet list"
                  >
                    <List size={13} />
                  </button>
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyLinePrefix('# ')} style={{ color: style.textColor }}
                    className="p-1.5 rounded-lg border border-current/15 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Heading"
                  >
                    <Heading1 size={13} />
                  </button>
                </div>
              )}

              {readOnly ? (
                newPages[currentPageIndex].type === 'drawing' ? (
                  newPages[currentPageIndex].drawing ? (
                    <img
                      src={newPages[currentPageIndex].drawing!} alt="Page drawing"
                      className="flex-1 w-full min-h-[35vh] object-contain rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    />
                  ) : (
                    <div style={{ color: style.textColor }} className="flex-1 w-full min-h-[35vh] flex items-center justify-center opacity-50 text-sm">
                      This page is a blank drawing.
                    </div>
                  )
                ) : (
                  <div
                    style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                    className="flex-1 w-full min-h-[35vh] leading-relaxed"
                  >
                    {newPages[currentPageIndex].text ? renderMarkdown(newPages[currentPageIndex].text) : <span className="opacity-50">This page is empty.</span>}
                  </div>
                )
              ) : newPages[currentPageIndex].type === 'drawing' ? (
                <DrawingCanvas
                  ref={drawingCanvasRef}
                  key={currentPageIndex}
                  initialDrawing={newPages[currentPageIndex].drawing}
                  strokeColor={style.textColor}
                  mode={drawMode}
                  onChange={dataUrl => setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, drawing: dataUrl } : p))}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={newPages[currentPageIndex].text}
                  onChange={e => setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, text: e.target.value } : p))}
                  placeholder="Write as much as you want… (Markdown-style: **bold**, *italic*, - bullets, # heading)"
                  style={{ color: style.textColor, fontFamily: FONT_STACK[style.font] }}
                  className="flex-1 w-full min-h-[35vh] bg-transparent focus:outline-none resize-none leading-relaxed placeholder:opacity-50"
                />
              )}

              {!readOnly && newPages[currentPageIndex].type === 'text' && (
                <div style={{ color: style.textColor }} className="flex justify-end gap-3 text-[11px] font-bold opacity-50 pt-1.5">
                  <span>{countWords(newPages[currentPageIndex].text)} words</span>
                  <span>{newPages[currentPageIndex].text.length} characters</span>
                </div>
              )}

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
                  readOnly ? (
                    <span className="w-6" />
                  ) : (
                    <button
                      onClick={() => { setNewPages(prev => [...prev, emptyTextPage()]); setCurrentPageIndex(newPages.length) }}
                      style={{ color: style.textColor }}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Plus size={14} /> Add page
                    </button>
                  )
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

              {!loadingEntries && entries.length > 0 && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted pointer-events-none" />
                    <input
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search notes…"
                      className="w-full bg-slate-card border border-slate-border rounded-xl pl-8 pr-3 py-2 text-xs text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light"
                    />
                  </div>
                  <select
                    value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)}
                    className="bg-slate-card border border-slate-border rounded-xl px-2 text-xs text-cream-muted focus:outline-none focus:border-teal-light"
                  >
                    <option value="updated">Last edited</option>
                    <option value="title">Title A–Z</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              )}

              {loadingEntries ? (
                <p className="text-cream-muted text-sm">Loading your notes…</p>
              ) : entries.length === 0 ? (
                <p className="text-cream-muted text-sm">No notes yet — your first one is one tap away.</p>
              ) : visibleEntries.length === 0 ? (
                <p className="text-cream-muted text-sm">No notes match "{searchQuery}".</p>
              ) : (
                visibleEntries.map(entry => (
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
                        {entry.pages[0]?.type === 'drawing' ? (
                          entry.pages[0].drawing && (
                            <img
                              src={entry.pages[0].drawing} alt="Note drawing preview"
                              className="mt-2 h-20 rounded-lg object-cover"
                              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                            />
                          )
                        ) : (
                          entry.pages[0]?.text && (
                            <p style={{ color: entry.style.textColor, fontFamily: FONT_STACK[entry.style.font] }} className="text-sm mt-1 whitespace-pre-wrap opacity-90 line-clamp-4">
                              {entry.pages[0].text}
                            </p>
                          )
                        )}
                        <p style={{ color: entry.style.textColor }} className="text-[10px] font-bold opacity-50 mt-2">
                          Edited {formatRelativeTime(entry.updatedAt)}
                        </p>
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
