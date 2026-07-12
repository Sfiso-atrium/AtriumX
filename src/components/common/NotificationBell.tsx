import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Notification, getUnreadNotifications, markNotificationRead } from '../../services/dataService'
import { supabase } from '../../services/supabaseClient'
import RatingModal from '../student/RatingModal'


export default function NotificationBell() {
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
const [ratingTarget, setRatingTarget] = useState<Notification | null>(null)
const [ratingSellerId, setRatingSellerId] = useState<string | null>(null)
  const [ratingBuyerId, setRatingBuyerId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel(`notifs:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        payload => {
          setNotifications(prev => {
            if (prev.find(n => n.id === (payload.new as Notification).id)) return prev
            return [payload.new as Notification, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])


const handleBellClick = async () => {
    if (!open && notifications.length === 0 && currentUser) {
      const fetched = await getUnreadNotifications(currentUser.id)
      setNotifications(fetched)
    }
    setOpen(o => !o)
  }

  const handleMarkRead = async (notif: Notification) => {
    await markNotificationRead(notif.id)
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setOpen(false)
if (notif.type === 'rating_request' && notif.conversation_id) {
      const { data } = await supabase
        .from('conversations')
        .select('seller_id, buyer_id')
        .eq('id', notif.conversation_id)
        .single()
      if (data?.seller_id && data?.buyer_id) {
        setRatingSellerId(data.seller_id)
        setRatingBuyerId(data.buyer_id)
        setRatingTarget(notif)
      }
    } else if (notif.type === 'listing_approved' || notif.type === 'listing_rejected') {
      if (notif.listing_id) navigate(`/listing/${notif.listing_id}`)
    }
  }

  if (!currentUser) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
      onClick={handleBellClick}
        className="relative flex items-center justify-center w-9 h-9 text-cream-muted hover:text-cream transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-slate-deep border border-slate-border rounded-2xl shadow-xl z-[150] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-border">
            <p className="text-cream font-bold text-sm">Notifications</p>
          </div>
          {notifications.length === 0 ? (
<div className="px-4 py-6 text-center">
              <p className="text-cream-muted text-sm">No new notifications yet.</p>
              <p className="text-cream-muted text-xs mt-1">You will be notified when your listing is approved or someone rates you.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleMarkRead(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 border-b border-slate-border hover:bg-slate-card transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-ember mt-1.5 flex-shrink-0" />
                  <p className="text-cream-muted text-xs leading-relaxed">{notif.message}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

{ratingTarget && ratingTarget.listing_id && ratingSellerId && ratingBuyerId && (
        <RatingModal
          sellerId={ratingSellerId}
          buyerId={ratingBuyerId}
          listingId={ratingTarget.listing_id}
          listingTitle={ratingTarget.message}
          onClose={() => { setRatingTarget(null); setRatingSellerId(null); setRatingBuyerId(null) }}
          onSubmitted={() => { setRatingTarget(null); setRatingSellerId(null); setRatingBuyerId(null) }}
        />
      )}
    </div>
  )
}
