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
// Layout note: the top bar and the style toolbar are outside the
// scrolling content area on purpose, so they're always reachable without
// hunting for them mid-scroll. There's no "attach a file" button anymore -
// pasting an image (Ctrl+V) inserts it directly into the page at the
// cursor; see RichTextEditor's onPaste below. Any attachments already
// saved on older notes still show as chips and can still be downloaded.

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Lock, Plus, Minus, Download, Trash2, Type, Image as ImageIcon,
  ChevronUp, ChevronDown, Search, Pencil, Copy, PenLine, Pen, Eraser, RotateCcw,
  Bold, Italic, Undo2, Redo2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  NotebookEntry, NotebookAttachment, NotebookStyle, NotebookPageData, DEFAULT_NOTEBOOK_STYLE, FONT_SIZE_OPTIONS,
  DEFAULT_DRAWING_BACKGROUND, DEFAULT_CANVAS_HEIGHT, emptyTextPage, emptyDrawingPage,
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

// Gets plain text out of the small HTML the rich-text editor produces -
// used for word/character counts, search matching, and the .txt export,
// none of which should see the formatting markup itself.
function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

// Shared by "copy as text" and "download .txt" so both exports stay
// identical - multi-page notes get a plain page separator, single-page
// notes are just the title followed by the body. Drawing pages have no
// text of their own, so they're represented with a plain placeholder -
// a .txt file can't hold the image itself. Formatting (bold/italic/
// bullets/headings) doesn't survive into plain text, since .txt has no
// way to represent it.
function buildNoteText(title: string, pages: NotebookPageData[]): string {
  const pageText = (p: NotebookPageData) => p.type === 'drawing' ? '[Drawing page]' : stripHtml(p.text)
  const body = pages.length > 1
    ? pages.map((p, i) => `--- Page ${i + 1} ---\n${pageText(p)}`).join('\n\n')
    : (pageText(pages[0]) || '')
  return `${title || 'Untitled'}\n\n${body}`
}

// Built client-side from the note's already-decrypted content, same as
// the .txt export - the PDF never touches the network. Text pages are
// plain wrapped text (bold/italic/bullets/headings don't survive into a
// PDF built this simply, same limitation as the .txt export); drawing
// pages embed the canvas PNG scaled to fit the page. A pasted image
// inside a text page is part of that page's HTML, not a separate
// attachment, so it won't appear here - only in the note itself.
async function exportNoteAsPdf(entry: NotebookEntry) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 16

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(entry.title || 'Untitled', margin, margin, { maxWidth })

  let cursorY = margin + 28
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)

  const pages = entry.pages.length > 0 ? entry.pages : [emptyTextPage()]
  pages.forEach((page, i) => {
    if (i > 0) { doc.addPage(); cursorY = margin }

    if (page.type === 'drawing') {
      if (!page.drawing) return
      const img = doc.getImageProperties(page.drawing)
      const availableHeight = pageHeight - cursorY - margin
      const scale = Math.min(maxWidth / img.width, availableHeight / img.height)
      const w = img.width * scale
      const h = img.height * scale
      doc.addImage(page.drawing, 'PNG', margin, cursorY, w, h)
      return
    }

    const lines = doc.splitTextToSize(stripHtml(page.text), maxWidth) as string[]
    for (const line of lines) {
      if (cursorY > pageHeight - margin) { doc.addPage(); cursorY = margin }
      doc.text(line, margin, cursorY)
      cursorY += lineHeight
    }
  })

  doc.save(`${(entry.title.trim() || 'note').replace(/[^\w-]+/g, '_')}.pdf`)
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

// One name per hex value, shared by every color list in the app (text
// color, page background, pen color, drawing background) - naming them
// in one place is what keeps the same color labeled the same way
// everywhere it shows up, rather than each control inventing its own name.
const COLOR_NAMES: Record<string, string> = {
  '#F0F4F8': 'Snow', '#0A0F1E': 'Midnight', '#D4A017': 'Gold', '#14B8A6': 'Teal',
  '#EC4899': 'Pink', '#8B949E': 'Slate', '#FDF3E2': 'Parchment', '#3C5F94': 'Blue',
  '#111827': 'Charcoal', '#1B2B1F': 'Forest', '#1B1F2E': 'Indigo', '#2B2013': 'Espresso',
  '#FBE4EC': 'Blush', '#FFFFFF': 'White',
}
function colorLabel(hex: string): string {
  return COLOR_NAMES[hex.toUpperCase()] ?? 'Custom'
}

// execCommand's queryCommandValue('foreColor') reports back as
// "rgb(r, g, b)", not hex - needed to tell whether the cursor's current
// color matches one of the named presets above.
function rgbStringToHex(rgb: string): string {
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return rgb
  return '#' + m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()
}

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

// Guards both the card's actual background AND the contrast check against
// it with the exact same notion of "valid" - if a stored color isn't a
// clean hex string (some older notes have blank/malformed values from
// before this was validated), both sides now agree on the fallback
// instead of one silently rendering white while the other assumes its
// request succeeded.
function sanitizeHexColor(color: string | undefined | null, fallback: string): string {
  return typeof color === 'string' && HEX_COLOR_RE.test(color) ? color : fallback
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const int = parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA))
  const lB = relativeLuminance(hexToRgb(hexB))
  return (Math.max(lA, lB) + 0.05) / (Math.min(lA, lB) + 0.05)
}

// The Style panel lets a note's background and text color be picked
// independently, so nothing stops someone from landing on a pairing like
// white-on-cream - both valid colors, but close enough to be functionally
// invisible against each other. That's what made two cards look blank:
// the titles were there, just unreadable. Cards fall back to a safe
// black/white text color whenever the saved pairing is too close to tell
// apart, rather than trusting it blindly.
function getReadableTextColor(background: string, requestedTextColor: string): string {
  try {
    if (contrastRatio(background, requestedTextColor) >= 2.5) return requestedTextColor
    return relativeLuminance(hexToRgb(background)) > 0.5 ? '#0A0F1E' : '#F0F4F8'
  } catch {
    return requestedTextColor
  }
}

// A text page's background can be any color the user picks, including
// plain white - if the space around it happens to be close to that same
// color, the page's edges disappear entirely. A thin border that always
// leans the opposite way (dark border on a light page, light border on a
// dark one) keeps the page visible as its own object no matter what
// color it's set to.
function getPageBorderColor(background: string): string {
  try {
    return relativeLuminance(hexToRgb(background)) > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
  } catch {
    return 'rgba(255,255,255,0.18)'
  }
}

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

