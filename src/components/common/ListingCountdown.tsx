import { useEffect, useState } from 'react'

interface Props {
  expiresAt: string
}

export default function ListingCountdown({ expiresAt }: Props) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('text-cream-muted')

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('Expired')
        setColor('text-red-400')
        return
      }
      const days = Math.floor(diff / 86400000)
      const totalHours = Math.floor(diff / 3600000)
      if (days >= 2) {
        setLabel(`${days}d left`)
        setColor('text-cream-muted')
      } else {
        setLabel(`${totalHours}h left`)
        setColor('text-yellow-400')
      }
    }
    calculate()
    const interval = setInterval(calculate, 60000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return <span className={`text-xs ${color}`}>{label}</span>
}
