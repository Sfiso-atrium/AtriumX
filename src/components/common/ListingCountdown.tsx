import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ListingCountdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setLeft('Expired'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) setLeft(`${d}d ${h}h left`)
      else if (h > 0) setLeft(`${h}h ${m}m left`)
      else setLeft(`${m}m left`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [expiresAt])

  const isUrgent = left.includes('m left') && !left.includes('h') && !left.includes('d')

  return (
    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${isUrgent ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-gold/10 text-gold border-gold/30'}`}>
      <Clock size={10} />{left}
    </span>
  )
}
