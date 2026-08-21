// src/components/common/GroupChatImage.tsx
import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getCachedImageBlob, cacheImageBlob } from '../../services/imageCache'

// `path` is the storage key: "{groupId}/{userId}/{filename}", stored in
// study_group_messages.image_url. Checks this device's IndexedDB cache
// first — only reaches out to Supabase Storage on the very first view,
// same idea whether the sender posted it while this member was online or
// they're only now opening the group after being offline.
export default function GroupChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    const load = async () => {
      const cached = await getCachedImageBlob(path)
      if (cached) {
        if (cancelled) return
        objectUrl = URL.createObjectURL(cached)
        setUrl(objectUrl)
        return
      }
      const { data, error: dlError } = await supabase.storage.from('study-group-images').download(path)
      if (dlError || !data) { if (!cancelled) setError(true); return }
      if (cancelled) return
      objectUrl = URL.createObjectURL(data)
      setUrl(objectUrl)
      cacheImageBlob(path, data)
    }
    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  const handleSaveToDevice = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || 'image.jpg'
    a.click()
  }

  if (error) {
    return <p className="text-cream-muted text-xs italic">Image unavailable</p>
  }

  if (!url) {
    return (
      <div className="w-48 h-36 rounded-xl bg-slate-card border border-slate-border animate-pulse flex items-center justify-center">
        <p className="text-cream-muted text-[11px]">Loading image...</p>
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      <img src={url} alt="Shared in group chat" className="max-w-[220px] rounded-xl border border-slate-border block" />
      <button
        onClick={handleSaveToDevice}
        title="Save to device"
        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors"
      >
        <Download size={14} />
      </button>
    </div>
  )
}
