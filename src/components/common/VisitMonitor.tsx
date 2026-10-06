import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { bindVisitFlush, isListingForm, isTrackedPath, readVisit, retryVisitConversions, saveVisit, sendVisit } from '../../services/visitMonitor'
export default function VisitMonitor() {
  const { pathname } = useLocation()
  const { currentUser, isLoadingAuth } = useApp()
  useEffect(() => {
    if (isLoadingAuth || currentUser?.is_admin || !isTrackedPath(pathname)) return
    let wasVisible = document.visibilityState === 'visible'
    let lastTick = performance.now(), lastActivity = performance.now(), started = false
    const accrue = () => {
      const now = performance.now(), delta = Math.max(0, Math.min(20, (now - lastTick) / 1000)); lastTick = now
      if (wasVisible && now - lastActivity < 60000) {
        const v = readVisit(); v.active += delta; if (isListingForm(pathname)) v.form += delta; saveVisit()
      }
      wasVisible = document.visibilityState === 'visible'
    }
    const flush = async () => { accrue(); await sendVisit(pathname, started) }
    const activity = () => { accrue(); lastActivity = performance.now() }
    const input = (event: Event) => {
      activity()
      if (isListingForm(pathname) && event.target instanceof Element && event.target.matches('input,textarea,select')) started = true
    }
    const leaving = () => { accrue(); void sendVisit(pathname, started, true, true) }
    const visibility = () => { if (document.visibilityState === 'hidden') leaving(); else { lastTick = performance.now(); lastActivity = lastTick; void flush() } }
    void flush().then(() => retryVisitConversions()).catch(() => {})
    bindVisitFlush(flush)
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void flush().then(() => retryVisitConversions()).catch(() => {}) }, 15000)
    const initialHeartbeat = window.setTimeout(() => { if (document.visibilityState === 'visible') void flush() }, 3000)
    window.addEventListener('pagehide', leaving)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('input', input)
    document.addEventListener('change', input)
    document.addEventListener('pointerdown', activity, { passive: true })
    document.addEventListener('keydown', activity)
    document.addEventListener('scroll', activity, { passive: true })
    return () => {
      leaving(); bindVisitFlush(null); clearInterval(interval); clearTimeout(initialHeartbeat)
      window.removeEventListener('pagehide', leaving); document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('input', input); document.removeEventListener('change', input)
      document.removeEventListener('pointerdown', activity); document.removeEventListener('keydown', activity); document.removeEventListener('scroll', activity)
    }
  }, [pathname, currentUser?.id, currentUser?.is_admin, isLoadingAuth])
  return null
}