// One-word toggle + chevron, same shape as "Hide tools" - every style
// control (Font, Color, Background, Size) is one of these instead of an
// always-expanded row of options, so the toolbar takes far less space
// until you actually want to change something.
function DropdownButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${open ? 'border-teal-light text-teal-light' : 'border-slate-border text-cream-muted hover:text-cream'}`}
    >
      {label} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </button>
  )
}

// One color choice: a small swatch plus the color's actual name, never a
// bare swatch alone - same row shape wherever a color is picked, text or
// drawing.
function ColorOption({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors w-full text-left ${selected ? 'border-teal-light text-teal-light bg-teal-light/10' : 'border-slate-border text-cream-muted hover:text-cream'}`}
    >
      <span className="w-4 h-4 rounded-full border border-white/25 flex-shrink-0" style={{ backgroundColor: hex }} />
      {colorLabel(hex)}
    </button>
  )
}

// The full list for one color control: every named preset, plus a
// "Custom…" entry that opens the popup picker below - identical for text
// color, page background, pen color, and drawing background, so all four
// behave and look the same.
function ColorList({
  options, value, onPick, onOpenCustom,
}: {
  options: string[]
  value: string
  onPick: (hex: string) => void
  onOpenCustom: () => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      {options.map(hex => (
        <ColorOption key={hex} hex={hex} selected={value.toUpperCase() === hex.toUpperCase()} onClick={() => onPick(hex)} />
      ))}
      <button
        onClick={onOpenCustom}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-border text-cream-muted hover:text-cream text-xs font-bold transition-colors"
      >
        <span
          className="w-4 h-4 rounded-full border border-white/25 flex-shrink-0"
          style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
        />
        Custom…
      </button>
    </div>
  )
}

