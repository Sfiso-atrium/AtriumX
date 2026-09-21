// src/components/student/ChatImage.tsx
//
// One-time-view photo inside a 1:1 chat bubble. See migration 049.
//
// Recipient: the photo is downloaded into memory (never cached to disk, so
// there is nothing left on the device to re-open later), and once it is
// actually visible on screen the server is told it's been seen - the server
// then deletes the file from Storage. The copy in memory keeps showing until
// they leave the chat; after that it's gone for good.
//
// Sender: sees their photo until the recipient has, then it turns into a
// "seen" placeholder when the server clears image_path.
import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { Message, getChatImageBlob, markChatImageSeen } from '../../services/dataService'

interface Props {
  message: Message
  isOwn: boolean
  onLoaded?: () => void
  onOpen: (url: string) => void
}

export default function ChatImage({ message, isOwn, onLoaded, onOpen }: Props) {
  const path = message.image_path
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reportedRef = useRef(false)

  // Fetch once. After that we hold on to what we have, even if the row
  // later loses its image_path (that's just the server finishing the delete).
  useEffect(() => {
    if (!path || url) return
    let cancelled = false
    getChatImageBlob(path).then(blob => {
      if (cancelled) return
      if (!blob) { setFailed(true); return }
      setUrl(URL.createObjectURL(blob))
    })
    return () => { cancelled = true }
  }, [path])

  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [url])

  // The sender's copy goes as soon as the server has deleted the file, so
  // their screen never shows a photo the recipient has already used up.
  useEffect(() => {
    if (isOwn && !path && url) { setUrl(null); setLoaded(false) }
  }, [isOwn, path, url])

  // "Seen" = on screen, fully loaded, tab in front. Not merely "the chat
  // was opened", so a photo scrolled out of view is never spent.
  useEffect(() => {
    if (isOwn || !path || !url || !loaded || reportedRef.current) return
    const el = wrapRef.current
    if (!el) return

    const observer = new IntersectionObserver(entries => {
      if (
        !reportedRef.current &&
        document.visibilityState === 'visible' &&
        entries.some(e => e.isIntersecting)
      ) {
        reportedRef.current = true
        observer.disconnect()
        markChatImageSeen(message.id)
      }
    }, { threshold: 0.6 })
    observer.observe(el)

    // If the tab was in the background when the photo came into view,
    // look again once it's back in front.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !reportedRef.current) {
        observer.unobserve(el)
        observer.observe(el)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isOwn, path, url, loaded, message.id])

  if (url) {
    return (
      <div ref={wrapRef}>
        <button type="button" onClick={() => onOpen(url)} className="block" title="Tap to enlarge">
          <img
            src={url}
            alt="Photo shared in chat"
            onLoad={() => { setLoaded(true); onLoaded?.() }}
            className="block max-w-[220px] max-h-[260px] rounded-xl object-cover"
          />
        </button>
        <p className={`text-[10px] mt-1 px-0.5 ${isOwn ? 'text-white/70' : 'text-cream-muted'}`}>
          {isOwn ? 'Removed once they’ve seen it' : 'Disappears once you’ve seen it'}
        </p>
      </div>
    )
  }

  if (failed) {
    return <p className="text-xs italic opacity-80 px-1">Photo unavailable</p>
  }

  if (path) {
    return <div className="w-44 h-32 rounded-xl bg-slate-100 animate-pulse" />
  }

  return (
    <div className="flex items-center gap-1.5 text-xs italic opacity-80 px-1 py-0.5">
      <Camera size={14} />
      {isOwn ? 'Photo seen' : 'Photo viewed'}
    </div>
  )
}
