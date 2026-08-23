// src/components/common/GroupAvatarImage.tsx
import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getCachedImageBlob, cacheImageBlob } from '../../services/imageCache'

// `path` is the storage key in the private study-group-avatars bucket, or
// null if the group has no custom avatar. Same on-device cache approach as
// GroupChatImage — a new random path is issued on every edit (see
// uploadStudyGroupAvatar), so caching by path never shows a stale image.
export default function GroupAvatarImage({ path, size = 36 }: { path: string | null; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(null)
    if (!path) return
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
      const { data, error } = await supabase.storage.from('study-group-avatars').download(path)
      if (error || !data || cancelled) return
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

  const px = `${size}px`

  if (!url) {
    return (
      <div
        style={{ width: px, height: px }}
        className="rounded-full bg-teal-faint flex items-center justify-center flex-shrink-0"
      >
        <Users size={Math.round(size * 0.44)} className="text-teal-light" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt="Group avatar"
      style={{ width: px, height: px }}
      className="rounded-full object-cover flex-shrink-0"
    />
  )
}
