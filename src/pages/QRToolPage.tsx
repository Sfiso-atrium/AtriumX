// src/pages/QRToolPage.tsx
//
// QR code scanner + generator, reachable from Focus Mode. Fully
// client-side: generation uses the `qrcode` package (renders straight to
// a canvas), scanning uses `jsqr` to decode frames pulled from the
// device camera via getUserMedia — nothing is sent to any server.
//
// Needs two new dependencies added to package.json: "qrcode": "^1.5.4"
// and "jsqr": "^1.4.0" (plus "@types/qrcode": "^1.5.6" as a dev
// dependency — jsqr ships its own types, qrcode doesn't). Cloudflare
// Pages runs npm install on every deploy, so adding the lines to
// package.json is enough — no local install step needed.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Copy, ExternalLink, Check } from 'lucide-react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

const PAGE_BG = '#FDF3E2'
const TEXT = 'text-[#3A2E22]'
const TEXT_MUTED = 'text-[#8A7A5E]'
const ACCENT = '#C98A1D'

function looksLikeUrl(text: string): boolean {
  try {
    const u = new URL(text)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function GenerateView() {
  const [draft, setDraft] = useState('')
  const [generated, setGenerated] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!generated.trim()) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    QRCode.toCanvas(canvas, generated, {
      width: 240,
      margin: 1,
      color: { dark: '#3A2E22', light: '#FDF3E2' },
    }).catch(() => {})
  }, [generated])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Enter generates instead of inserting a newline
      if (draft.trim()) setGenerated(draft.trim())
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current
    if (!canvas || !generated.trim()) return
    const link = document.createElement('a')
    link.download = 'qr-code.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(generated)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard access can be blocked on some browsers — no harm done
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste a link or type any text, then press Enter to generate"
        rows={3}
        enterKeyHint="go"
        className={`w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm ${TEXT} placeholder:${TEXT_MUTED} focus:outline-none resize-none`}
        style={{ borderColor: `${ACCENT}66` }}
      />

      <div className="flex flex-col items-center gap-3 py-4">
        <div
          className="rounded-2xl border p-4 bg-white flex items-center justify-center"
          style={{ borderColor: `${ACCENT}44`, width: 272, height: 272 }}
        >
          {generated.trim() ? (
            <canvas ref={canvasRef} width={240} height={240} />
          ) : (
            <p className={`text-xs text-center px-6 ${TEXT_MUTED}`}>Press Enter after typing to generate your QR code</p>
          )}
        </div>


        {generated.trim() && (
          <div className="flex gap-2">
            <button
              onClick={downloadPng}
              className="px-4 py-2 rounded-full text-xs font-semibold border"
              style={{ background: `${ACCENT}22`, borderColor: `${ACCENT}88`, color: '#8A5E12' }}
            >
              Save image
            </button>
            <button
              onClick={copyText}
              className="px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5"
              style={{ borderColor: '#EADFC4', color: '#8A7A5E' }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ScanView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number>(0)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        tick()
      } catch {
        setError("Couldn't access the camera — check your browser's camera permission for this site.")
      }
    }

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && code.data) {
        setResult(code.data)
        streamRef.current?.getTracks().forEach((t) => t.stop())
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    if (!result) start()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [result])

  function scanAgain() {
    setResult(null)
    setError(null)
  }

  async function copyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // no harm if clipboard access is unavailable
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex flex-col items-center text-center gap-2 py-10">
          <p className={`text-sm ${TEXT}`}>{error}</p>
          <button
            onClick={scanAgain}
            className="px-4 py-2 rounded-full text-xs font-semibold border"
            style={{ borderColor: '#EADFC4', color: '#8A7A5E' }}
          >
            Try again
          </button>
        </div>
      ) : result ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <p className={`text-xs uppercase tracking-wide ${TEXT_MUTED}`}>Scanned</p>
          <p className={`text-sm font-semibold break-all px-4 ${TEXT}`}>{result}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {looksLikeUrl(result) && (
              <a
                href={result}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5"
                style={{ background: `${ACCENT}22`, borderColor: `${ACCENT}88`, color: '#8A5E12' }}
              >
                <ExternalLink size={13} />
                Open link
              </a>
            )}
            <button
              onClick={copyResult}
              className="px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5"
              style={{ borderColor: '#EADFC4', color: '#8A7A5E' }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={scanAgain}
              className="px-4 py-2 rounded-full text-xs font-semibold border"
              style={{ borderColor: '#EADFC4', color: '#8A7A5E' }}
            >
              Scan again
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden border relative bg-black"
          style={{ borderColor: `${ACCENT}44`, aspectRatio: '1 / 1' }}
        >
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-6 border-2 rounded-2xl pointer-events-none" style={{ borderColor: '#FDF3E2AA' }} />
        </div>
      )}
      {!result && !error && (
        <p className={`text-xs text-center ${TEXT_MUTED}`}>Point your camera at a QR code — it'll scan automatically.</p>
      )}
    </div>
  )
}

export default function QRToolPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'scan' | 'generate'>('scan')

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: PAGE_BG }}>
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => navigate('/focus')}
          className={`w-9 h-9 rounded-xl bg-white/90 shadow-sm flex items-center justify-center ${TEXT} hover:opacity-70 transition-opacity`}
        >
          <X size={18} />
        </button>
        <span className={`text-xs font-semibold ${TEXT_MUTED}`}>Focus Mode Toolkit</span>
      </div>

      <div className="max-w-md mx-auto px-5 pb-10 pt-6 flex flex-col gap-5">
        <div>
          <h1 className={`font-serif text-3xl font-bold ${TEXT}`}>QR Code</h1>
          <p className={`text-sm mt-1 ${TEXT_MUTED}`}>
            {tab === 'scan' ? 'Scan a code with your camera.' : 'Turn any text or link into a code.'}
          </p>
        </div>

        <div className="flex gap-2 border-b" style={{ borderColor: '#EADFC4' }}>
          {(['scan', 'generate'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors"
              style={
                tab === t
                  ? { borderColor: ACCENT, color: '#8A5E12' }
                  : { borderColor: 'transparent', color: '#8A7A5E' }
              }
            >
              {t === 'scan' ? 'Scan' : 'Generate'}
            </button>
          ))}
        </div>

        {tab === 'scan' ? <ScanView /> : <GenerateView />}
      </div>
    </div>
  )
}
