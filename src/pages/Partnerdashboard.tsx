import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Users, FileText, Wallet, Handshake, RefreshCw, ChevronDown, Link2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPartnerStatus, type Partner } from '../services/dataService'
import { getPartnerOverview, type PartnerOverview } from '../services/partnerReferral'
import { partnerLinks } from '../utils/partnerReferral'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

export function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const handleCopy = async () => {
    setError(false)
    try { await navigator.clipboard.writeText(url); setCopied(true) }
    catch { setCopied(false); setError(true) }
  }
  return <div className="bg-slate-card border border-slate-border rounded-xl p-3">
    <p className="text-cream-muted text-xs font-bold mb-1.5">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        <input aria-label={`${label} referral link`} readOnly value={url} onFocus={e => e.target.select()} className="bg-slate-deep text-cream text-xs flex-1 min-w-0 border border-slate-border rounded-lg p-2" />
        <button type="button" aria-label={`Copy ${label.toLowerCase()} link`} onClick={handleCopy} className="flex items-center gap-1 bg-gold text-black text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    {error && <p role="alert" className="text-cream-muted text-xs mt-2">Copy was blocked. Select the link above and copy it manually.</p>}
  </div>
}
const money = (value: number) => `R${Number(value).toFixed(2)}`
const labels: Record<string, string> = { listing: 'Listing published', accommodation: 'Accommodation published', accommodation_submission: 'Accommodation submitted for review', wanted: 'Wanted post published', event: 'Event published' }

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth } = useApp()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [overview, setOverview] = useState<PartnerOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    try { setOverview(await getPartnerOverview()); setError('') }
    catch { setError('Could not load your referral records. Please try again.'); setOverview(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/student?next=%2Fpartner'); return }
    let active = true
    // Session restoration finishes before AppContext's partner lookup. Wait for
    // this lookup explicitly so refreshing /partner never redirects a member.
    setPartner(null)
    getPartnerStatus(currentUser.id).then(found => {
      if (!active) return
      if (!found) { navigate('/feed'); return }
      setPartner(found)
      void refresh()
    })
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 60000)
    return () => { active = false; clearInterval(timer) }
  }, [currentUser?.id, isLoadingAuth, navigate, refresh])

  if (isLoadingAuth || !currentUser || !partner) return <div className="min-h-screen bg-slate-deep text-cream-muted p-8">Loading...</div>
  const totals = overview?.totals
  return <div className="min-h-screen bg-slate-deep pb-24">
    <Navbar />
    <main className="max-w-3xl mx-auto px-4 pt-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-cream-muted text-sm mb-4"><ArrowLeft size={16} /> Back</button>
      <div className="flex items-center gap-2.5 mb-2"><Handshake size={24} className="text-gold" /><h1 className="font-serif text-2xl text-cream">Your partner portal</h1></div>
      <p className="text-cream-muted text-sm mb-6">Choose the right form, copy your personal link and share it. Each link carries your referral code.</p>
      <details className="group bg-slate-card border border-slate-border rounded-2xl mb-6">
        <summary className="flex items-center gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          <span className="bg-slate-deep border border-slate-border rounded-xl p-2.5 text-gold"><Link2 size={20} aria-hidden="true" /></span>
          <span className="flex-1 min-w-0"><span className="block text-cream font-bold">Your referral links</span><span className="block text-cream-muted text-xs mt-1">Choose a form and copy your link</span></span>
          <span className="text-gold text-xs font-bold bg-slate-deep rounded-full px-2.5 py-1">{partnerLinks(partner.referral_code).length}</span>
          <ChevronDown size={18} aria-hidden="true" className="text-cream-muted flex-shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-border p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 max-h-[28rem] overflow-y-auto overscroll-contain pr-1">{partnerLinks(partner.referral_code).map(link => <CopyLink key={link.label} {...link} />)}</div>
          <p className="text-cream-muted text-xs mt-4">The first referral is kept for 30 days in the visitor’s browser and attached when they sign in or register. An existing referral cannot be overwritten. Existing paying customers and self-referrals do not qualify.</p>
        </div>
      </details>
      <div className="flex items-center justify-between mb-3"><h2 className="text-cream font-bold">Your progress</h2><button onClick={refresh} disabled={loading} className="flex items-center gap-1.5 text-gold text-sm disabled:opacity-50"><RefreshCw size={14} />{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {error && <p role="alert" className="text-red-300 text-sm mb-4">{error}</p>}
      {overview && <>
        <div className="grid grid-cols-2 gap-3 mb-5">{[
          { title: 'Referred accounts', value: overview.referredCount, Icon: Users },
          { title: 'Listings and submissions', value: overview.activityCount, Icon: FileText },
        ].map(({ title, value, Icon }) => <div key={title} className="bg-slate-card border border-slate-border rounded-2xl p-4"><Icon size={18} className="text-teal-light mb-2" /><p className="font-serif text-cream text-2xl">{value}</p><p className="text-cream-muted text-xs">{title}</p></div>)}</div>
        <section className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-6">
          <h2 className="flex items-center gap-2 text-cream font-bold mb-3"><Wallet size={18} className="text-gold" />Earnings from verified payments</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">{(['pending', 'approved', 'paid'] as const).map(status => <div key={status}><p className="text-gold font-bold">{money(totals?.[status] || 0)}</p><p className="text-cream-muted text-xs capitalize">{status}</p></div>)}</div>
          <p className="text-cream-muted text-xs">{overview.terms ? `Agreed rate: ${(overview.terms.rate * 100).toFixed(1)}% of eligible customer payments, before gateway fees, during your agreement period ending ${new Date(overview.terms.ends_at).toLocaleDateString()}.` : 'No active commission agreement is configured. Agree your rate and payment terms with AtriumX before starting paid referral work.'}</p>
          <p className="text-cream-muted text-xs mt-2">Signups and free listings do not earn cash. Upgrade credit is not counted again. Pending amounts require review; “paid” means a payout has been recorded. Automatic PayFast payouts are not enabled.</p>
        </section>
        <h2 className="text-cream font-bold mb-3">Recent activity</h2>
        {overview.activities.length === 0 ? <p className="text-cream-muted text-sm py-6">No listings or submissions yet. Your links are ready to share.</p> : <div className="space-y-2 mb-6">{overview.activities.map(a => <div key={a.id} className="bg-slate-card border border-slate-border rounded-xl p-3"><p className="text-cream text-sm font-bold">{a.title}</p><p className="text-cream-muted text-xs mt-1">{labels[a.kind] || a.kind} · {new Date(a.created_at).toLocaleString()}</p></div>)}</div>}
        {overview.commissions.length > 0 && <><h2 className="text-cream font-bold mb-3">Recent commissions</h2><div className="space-y-2">{overview.commissions.map(c => <div key={c.id} className="bg-slate-card border border-slate-border rounded-xl p-3 flex justify-between gap-3"><div><p className="text-cream text-sm">{money(c.cash_amount)} customer payment · {(c.rate * 100).toFixed(1)}%</p><p className="text-cream-muted text-xs">{new Date(c.created_at).toLocaleDateString()} · <span className="capitalize">{c.status}</span></p></div><p className="text-gold font-bold text-sm">{money(c.amount)}</p></div>)}</div></>}
      </>}
    </main>
    <BottomNav />
  </div>
}
