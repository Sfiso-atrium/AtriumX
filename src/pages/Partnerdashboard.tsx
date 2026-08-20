import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Users, FileText, Wallet, Handshake } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ReferralEvent, getReferralCount, getReferralEvents, getEstimatedEarnings } from '../services/dataService'
import { supabase } from '../services/supabaseClient'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="bg-slate-deep border border-slate-border rounded-xl p-3">
      <p className="text-cream-muted text-xs font-bold mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-cream text-xs flex-1 min-w-0 truncate">{url}</p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 bg-gold hover:opacity-85 text-black text-xs font-bold px-2.5 py-1.5 rounded-lg transition-opacity flex-shrink-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const { currentUser, partner, isLoadingAuth } = useApp()
  const [referredCount, setReferredCount] = useState(0)
  const [events, setEvents] = useState<ReferralEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/student'); return }
    if (!partner) { navigate('/feed'); return }

    Promise.all([getReferralCount(currentUser.id), getReferralEvents(currentUser.id)]).then(([count, evts]) => {
      setReferredCount(count)
      setEvents(evts)
      setLoading(false)
    })
  }, [currentUser, partner, isLoadingAuth, navigate])

  // Realtime: new listings from referred users land here the moment the
  // trigger writes them — same postgres_changes pattern NotificationBell
  // already uses, just filtered to this partner's own events.
  useEffect(() => {
    if (!currentUser) return
    const channel = supabase
      .channel(`referral_events:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'referral_events', filter: `partner_id=eq.${currentUser.id}` },
        () => {
          getReferralEvents(currentUser.id).then(setEvents)
          getReferralCount(currentUser.id).then(setReferredCount)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  if (loading || !currentUser || !partner) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center">
        <p className="text-cream-muted">Loading...</p>
      </div>
    )
  }

  const origin = window.location.origin + window.location.pathname
  const studentLink = `${origin}#/student?mode=register&ref=${partner.referral_code}`
  const businessLink = `${origin}#/retailer/signup?ref=${partner.referral_code}`
  const earnings = getEstimatedEarnings(events)

  return (
    <div className="min-h-screen bg-slate-deep pb-24">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-cream-muted hover:text-cream text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <Handshake size={22} className="text-gold" />
          <h1 className="font-serif text-2xl text-cream">Referral Partner Dashboard</h1>
        </div>
        <p className="text-cream-muted text-sm mb-6">
          Share your link. When someone you referred posts a listing, it shows up here in real time — plan and all.
        </p>

        <div className="flex flex-col gap-2.5 mb-6">
          <CopyLink label="Student sign-up link" url={studentLink} />
          <CopyLink label="Business sign-up link" url={businessLink} />
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
            <Users size={16} className="text-teal-light mb-2" />
            <p className="text-cream font-serif text-2xl font-bold">{referredCount}</p>
            <p className="text-cream-muted text-xs">Referred</p>
          </div>
          <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
            <FileText size={16} className="text-sapphire-light mb-2" />
            <p className="text-cream font-serif text-2xl font-bold">{events.length}</p>
            <p className="text-cream-muted text-xs">Listings</p>
          </div>
          <div className="bg-slate-card border border-slate-border rounded-2xl p-4">
            <Wallet size={16} className="text-gold mb-2" />
            <p className="text-cream font-serif text-2xl font-bold">R{earnings.toFixed(0)}</p>
            <p className="text-cream-muted text-xs">Est. earnings</p>
          </div>
        </div>

        <h2 className="text-cream-muted text-xs font-bold uppercase tracking-wider mb-3">Activity</h2>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-cream-muted text-sm">No activity yet — share your link to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {events.map(e => (
              <div key={e.id} className="bg-slate-card border border-slate-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-cream font-bold text-sm truncate">
                      {e.referred_user?.full_name || 'A referred user'}
                    </p>
                    <p className="text-cream-muted text-xs mt-0.5 truncate">
                      Listed "{e.listing?.title || 'a listing'}" on the <span className="capitalize">{e.plan_tier}</span> plan
                    </p>
                    <p className="text-cream-muted text-xs mt-0.5">
                      {new Date(e.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className="text-gold font-bold text-sm flex-shrink-0">
                    +R{Number(e.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
