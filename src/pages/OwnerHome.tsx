import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, Store, Eye, MessageCircle, Star, PencilLine, ExternalLink, Image, MapPin, ChevronRight, Settings, CreditCard, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import AccommodationReviewLink from '../components/common/AccommodationReviewLink'
import BusinessReviews from '../components/common/BusinessReviews'
import ReviewReply from '../components/common/ReviewReply'
import { AccommodationListing, AccommodationReview, Conversation, Listing, Profile, getUserListings, getAccommodationListingsBySeller, getAccommodationReviews, getConversationsForUser, getEffectiveBusinessPlan, PLAN_TIERS, ACCOMMODATION_PLANS } from '../services/dataService'

type OwnerConversation = Conversation & { buyer?: Profile; seller?: Profile }
const card = 'bg-slate-card border border-slate-border/50 rounded-2xl p-4 sm:p-5'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-border/50 px-4 py-2.5 text-sm font-semibold text-cream hover:border-teal-light'

export default function OwnerHome() {
  const { currentUser, businessProfile, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  if (isLoadingAuth || (currentUser?.account_type === 'business' && isLoadingBusinessProfile)) return <div className="min-h-screen bg-slate-deep text-cream-muted p-8">Loading your home…</div>
  if (!currentUser) return <Navigate to="/student?next=/home" replace />
  if (currentUser.account_type !== 'business') return <Navigate to={currentUser.is_admin ? '/admin' : '/space'} replace />
  if (!businessProfile) return <div className="min-h-screen bg-slate-deep"><Navbar /><p role="alert" className="text-cream p-8">Your business details could not be loaded. Please refresh to try again.</p></div>
  return <OwnerDashboard key={currentUser.id} />
}

function OwnerDashboard() {
  const { currentUser, businessProfile } = useApp()
  const navigate = useNavigate()
  const accommodation = !!businessProfile?.is_accommodation
  const [listings, setListings] = useState<Listing[]>([])
  const [properties, setProperties] = useState<AccommodationListing[]>([])
  const [messages, setMessages] = useState<OwnerConversation[]>([])
  const [reviews, setReviews] = useState<AccommodationReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!currentUser) return
    let active = true
    setLoading(true); setError(false)
    async function load() {
      try {
        const [items, conversations] = await Promise.all([
          accommodation ? getAccommodationListingsBySeller(currentUser!.id, true) : getUserListings(currentUser!.id, true),
          getConversationsForUser(currentUser!.id, true),
        ])
        const propertyReviews = accommodation ? (await Promise.all((items as AccommodationListing[]).map(item => getAccommodationReviews(item.id)))).flat() : []
        if (!active) return
        if (accommodation) setProperties(items as AccommodationListing[])
        else setListings(items as Listing[])
        setMessages(conversations as OwnerConversation[])
        setReviews([...new Map(propertyReviews.map(r => [r.id, r])).values()].sort((a,b) => b.created_at.localeCompare(a.created_at)))
      } catch { if (active) setError(true) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [currentUser?.id, accommodation, revision])
  if (!currentUser || !businessProfile) return null
  const items = accommodation ? properties : listings
  const primary = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${accommodation ? 'bg-[#946b16] text-white' : 'bg-[#006a70] text-white'} hover:opacity-90`
  const planPath = accommodation ? '/accommodation/plan-select' : '/business/plan-select'
  const createPath = accommodation ? '/accommodation/post' : '/business/post'
  const planLabel = accommodation ? ACCOMMODATION_PLANS[businessProfile.accommodation_plan].label : PLAN_TIERS[getEffectiveBusinessPlan(currentUser)].label
  const expiry = accommodation ? businessProfile.accommodation_plan_expires_at : currentUser.plan_expires_at
  const canReply = accommodation && ['accommodation_featured', 'accommodation_premium'].includes(businessProfile.accommodation_plan)
  function edit(item: Listing | AccommodationListing, section?: string) {
    if (accommodation) navigate(`/accommodation/${item.id}/edit`, { state: { section } })
    else navigate('/business/post', { state: { editListing: item, section } })
  }
  const stats = [
    { label: accommodation ? 'Properties' : 'Listings', value: items.length, icon: accommodation ? Building2 : Store, note: `${items.filter(i => i.status === 'active').length} active` },
    ...(accommodation ? [{ label: 'Student reviews', value: reviews.length, icon: Star, note: 'All time' }] : [{ label: 'Listing views', value: listings.reduce((n, l) => n + (l.view_count || 0), 0), icon: Eye, note: 'All time' }]),
    { label: 'Enquiry conversations', value: messages.filter(m => m.seller_id === currentUser.id).length, icon: MessageCircle, note: 'In your inbox' },
    { label: 'Unread messages', value: messages.reduce((n,m) => n + (m.unread_count || 0), 0), icon: MessageCircle, note: 'In your inbox' },
  ]
  return <div className="min-h-screen bg-slate-deep pb-36">
    <Navbar />
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 space-y-5">
      <header><h1 className="text-cream font-bold text-2xl sm:text-3xl">Welcome back, {currentUser.full_name.split(' ')[0]}</h1><p className="text-cream-muted text-sm mt-2">{accommodation ? 'Manage your property and student enquiries.' : 'Manage your business in one place.'}</p></header>
      {loading ? <p role="status" className="text-cream-muted py-12">Loading your listings and messages…</p> : error ? <div role="alert" className={card}><p className="text-cream">Could not load your dashboard.</p><button onClick={() => setRevision(n => n + 1)} className={`${secondary} mt-3`}>Try again</button></div> : <>
        <div role="region" aria-label="Dashboard summary" tabIndex={0} className="flex gap-3 overflow-x-auto snap-x snap-proximity pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-light">{stats.map(s => <div key={s.label} className={`${card} shrink-0 w-[min(72vw,210px)] md:w-auto md:flex-1 snap-start`}><s.icon size={21} className="text-cream mb-3" /><p className="text-cream-muted text-xs">{s.label}</p><p className="text-cream text-2xl font-bold mt-1">{s.value}</p><p className="text-cream-muted text-xs mt-1">{s.note}</p></div>)}</div>
        <section className={card}>
          <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-cream text-lg font-bold">{accommodation ? 'My accommodation' : 'My business'}</h2>{!accommodation && items.length > 0 && <button onClick={() => navigate(createPath)} className="text-cream text-sm inline-flex gap-1 items-center"><Plus size={16} />Add listing</button>}</div>
          {!items.length ? <div className="py-7 text-center"><Store size={32} className="mx-auto text-cream-muted mb-3" /><h3 className="text-cream font-semibold">No listing yet</h3><p className="text-cream-muted text-sm my-3">Add your {accommodation ? 'property' : 'business'} details so students can find you.</p><button onClick={() => navigate(createPath)} className={primary}>Create your listing</button></div> : items.map(item => <article key={item.id} className="flex flex-col sm:flex-row gap-5 border-t first:border-t-0 border-slate-border/50 pt-4 first:pt-0 mt-4 first:mt-0">
            <button type="button" onClick={() => edit(item, 'photos')} aria-label={`Edit photos for ${item.title}`} className="relative w-full sm:w-64 h-52 sm:h-auto sm:min-h-52 shrink-0 self-stretch overflow-hidden rounded-xl bg-slate-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-light">
              {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt={item.title} className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 flex flex-col gap-2 items-center justify-center text-cream-muted"><Image size={36} /><span className="text-sm">Add photos</span></span>}
            </button>
            <div className="flex-1 min-w-0"><h3 className="text-cream font-bold text-xl">{item.title}</h3><p className="text-cream-muted text-sm mt-1">{accommodation ? 'Student accommodation' : (item as Listing).category}</p>
              <span className="inline-block rounded-full bg-slate-deep border border-slate-border/50 px-3 py-1 text-xs text-cream mt-3">{item.status === 'active' ? 'Published' : item.status === 'pending' ? 'Awaiting review' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
              {item.status === 'pending' && <p className="text-cream-muted text-xs mt-2">Your listing is being reviewed before publication.</p>}
              {item.status === 'suspended' && <p className="text-cream-muted text-xs mt-2">This listing is not public. Check your notifications for the reason and required changes.</p>}
              <p className="text-cream-muted text-xs mt-3 flex items-start gap-1"><MapPin size={14} className="shrink-0" />{item.universities?.join(', ') || 'No university selected'}</p>
              <div className="flex flex-wrap gap-2 mt-4"><button onClick={() => edit(item)} className={primary}><PencilLine size={16} />{accommodation ? 'Edit property' : 'Edit listing'}</button><button onClick={() => navigate(accommodation ? `/accommodation/${item.id}` : `/listing/${item.id}`)} className={secondary}><ExternalLink size={16} />{item.status === 'active' ? 'View public listing' : 'Preview listing'}</button></div>
            </div>
          </article>)}
        </section>
        {items.length === 1 && <section className="py-3"><h2 className="text-cream font-bold mb-3">Quick actions</h2><div className="grid sm:grid-cols-3 gap-3">{(accommodation ? ['Room prices', 'Photos & amenities', 'University details'] : ['Update photos', 'Edit products & services', 'Contact details']).map((label, i) => <button key={label} onClick={() => !accommodation && i === 2 ? navigate('/profile/edit') : edit(items[0], accommodation ? ['pricing', 'photos', 'universities'][i] : ['photos', 'details'][i])} className={`${secondary} justify-between text-left`}>{label}<ChevronRight size={16} /></button>)}</div></section>}
        <section className="py-4"><div className="flex items-center justify-between mb-3"><h2 className="text-cream font-bold text-lg">Recent messages</h2><button onClick={() => navigate('/chat')} className="text-cream text-sm underline">View all</button></div>
          {!messages.length ? <p className="text-cream-muted text-sm py-3">No conversations yet. Student enquiries will appear here.</p> : messages.slice(0, 3).map(m => {
            const other = currentUser.id === m.buyer_id ? m.seller : m.buyer
            return <button key={m.id} onClick={() => navigate(`/chat/${m.id}`)} className="w-full flex items-center gap-3 text-left py-3 border-t border-slate-border/50">
              <span className="w-10 h-10 shrink-0 rounded-full bg-slate-deep border border-slate-border/50 text-cream text-sm flex items-center justify-center">{other?.avatar_initials || '?'}</span><span className="min-w-0 flex-1"><span className="block text-cream text-sm font-semibold">{other?.full_name || 'Student'}</span><span className="block text-cream-muted text-sm truncate">{m.last_message?.content || 'Open conversation'}</span></span>{!!m.unread_count && <span className="text-cream text-xs font-bold">{m.unread_count} unread</span>}
            </button>
          })}
        </section>
        {accommodation ? <section className="py-4"><h2 className="text-cream font-bold text-lg">Student reviews</h2>{properties.map(property => <AccommodationReviewLink key={property.id} listingId={property.id} title={property.title} showTitle={properties.length > 1} />)}{!reviews.length ? <p className="text-cream-muted text-sm mt-3">No student reviews yet.</p> : reviews.map(r => <article key={r.id} className="border-t border-slate-border/50 mt-4 pt-4"><div className="flex justify-between gap-3"><h3 className="font-semibold text-cream text-sm">{r.reviewer_name || r.student?.full_name || 'Student'}</h3><span className="text-cream-muted text-xs">{new Date(r.created_at).toLocaleDateString('en-ZA')}</span></div><p className="text-cream text-sm mt-2">{r.stars} / 5</p><p className="text-cream-muted text-sm mt-2 whitespace-pre-wrap">{r.comment || 'No written comment.'}</p>{r.reply && <div className="border-l-2 border-gold pl-3 mt-3"><p className="text-cream text-xs font-semibold">Accommodation reply</p><p className="text-cream-muted text-sm whitespace-pre-wrap mt-1">{r.reply}</p></div>}<ReviewReply reviewId={r.id} accommodation allowed={canReply} existingReply={r.reply} onSaved={() => setRevision(n => n + 1)} /></article>)}</section> : <BusinessReviews businessId={currentUser.id} unboxed shareable />}
      </>}
      <section className="border-t border-slate-border/50 py-5"><h2 className="text-cream text-lg font-bold">Your account</h2><p className="text-cream-muted text-sm mt-1">{planLabel}{expiry && new Date(expiry).getTime() > Date.now() ? ` · Ends ${new Date(expiry).toLocaleDateString('en-ZA')}` : ''}</p><div className="grid sm:grid-cols-3 gap-3 mt-4"><button onClick={() => navigate('/profile/edit')} className={secondary}><Settings size={17} />Profile & settings</button><button onClick={() => navigate(planPath, { state: { forcePlans: true, managePlan: true } })} className={secondary}><CreditCard size={17} />Manage plan</button><button onClick={() => navigate(`/profile/${currentUser.id}`)} className={secondary}><ExternalLink size={17} />View profile</button></div></section>
    </main>
    <BottomNav />
  </div>
}
