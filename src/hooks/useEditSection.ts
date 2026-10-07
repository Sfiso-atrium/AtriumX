import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Wait for the existing form's data before moving to the requested section.
export default function useEditSection(ready: boolean) {
  const location = useLocation()
  const section = (location.state as { section?: string } | null)?.section
  useEffect(() => {
    if (!ready || !section) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`edit-${section}`)
      if (!target) return
      if (target instanceof HTMLDetailsElement) target.open = true
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, section, location.key])
}