// One shared popup for picking an arbitrary color - every "Custom…" entry
// above opens this same modal rather than the small inline browser color
// swatch that used to sit at the end of each row.
function CustomColorModal({
  initial, onConfirm, onClose,
}: {
  initial: string
  onConfirm: (hex: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-slate-card border border-slate-border rounded-2xl p-5 max-w-xs w-full">
        <p className="text-cream font-bold text-sm mb-3">Pick a color</p>
        <input
          type="color" value={draft} onChange={e => setDraft(e.target.value)}
          className="w-full h-20 rounded-xl border border-slate-border cursor-pointer bg-transparent mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { onConfirm(draft); onClose() }}
            className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-xs transition-colors"
          >
            Use this color
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-2 rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
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
//
// The canvas itself is always transparent - `backgroundColor` is CSS on
// the element, not baked into the saved PNG. That's what makes the
// eraser actually work (destination-out punches real transparent holes,
// which just reveal whatever background color is showing behind it) and
// lets the background be changed later without touching anything already
// drawn.
function DrawingCanvas({
  initialDrawing, strokeColor, strokeWidth, tool, backgroundColor, height, onChange,
}: {
  initialDrawing: string | null
  strokeColor: string
  strokeWidth: number
  tool: 'pen' | 'eraser'
  backgroundColor: string
  height: number
  onChange: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !initialDrawing) return
    const img = new Image()
    // Draw at the image's own natural size, not stretched to fill
    // `canvas.width`/`height` - the canvas may now be taller than the
    // drawing it's loading (see "Add more space"), and stretching would
    // distort everything already drawn instead of just leaving new blank
    // space below it.
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = initialDrawing
    // Intentionally runs once on mount only - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // destination-out erases wherever the stroke passes (the actual
      // color doesn't matter, only its opacity) - source-over is normal
      // drawing. Both tools share the same size control on purpose, so
      // adjusting size behaves predictably regardless of which tool is active.
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
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
      width={1000}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full touch-none block"
      style={{ backgroundColor }}
    />
  )
}

// A real formatting surface - actual bold/italic/bullets/headings shown
// live, never marker characters like ** or # sitting in the text. This
// replaces an earlier version that inserted literal Markdown syntax into
// a plain textarea: clicking Bold with nothing selected dropped a pair of
// ** markers and parked the cursor between them, and if focus moved away
// (switching pages, clicking elsewhere) before the closing marker got
// typed into, a stray, unpaired ** was left sitting in the note for good.
// A contentEditable surface has no such marker to lose track of.
//
// Deliberately uncontrolled after mount, same pattern as DrawingCanvas
// above: `initialHtml` is written into the DOM once via ref, then the
// browser owns the content directly and onInput syncs it back into React
// state. Driving this element's children from React on every keystroke
// (the "obvious" controlled approach) resets the cursor to the start
// after every character - a well-known contentEditable/React pitfall.
// Keyed by page index *and* an undo/redo nonce in the parent, so an
// actual remount (not a prop update) is what makes Undo/Redo visibly
// restore old content here.
//
// Takes a callback ref rather than a single shared ref object - every
// page now renders its own RichTextEditor at once (stacked vertically),
// so the parent needs one DOM reference per page, not one overall.
function RichTextEditor({
  initialHtml, registerRef, onFocus, textColor, fontFamily, fontSize, placeholder, onChange,
}: {
  initialHtml: string
  registerRef: (el: HTMLDivElement | null) => void
  onFocus: () => void
  textColor: string
  fontFamily: string
  fontSize: number
  placeholder: string
  onChange: (html: string) => void
}) {
  const localRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (localRef.current) localRef.current.innerHTML = initialHtml
    // Mount-only - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Typing "- " at the very start of a line turns that line into a bullet
  // - triggered by typing rather than a toolbar button, closer to how
  // Word/Notion do this.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== ' ') return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return
    if (node.textContent?.slice(0, range.startOffset) !== '-') return

    // Confirm the "-" is the very first thing on its line, not partway
    // through a word or after other content earlier on the same line.
    let walker: Node | null = node
    let atLineStart = true
    while (walker && walker !== e.currentTarget) {
      if (walker.previousSibling) { atLineStart = false; break }
      walker = walker.parentNode
    }
    if (!atLineStart) return

    e.preventDefault()
    const eatRange = document.createRange()
    eatRange.setStart(node, 0)
    eatRange.setEnd(node, 1)
    eatRange.deleteContents()
    document.execCommand('insertUnorderedList')
    onChange((e.currentTarget as HTMLDivElement).innerHTML)
  }

  // Ctrl+V with a screenshot/image on the clipboard inserts it right where
  // the cursor is, inline with the text - this is the entire "attach a
  // screenshot" feature now; there's no separate upload button or attached
  // file. The image just becomes part of this page's own HTML content.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue
      const file = item.getAsFile()
      if (!file) continue
      e.preventDefault()
      const reader = new FileReader()
      reader.onload = () => {
        document.execCommand('insertImage', false, reader.result as string)
        onChange((localRef.current as HTMLDivElement).innerHTML)
      }
      reader.readAsDataURL(file)
      return
    }
    // No image on the clipboard - let the browser paste text normally.
  }

  return (
    <div
      ref={el => { localRef.current = el; registerRef(el) }}
      contentEditable
      suppressContentEditableWarning
      onFocus={onFocus}
      onInput={e => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      style={{ color: textColor, fontFamily, fontSize }}
      className="w-full bg-transparent focus:outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 empty:before:content-[attr(data-placeholder)] empty:before:opacity-50"
    />
  )
}

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
  // Each style control (Font, Color, Background, Size for text; Color,
  // Background for drawing) is its own one-word dropdown now, rather than
  // one "Style" button revealing all of them at once - only one is open
  // at a time, tracked by name.
  const [openDropdown, setOpenDropdown] = useState<'font' | 'color' | 'background' | 'size' | 'pen-color' | 'page-bg' | null>(null)
  // Padding gets its own popup rather than a dropdown, since it's sliders
  // rather than a pick-one-of-these list.
  const [paddingModalOpen, setPaddingModalOpen] = useState(false)
  // One shared "pick any color" popup, reused by every color control -
  // holds which control it's currently open for (so confirming knows
  // where to send the result) and the color it should start from.
  const [colorModal, setColorModal] = useState<{ initial: string; onConfirm: (hex: string) => void } | null>(null)
  // Collapses everything from the style controls row down - Row 1
  // (Text/Draw, page navigation, Undo/Redo) stays visible either way,
  // since those are needed regardless of whether you're trying to
  // maximize writing space right now.
  const [toolsHidden, setToolsHidden] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState<NoteSnapshot | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Title is now collected up front, before the note is even opened - this
  // holds which kind was tapped ("New note" vs "New drawing") while that
  // popup is showing, and the text being typed into it.
  const [pendingNewNoteKind, setPendingNewNoteKind] = useState<'text' | 'drawing' | null>(null)
  const [newNoteTitleDraft, setNewNoteTitleDraft] = useState('')
  // Cards show only the title by default - no content preview, no dates -
  // tapping "Show details" reveals the exact creation date/time, the
  // last-edited time, and any attachments, without cluttering every card
  // in the list all the time.
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [renamingEntryId, setRenamingEntryId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [recoverableDraft, setRecoverableDraft] = useState<NotebookDraft | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'updated' | 'title' | 'oldest'>('updated')
  // One DOM ref per page, since every page's RichTextEditor is mounted at
  // once now (stacked vertically) rather than only the "current" one.
  const editableRefs = useRef<(HTMLDivElement | null)[]>([])
  // Each page's fixed-height content box, used to measure available space
  // for auto-reflow (below).
  const pageBoxRefs = useRef<(HTMLDivElement | null)[]>([])
  // A detached, invisible element used only for measuring how tall a
  // page's HTML would render - never shown, never part of the real page
  // flow. Reflow works by trying candidate HTML in here and reading
  // scrollHeight back, rather than touching the live, focused editor.
  const measureRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const div = document.createElement('div')
    div.style.position = 'fixed'
    div.style.top = '-9999px'
    div.style.left = '-9999px'
    div.style.visibility = 'hidden'
    div.style.pointerEvents = 'none'
    div.className = 'leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold'
    document.body.appendChild(div)
    measureRef.current = div
    return () => { document.body.removeChild(div) }
  }, [])
  // Bumped on every Undo/Redo. RichTextEditor is deliberately uncontrolled
  // after mount (see its own comment), so restoring old content into view
  // needs an actual remount, not just a prop change - including this in
  // its `key` (alongside currentPageIndex) forces that remount.
  const [editorNonce, setEditorNonce] = useState(0)
  // Same idea as editorNonce, for DrawingCanvas: it's also uncontrolled
  // after mount, so clearing a drawing (or undo/redo landing on a drawing
  // page) needs a forced remount to actually repaint what's on screen.
  const [drawingNonce, setDrawingNonce] = useState(0)
  // Which formatting applies at the cursor right now, so the toolbar
  // buttons can highlight themselves - kept in sync via a selectionchange
  // listener below rather than re-checked on every render.
  const [activeFormats, setActiveFormats] = useState<{ bold: boolean; italic: boolean; color: string }>({ bold: false, italic: false, color: DEFAULT_NOTEBOOK_STYLE.textColor })

  // Drawing tool settings - live state for "what the next stroke looks
  // like", not saved per note (same as any drawing app's current brush).
  // Only the canvas background is actually persisted, since that's a
  // property of the page itself rather than a tool setting.
  const [penColor, setPenColor] = useState('#F0F4F8')
  const [penSize, setPenSize] = useState(4)
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen')

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

  // Auto-reflow - after a pause in typing, check each text page against
  // its fixed height and move whatever doesn't fit onto the next page
  // (creating one if needed), or pull content back from the next page if
  // this one now has room to spare. Runs against a hidden, detached copy
  // of the HTML (measureRef) rather than the live, focused editor, so
  // reflowing never fights the browser over where your cursor is while
  // you're mid-sentence - it only touches React state, and only pages
  // whose content actually needs to move get remounted.
  //
  // Works at the level of whole elements (paragraphs, list items) - a
  // single very long paragraph with no line breaks at all can't be split
  // mid-run, and may still overflow its own page.
  useEffect(() => {
    if (!composing || readOnly) return
    if (newPages[0]?.type !== 'text') return
    const timeout = setTimeout(() => {
      const measure = measureRef.current
      const sampleBox = pageBoxRefs.current.find(Boolean)
      if (!measure || !sampleBox) return
      const capacity = sampleBox.clientHeight
      measure.style.width = `${sampleBox.clientWidth}px`
      measure.style.fontFamily = FONT_STACK[style.font]
      measure.style.fontSize = `${style.fontSize}px`

      const heightOf = (html: string) => { measure.innerHTML = html; return measure.scrollHeight }

      let pages = newPages.map(p => ({ ...p }))
      let changed = false
      let i = 0
      while (i < pages.length) {
        // Pull forward from the next page while there's room to spare.
        while (
          heightOf(pages[i].text) < capacity - 4 &&
          pages[i + 1] && pages[i + 1].text
        ) {
          const temp = document.createElement('div')
          temp.innerHTML = pages[i + 1].text
          const firstChild = temp.firstChild
          if (!firstChild) break
          const piece = firstChild instanceof Element ? firstChild.outerHTML : (firstChild.textContent || '')
          const combined = pages[i].text + piece
          if (heightOf(combined) > capacity) break
          firstChild.remove()
          pages[i] = { ...pages[i], text: combined }
          pages[i + 1] = { ...pages[i + 1], text: temp.innerHTML }
          changed = true
        }

        // Push overflow forward onto the next page.
        if (heightOf(pages[i].text) > capacity) {
          const temp = document.createElement('div')
          temp.innerHTML = pages[i].text
          const moved: string[] = []
          while (temp.childNodes.length > 1 && heightOf(temp.innerHTML) > capacity) {
            const last = temp.lastChild!
            moved.unshift(last instanceof Element ? last.outerHTML : (last.textContent || ''))
            temp.removeChild(last)
          }
          if (moved.length > 0) {
            if (!pages[i + 1]) pages.splice(i + 1, 0, emptyTextPage())
            pages[i] = { ...pages[i], text: temp.innerHTML }
            pages[i + 1] = { ...pages[i + 1], text: moved.join('') + pages[i + 1].text }
            changed = true
          }
        }

        // A trailing page fully drained by a pull-back is pointless to
        // keep around - drop it, the way Word closes an emptied last page.
        if (i === pages.length - 2 && pages[i + 1] && stripHtml(pages[i + 1].text).trim() === '') {
          pages.splice(i + 1, 1)
          changed = true
        }
        i++
      }

      if (changed) {
        const focusedPage = currentPageIndex
        const clampedFocusedPage = Math.min(focusedPage, pages.length - 1)
        setNewPages(pages)
        setCurrentPageIndex(clampedFocusedPage)
        setEditorNonce(n => n + 1)
        setTimeout(() => {
          const el = editableRefs.current[clampedFocusedPage]
          if (!el) return
          el.focus()
          const range = document.createRange()
          range.selectNodeContents(el)
          range.collapse(false)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }, 0)
      }
    }, 700)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPages, composing, readOnly])

  // Keeps the formatting toolbar's highlighted state (which button looks
  // "active") matched to whatever's actually true at the cursor - e.g.
  // the Bold button lights up while the cursor sits inside bold text.
  useEffect(() => {
    if (!composing || readOnly) return
    const updateActiveFormats = () => {
      const el = editableRefs.current[currentPageIndex]
      if (!el || !el.contains(document.getSelection()?.anchorNode ?? null)) return
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        color: rgbStringToHex(document.queryCommandValue('foreColor')),
      })
    }
    document.addEventListener('selectionchange', updateActiveFormats)
    return () => document.removeEventListener('selectionchange', updateActiveFormats)
  }, [composing, readOnly, currentPageIndex])

  // Defense in depth for the crash below: currentPageIndex must never
  // point past the end of newPages, whichever of the several places that
  // update newPages caused it to shrink. A few call sites already clamp
  // this themselves, but several unguarded `newPages[currentPageIndex]`
  // reads elsewhere assume it's always in range - this is what keeps
  // that assumption true no matter what.
  useEffect(() => {
    if (currentPageIndex > newPages.length - 1) setCurrentPageIndex(newPages.length - 1)
  }, [newPages, currentPageIndex])

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

  const openNewNote = (kind: 'text' | 'drawing', title: string) => {
    setEditingEntryId(null)
    const startPages = [kind === 'text' ? emptyTextPage() : emptyDrawingPage()]
    editableRefs.current = []
    setNewTitle(title); setNewPages(startPages); setCurrentPageIndex(0); setStyle(DEFAULT_NOTEBOOK_STYLE)
    setExistingAttachments([]); setRemovedAttachmentIds([]); setNewFiles([])
    setInitialSnapshot({ title, pages: startPages, style: DEFAULT_NOTEBOOK_STYLE })
    resetHistory({ title, pages: startPages, style: DEFAULT_NOTEBOOK_STYLE })
    setOpenDropdown(null)
    setReadOnly(false)
    setComposing(true)
  }

  // Shows the title popup for the given kind; openNewNote itself only
  // runs once a title is actually submitted from that popup.
  const startNewNote = (kind: 'text' | 'drawing') => {
    setNewNoteTitleDraft('')
    setPendingNewNoteKind(kind)
  }

  const confirmNewNoteTitle = () => {
    if (!pendingNewNoteKind) return
    openNewNote(pendingNewNoteKind, newNoteTitleDraft.trim() || 'Untitled')
    setPendingNewNoteKind(null)
  }

  // Opens straight into a read-only glance view rather than the editor -
  // tapping a note card shouldn't put you one accidental keystroke away
  // from changing it. The "Edit" button in that view is what flips
  // readOnly off.
  const openEditNote = (entry: NotebookEntry) => {
    setEditingEntryId(entry.id)
    const pages = entry.pages.length > 0 ? entry.pages : [emptyTextPage()]
    editableRefs.current = []
    setNewTitle(entry.title); setNewPages(pages); setCurrentPageIndex(0); setStyle(entry.style)
    setExistingAttachments(entry.attachments); setRemovedAttachmentIds([]); setNewFiles([])
    setInitialSnapshot({ title: entry.title, pages, style: entry.style })
    resetHistory({ title: entry.title, pages, style: entry.style })
    setOpenDropdown(null)
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
    editableRefs.current = []
    setEditingEntryId(draft.editingEntryId)
    setNewTitle(draft.title); setNewPages(pages)
    setCurrentPageIndex(Math.min(draft.currentPageIndex ?? 0, pages.length - 1))
    setStyle(draft.style)
    setExistingAttachments(original?.attachments ?? [])
    setRemovedAttachmentIds([]); setNewFiles([])
    const original_snapshot: NoteSnapshot = original
      ? { title: original.title, pages: original.pages.length > 0 ? original.pages : [emptyTextPage()], style: original.style }
      : { title: '', pages: [emptyTextPage()], style: DEFAULT_NOTEBOOK_STYLE }
    setInitialSnapshot(original_snapshot)
    setOpenDropdown(null)
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

  // Renames a note directly from its card - title can be changed any time
  // after creation, but there's no title field inside the composer itself
  // any more, so this is the only place to do it.
  const handleRenameEntry = async (entry: NotebookEntry) => {
    const title = renameDraft.trim() || 'Untitled'
    setRenamingEntryId(null)
    if (!notebookKey || title === entry.title) return
    const { error } = await updateNotebookEntry(entry.id, currentUser.id, notebookKey, title, entry.pages, entry.style, [], [])
    if (error) { showToast(error, 'error'); return }
    loadEntries(notebookKey)
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
    setEditorNonce(n => n + 1)
    setDrawingNonce(n => n + 1)
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
    setEditorNonce(n => n + 1)
    setDrawingNonce(n => n + 1)
    lastSnapshotRef.current = next
  }

  // Reads the editable div's current HTML and syncs it into React state -
  // called after every toolbar formatting action as a safety net, since
  // execCommand's native 'input' event isn't 100% guaranteed to fire the
  // same way across browsers the way a normal keystroke does.
  const syncCurrentPageFromEditor = () => {
    const el = editableRefs.current[currentPageIndex]
    if (!el) return
    const html = el.innerHTML
    setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, text: html } : p))
  }

  const applyBold = () => { editableRefs.current[currentPageIndex]?.focus(); document.execCommand('bold'); syncCurrentPageFromEditor() }
  const applyItalic = () => { editableRefs.current[currentPageIndex]?.focus(); document.execCommand('italic'); syncCurrentPageFromEditor() }

  // Selection-scoped, exactly like Bold/Italic above - this is what keeps
  // pages "detached" from each other and from themselves: picking a color
  // only recolors the highlighted text, or (with nothing selected) sets
  // the color for whatever gets typed next at the cursor. It never
  // touches the rest of the page.
  const applyTextColor = (hex: string) => {
    const el = editableRefs.current[currentPageIndex]
    if (!el) return
    el.focus();
    (document as unknown as { execCommand: (cmd: string, ui?: boolean, value?: unknown) => boolean }).execCommand('styleWithCSS', false, true)
    document.execCommand('foreColor', false, hex)
    syncCurrentPageFromEditor()
  }

  const applyFontFamily = (fontKey: NotebookStyle['font']) => {
    const el = editableRefs.current[currentPageIndex]
    if (!el) return
    el.focus();
    (document as unknown as { execCommand: (cmd: string, ui?: boolean, value?: unknown) => boolean }).execCommand('styleWithCSS', false, true)
    document.execCommand('fontName', false, FONT_STACK[fontKey])
    syncCurrentPageFromEditor()
  }

  // execCommand's own 'fontSize' only supports the legacy 1-7 HTML scale,
  // not arbitrary pixel values - the standard workaround is to apply a
  // throwaway marker size, then swap that marker for a real px value on
  // whatever it just wrapped.
  const applyFontSize = (px: number) => {
    const el = editableRefs.current[currentPageIndex]
    if (!el) return
    el.focus()
    document.execCommand('fontSize', false, '7')
    el.querySelectorAll('font[size="7"]').forEach(node => {
      const span = node as HTMLElement
      span.removeAttribute('size')
      span.style.fontSize = `${px}px`
    })
    syncCurrentPageFromEditor()
  }

  // Sets the current drawing page's own background color - persisted per
  // page (unlike pen color/size/tool, which are just live tool settings).
  const setCurrentPageBackground = (color: string) => {
    setNewPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, drawingBackground: color } : p))
  }

  const handleSave = async () => {
    if (!notebookKey) return
    const hasPageContent = newPages.some(p => p.type === 'drawing' ? !!p.drawing : stripHtml(p.text).trim())
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
      return e.title.toLowerCase().includes(q) || e.pages.some(p => p.type === 'text' && stripHtml(p.text).toLowerCase().includes(q))
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

      {pendingNewNoteKind && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => setPendingNewNoteKind(null)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-slate-card border border-slate-border rounded-2xl p-5 max-w-sm w-full">
            <p className="text-cream font-bold text-sm mb-1">
              {pendingNewNoteKind === 'text' ? 'Name this note' : 'Name this drawing'}
            </p>
            <p className="text-cream-muted text-xs mb-4 leading-relaxed">
              Give it a title now - you can rename it later from the list.
            </p>
            <input
              autoFocus
              value={newNoteTitleDraft}
              onChange={e => setNewNoteTitleDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmNewNoteTitle() }}
              placeholder="Title"
              className="w-full bg-slate-deep border border-slate-border rounded-xl px-3 py-2.5 text-sm text-cream placeholder:text-cream-muted focus:outline-none focus:border-teal-light mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmNewNoteTitle}
                className="flex-1 bg-ember hover:bg-ember-dark text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setPendingNewNoteKind(null)}
                className="flex-1 border border-slate-border text-cream-muted hover:text-cream font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {paddingModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => setPaddingModalOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="bg-slate-card border border-slate-border rounded-2xl p-5 max-w-xs w-full">
            <p className="text-cream font-bold text-sm mb-4">Page padding</p>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-cream-muted text-xs font-bold">Horizontal</span>
                  <span className="text-cream-muted text-xs font-bold">{style.paddingX}px</span>
                </div>
                <input
                  type="range" min={8} max={80} value={style.paddingX}
                  onChange={e => setStyle(s => ({ ...s, paddingX: Number(e.target.value) }))}
                  className="w-full accent-teal-light"
                  aria-label="Horizontal padding"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-cream-muted text-xs font-bold">Vertical</span>
                  <span className="text-cream-muted text-xs font-bold">{style.paddingY}px</span>
                </div>
                <input
                  type="range" min={8} max={80} value={style.paddingY}
                  onChange={e => setStyle(s => ({ ...s, paddingY: Number(e.target.value) }))}
                  className="w-full accent-teal-light"
                  aria-label="Vertical padding"
                />
              </div>
            </div>
            <button
              onClick={() => setPaddingModalOpen(false)}
              className="w-full mt-5 bg-ember hover:bg-ember-dark text-white font-bold py-2 rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {colorModal && (
        <CustomColorModal
          initial={colorModal.initial}
          onConfirm={colorModal.onConfirm}
          onClose={() => setColorModal(null)}
        />
      )}

      {(checking || !setupExists || !notebookKey) ? (
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

          ) : (
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
          )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: the notes list. Always visible on wider screens,
              side-by-side with whatever note is open - on a phone, it's
              the only thing shown until a note is opened, same full-screen
              list as before. */}
          <div className={`${composing ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:flex-shrink-0 md:border-r md:border-slate-border flex-col overflow-y-auto`}>
            <div className="px-4 py-4 flex flex-col gap-4">
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

              <div className="flex gap-2">
                <button onClick={() => startNewNote('text')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  <Type size={15} /> New note
                </button>
                <button onClick={() => startNewNote('drawing')}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-ember text-ember hover:bg-ember/10 font-bold py-3 rounded-xl text-sm transition-colors">
                  <PenLine size={15} /> New drawing
                </button>
              </div>

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
                visibleEntries.map(entry => {
                  const isExpanded = expandedEntryId === entry.id
                  const isRenaming = renamingEntryId === entry.id
                  const cardBackground = sanitizeHexColor(entry.style.background, DEFAULT_NOTEBOOK_STYLE.background)
                  // Deliberately NOT entry.style.textColor - the list should
                  // read consistently no matter what color each note's own
                  // writing surface uses. getReadableTextColor still flips
                  // to the opposite of that default if a particular card's
                  // background can't support it, so titles stay visible
                  // even when the whole page background changes.
                  const cardTextColor = getReadableTextColor(cardBackground, DEFAULT_NOTEBOOK_STYLE.textColor)
                  return (
                  <Card key={entry.id} onClick={() => !isRenaming && openEditNote(entry)} style={{ backgroundColor: cardBackground }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {entry.pages[0]?.type === 'drawing' ? (
                            <PenLine size={12} style={{ color: cardTextColor }} className="flex-shrink-0 opacity-60" />
                          ) : (
                            <Type size={12} style={{ color: cardTextColor }} className="flex-shrink-0 opacity-60" />
                          )}
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setRenameDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenameEntry(entry); if (e.key === 'Escape') setRenamingEntryId(null) }}
                              onBlur={() => handleRenameEntry(entry)}
                              style={{ color: cardTextColor, fontFamily: FONT_STACK[entry.style.font] }}
                              className="font-bold text-sm bg-transparent border-b border-current/30 focus:outline-none flex-1 min-w-0"
                            />
                          ) : (
                            <p
                              style={{ color: cardTextColor, fontFamily: FONT_STACK[entry.style.font] }}
                              className={isExpanded ? 'font-bold text-sm' : 'font-bold text-sm truncate'}
                            >
                              {entry.title}
                            </p>
                          )}
                          {entry.pages.length > 1 && (
                            <span
                              style={{ color: cardTextColor, borderColor: `${cardTextColor}30` }}
                              className="flex-shrink-0 text-[10px] font-bold border rounded-full px-1.5 py-0.5 opacity-70"
                            >
                              {entry.pages.length} pages
                            </span>
                          )}
                        </div>
                        {isExpanded && !isRenaming && (
                          <div className="flex items-center gap-2 mt-1">
                            <p style={{ color: cardTextColor }} className="text-[11px] font-bold opacity-70">
                              Created {new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <button
                              onClick={e => { e.stopPropagation(); setRenamingEntryId(entry.id); setRenameDraft(entry.title) }}
                              style={{ color: cardTextColor }}
                              className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                              aria-label="Rename"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}
                        {isExpanded && (
                          <p style={{ color: cardTextColor }} className="text-[11px] font-bold opacity-70 mt-1">
                            Edited {formatRelativeTime(entry.updatedAt)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedEntryId(isExpanded ? null : entry.id) }}
                            style={{ color: cardTextColor }}
                            className="text-[10px] font-bold opacity-50 hover:opacity-90 transition-opacity underline"
                          >
                            {isExpanded ? 'Hide details' : 'Show details'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); exportNoteAsPdf(entry) }}
                          style={{ color: cardTextColor }}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                          aria-label="Download as PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(entry.id) }}
                          style={{ color: cardTextColor }}
                          className="opacity-60 hover:opacity-100 hover:!text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {confirmDeleteId === entry.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="mt-3 pt-3 border-t border-current/15"
                      >
                        <p style={{ color: cardTextColor }} className="text-xs opacity-90 mb-2">
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
                            style={{ borderColor: `${cardTextColor}40`, color: cardTextColor }}
                            className="flex-1 border font-bold py-2 rounded-xl text-xs transition-colors opacity-80 hover:opacity-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanded && entry.attachments.length > 0 && (
                      <div onClick={e => e.stopPropagation()} className="flex flex-wrap gap-2 mt-3">
                        {entry.attachments.map(a => (
                          <AttachmentChip key={a.id} attachment={a} notebookKey={notebookKey} />
                        ))}
                      </div>
                    )}
                  </Card>
                )})
              )}
            </div>
          </div>

          {/* Main pane: the open note. Always visible on wider screens
              (showing an empty-state placeholder when nothing's open) -
              on a phone, only shown while composing, taking the full screen. */}
          <div className={`${composing ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto`}>
      {composing && notebookKey && readOnly && (
        // Preview toolbar - no styling or attach controls here, just a
        // way out into edit mode and the export actions, so glancing at a
        // note never leaves you one keystroke from changing it.
        <div className="flex-shrink-0 w-full px-4 pt-3">
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
        <div className="flex-shrink-0 w-full pt-3">
          {/* Row 1: whole-note controls only. Text/Draw/Clear used to live
              here, but now that every page is visible in one scroll
              (instead of one page shown at a time), each page needs its
              own local Text/Draw/Clear - a single global one wouldn't know
              which page it's supposed to apply to. Page nav (Prev/Next/
              "Page X of Y") is gone entirely - scrolling is the navigation
              now. */}
          <div className="flex items-center gap-1.5 px-4 pb-3 border-b border-slate-border flex-wrap">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-full text-cream-muted opacity-70 hover:opacity-100 disabled:opacity-20 transition-opacity"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-full text-cream-muted opacity-70 hover:opacity-100 disabled:opacity-20 transition-opacity"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>

            <div className="w-px h-4 bg-slate-border mx-1" />

            <button
              onClick={() => setToolsHidden(h => !h)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-cream-muted opacity-70 hover:opacity-100 transition-opacity"
            >
              {toolsHidden ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {toolsHidden ? 'Show tools' : 'Hide tools'}
            </button>
          </div>

          {!toolsHidden && (
            <>
          {/* Row 2: contextual by page type. Text style must not appear
              while drawing, and drawing tools must not appear while
              writing - the two never show at the same time. Bold/Italic/
              Pen/Eraser stay inline since they're single-tap toggles;
              Font/Color/Background/Size are each their own one-word
              dropdown so the row stays compact until you actually open one. */}
          {newPages[currentPageIndex].type === 'text' ? (
            <div className="flex items-center gap-1.5 px-4 pb-3 border-b border-slate-border flex-wrap">
              <button
                onClick={applyBold}
                className={`p-1.5 rounded-lg border transition-opacity ${activeFormats.bold ? 'opacity-100 border-teal-light text-teal-light' : 'opacity-70 border-slate-border text-cream-muted hover:opacity-100'}`}
                aria-label="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                onClick={applyItalic}
                className={`p-1.5 rounded-lg border transition-opacity ${activeFormats.italic ? 'opacity-100 border-teal-light text-teal-light' : 'opacity-70 border-slate-border text-cream-muted hover:opacity-100'}`}
                aria-label="Italic"
              >
                <Italic size={13} />
              </button>
              <DropdownButton label="Font" open={openDropdown === 'font'} onClick={() => setOpenDropdown(o => o === 'font' ? null : 'font')} />
              <DropdownButton label="Color" open={openDropdown === 'color'} onClick={() => setOpenDropdown(o => o === 'color' ? null : 'color')} />
              <DropdownButton label="Background" open={openDropdown === 'background'} onClick={() => setOpenDropdown(o => o === 'background' ? null : 'background')} />
              <DropdownButton label="Size" open={openDropdown === 'size'} onClick={() => setOpenDropdown(o => o === 'size' ? null : 'size')} />
              <button
                onClick={() => setPaddingModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-border text-cream-muted hover:text-cream text-xs font-bold transition-colors"
              >
                Padding
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-4 pb-3 border-b border-slate-border flex-wrap">
              <button
                onClick={() => setDrawTool('pen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${drawTool === 'pen' ? 'opacity-100 border-teal-light text-teal-light' : 'opacity-50 border-slate-border text-cream-muted'}`}
              >
                <Pen size={12} /> Pen
              </button>
              <button
                onClick={() => setDrawTool('eraser')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition-opacity ${drawTool === 'eraser' ? 'opacity-100 border-teal-light text-teal-light' : 'opacity-50 border-slate-border text-cream-muted'}`}
              >
                <Eraser size={12} /> Eraser
              </button>
              {drawTool === 'pen' && (
                <DropdownButton label="Color" open={openDropdown === 'pen-color'} onClick={() => setOpenDropdown(o => o === 'pen-color' ? null : 'pen-color')} />
              )}
              <DropdownButton label="Background" open={openDropdown === 'page-bg'} onClick={() => setOpenDropdown(o => o === 'page-bg' ? null : 'page-bg')} />
            </div>
          )}

          {newPages[currentPageIndex].type === 'text' ? (
            <>
              {openDropdown === 'font' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <div className="flex flex-col gap-1 min-w-[150px]">
                    {FONT_OPTIONS.map(f => (
                      <button
                        key={f.key} onClick={() => { applyFontFamily(f.key); setOpenDropdown(null) }} style={{ fontFamily: f.stack }}
                        className="flex items-center px-2.5 py-1.5 rounded-lg border border-slate-border text-cream-muted hover:text-cream text-xs transition-colors text-left"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {openDropdown === 'color' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <ColorList
                    options={TEXT_COLOR_OPTIONS}
                    value={activeFormats.color}
                    onPick={hex => { applyTextColor(hex); setOpenDropdown(null) }}
                    onOpenCustom={() => setColorModal({ initial: activeFormats.color, onConfirm: hex => { applyTextColor(hex); setOpenDropdown(null) } })}
                  />
                </div>
              )}
              {openDropdown === 'background' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <ColorList
                    options={BACKGROUND_OPTIONS}
                    value={style.background}
                    onPick={hex => { setStyle(s => ({ ...s, background: hex })); setOpenDropdown(null) }}
                    onOpenCustom={() => setColorModal({ initial: style.background, onConfirm: hex => { setStyle(s => ({ ...s, background: hex })); setOpenDropdown(null) } })}
                  />
                </div>
              )}
              {openDropdown === 'size' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                    {FONT_SIZE_OPTIONS.map(size => (
                      <button
                        key={size} onClick={() => { applyFontSize(size); setOpenDropdown(null) }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-border text-cream-muted hover:text-cream text-xs font-bold transition-colors"
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 pb-3 border-b border-slate-border">
                <span className="text-cream-muted text-[11px] font-bold opacity-70 w-12 flex-shrink-0">Size</span>
                <button
                  onClick={() => setPenSize(s => Math.max(1, s - 1))}
                  className="p-1 rounded-full text-cream-muted opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Decrease size"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="range" min={1} max={40} value={penSize}
                  onChange={e => setPenSize(Number(e.target.value))}
                  className="flex-1 min-w-0"
                />
                <button
                  onClick={() => setPenSize(s => Math.min(40, s + 1))}
                  className="p-1 rounded-full text-cream-muted opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Increase size"
                >
                  <Plus size={13} />
                </button>
                <span className="text-cream-muted text-[11px] font-bold opacity-70 w-8 text-right flex-shrink-0">{penSize}px</span>
              </div>

              {openDropdown === 'pen-color' && drawTool === 'pen' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <ColorList
                    options={TEXT_COLOR_OPTIONS}
                    value={penColor}
                    onPick={hex => { setPenColor(hex); setOpenDropdown(null) }}
                    onOpenCustom={() => setColorModal({ initial: penColor, onConfirm: hex => { setPenColor(hex); setOpenDropdown(null) } })}
                  />
                </div>
              )}
              {openDropdown === 'page-bg' && (
                <div className="px-4 pb-3 border-b border-slate-border">
                  <ColorList
                    options={BACKGROUND_OPTIONS}
                    value={newPages[currentPageIndex].drawingBackground || DEFAULT_DRAWING_BACKGROUND}
                    onPick={hex => { setCurrentPageBackground(hex); setOpenDropdown(null) }}
                    onOpenCustom={() => setColorModal({
                      initial: newPages[currentPageIndex].drawingBackground || DEFAULT_DRAWING_BACKGROUND,
                      onConfirm: hex => { setCurrentPageBackground(hex); setOpenDropdown(null) },
                    })}
                  />
                </div>
              )}
            </>
          )}

          {existingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 px-4">
              {existingAttachments.map(a => (
                <AttachmentChip key={a.id} attachment={a} notebookKey={notebookKey} onRemove={() => handleRemoveExistingAttachment(a.id)} />
              ))}
            </div>
          )}
            </>
          )}
        </div>
      )}

            <div className="flex-1 overflow-y-auto">
              {!composing ? (
                <div className="w-full h-full flex items-center justify-center text-cream-muted text-sm">
                  Select a note, or start a new one.
                </div>
              ) : newPages[0]?.type === 'drawing' ? (
                // Drawing notes are one continuous canvas, not paginated -
                // no padding, no border radius, no margin around it, so it
                // fills the entire pane edge to edge (OneNote's infinite
                // canvas has no framing chrome either). "Clear" and "Add
                // more space" are the only controls, kept to a single slim
                // strip rather than a full toolbar over the drawing itself.
                <div className="w-full h-full flex flex-col">
                  {!readOnly && newPages[0].drawing && (
                    <div className="flex justify-end px-2 py-1 flex-shrink-0">
                      <button
                        onClick={() => { setNewPages(prev => [{ ...prev[0], drawing: null }]); setDrawingNonce(n => n + 1) }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-border text-[11px] font-bold text-cream-muted opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <RotateCcw size={10} /> Clear
                      </button>
                    </div>
                  )}
                  <div
                    ref={el => { pageBoxRefs.current[0] = el }}
                    style={{ backgroundColor: newPages[0].drawingBackground || DEFAULT_DRAWING_BACKGROUND }}
                    className="flex-1"
                  >
                    {readOnly ? (
                      newPages[0].drawing ? (
                        <img src={newPages[0].drawing} alt="Drawing" className="w-full h-full object-contain" />
                      ) : (
                        <div style={{ color: style.textColor }} className="w-full h-full flex items-center justify-center opacity-50 text-sm">
                          This drawing is blank.
                        </div>
                      )
                    ) : (
                      <DrawingCanvas
                        key={`0-${drawingNonce}`}
                        initialDrawing={newPages[0].drawing}
                        height={newPages[0].canvasHeight ?? DEFAULT_CANVAS_HEIGHT}
                        strokeColor={penColor}
                        strokeWidth={penSize}
                        tool={drawTool}
                        backgroundColor={newPages[0].drawingBackground || DEFAULT_DRAWING_BACKGROUND}
                        onChange={dataUrl => setNewPages(prev => [{ ...prev[0], drawing: dataUrl }])}
                      />
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => {
                        setNewPages(prev => [{ ...prev[0], canvasHeight: (prev[0].canvasHeight ?? DEFAULT_CANVAS_HEIGHT) + 600 }])
                        setDrawingNonce(n => n + 1)
                      }}
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 py-3 border-t border-slate-border text-cream-muted text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Plus size={14} /> Add more space
                    </button>
                  )}
                </div>
              ) : (
              <div className="w-full px-4 py-4 flex flex-col min-h-full">
            <div className="flex flex-col gap-6">
                {newPages.map((page, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: style.background,
                      borderColor: getPageBorderColor(style.background),
                      paddingLeft: style.paddingX, paddingRight: style.paddingX,
                      paddingTop: style.paddingY,
                      // A little extra beyond the user's chosen bottom
                      // padding, reserved for the page number footer below,
                      // so a small chosen padding still leaves it room.
                      paddingBottom: style.paddingY + 24,
                    }}
                    // A4/exercise-book pages are √2 taller than they are
                    // wide (210mm × 297mm) - aspect-ratio keeps that exact
                    // proportion at any width, so a page is never a square
                    // or an arbitrary viewport-relative box, on any screen.
                    className="relative w-full max-w-2xl mx-auto flex-shrink-0 aspect-[210/297] flex flex-col border"
                  >
                    <div ref={el => { pageBoxRefs.current[i] = el }} className="flex-1 min-h-0 overflow-y-auto">
                    {readOnly ? (
                      page.text ? (
                        <div
                          style={{ color: style.textColor, fontFamily: FONT_STACK[style.font], fontSize: style.fontSize }}
                          className="w-full leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
                          dangerouslySetInnerHTML={{ __html: page.text }}
                        />
                      ) : (
                        <div style={{ color: style.textColor }} className="w-full h-full flex items-center opacity-50 text-sm">
                          This page is empty.
                        </div>
                      )
                    ) : (
                      <RichTextEditor
                        key={`${i}-${editorNonce}`}
                        initialHtml={page.text}
                        registerRef={el => { editableRefs.current[i] = el }}
                        onFocus={() => setCurrentPageIndex(i)}
                        textColor={style.textColor}
                        fontFamily={FONT_STACK[style.font]}
                        fontSize={style.fontSize}
                        placeholder="Write as much as you want…"
                        onChange={html => setNewPages(prev => prev.map((p, idx) => idx === i ? { ...p, text: html } : p))}
                      />
                    )}
                    </div>

                    {!readOnly && (
                      <div style={{ color: style.textColor }} className="flex justify-end gap-3 text-[11px] font-bold opacity-50 pt-1.5 flex-shrink-0">
                        <span>{countWords(stripHtml(page.text))} words</span>
                        <span>{stripHtml(page.text).length} characters</span>
                      </div>
                    )}

                    {newPages.length > 1 && (
                      <span
                        style={{ color: style.textColor }}
                        className="absolute bottom-2 inset-x-0 text-center text-[11px] font-bold opacity-50 pointer-events-none"
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <button
                    onClick={() => { setNewPages(prev => [...prev, emptyTextPage()]); setCurrentPageIndex(newPages.length) }}
                    style={{ color: style.textColor }}
                    className="w-full max-w-2xl mx-auto flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-border text-cream-muted text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Plus size={14} /> Add page
                  </button>
                )}
            </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
