import { Building2, Plus, ArrowRight, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { AccommodationListing, getAccommodationListings, ACCOMMODATION_PLANS, AccommodationPlanKey } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'
import AccommodationCard from '../components/common/AccommodationCard'

export default function AccommodationHome() {
  const navigate = useNavigate()
  const { currentUser, businessProfile, isLoadingAuth } = useApp()
  const [listings, setListings] = useState<AccommodationListing[]>([])

  useEffect(() => {
    if (currentUser?.id && businessProfile?.is_accommodation) getAccommodationListings(null).then(data => setListings(data.filter(item => item.seller_id === currentUser.id)))
  }, [currentUser?.id, businessProfile?.is_accommodation, businessProfile?.accommodation_plan])

  if (isLoadingAuth) return <div className="min-h-screen bg-slate-deep flex items-center justify-center text-cream-muted">Loading...</div>
  if (!currentUser || currentUser.account_type !== 'business' || !businessProfile?.is_accommodation) return null
  const plan = businessProfile.accommodation_plan as AccommodationPlanKey
  const maxProperties = 1
  const atLimit = listings.length >= maxProperties

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-7">
        <div className="bg-slate-card border border-slate-border rounded-3xl p-6 sm:p-8 mb-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div><p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation</p><h1 className="font-serif text-3xl text-cream">Your properties</h1><p className="text-cream-muted text-sm mt-2 max-w-2xl">Manage your student accommodation separately from the main Marketplace.</p></div>
            {listings.length === 0 ? <button onClick={() => navigate('/accommodation/plan-select')} className="inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-5 py-3 rounded-xl"><Plus size={17} /> Add accommodation</button> : <button onClick={() => navigate(`/accommodation/${listings[0].id}`)} className="inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-5 py-3 rounded-xl">View accommodation</button>}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-7">
            <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Current plan</p><p className="text-cream font-bold mt-1">{ACCOMMODATION_PLANS[plan].label}</p></div>
            <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Accommodation listings</p><p className="text-cream font-bold mt-1">{Math.min(listings.length, 1)} / {maxProperties}</p></div>
            <div className="bg-slate-deep rounded-2xl p-4"><p className="text-cream-muted text-xs">Universities</p><p className="text-cream font-bold mt-1">{businessProfile.universities.length} / {plan === 'accommodation_free' ? 1 : plan === 'accommodation_featured' ? 2 : 3}</p></div>
          </div>
          {atLimit && <p className="text-cream-muted text-xs mt-4">Your accommodation account uses one listing for the whole provider. Add all buildings and room pricing to that listing.</p>}
        </div>

        {listings.length === 0 ? <div className="border border-dashed border-slate-border rounded-3xl py-20 text-center"><Building2 size={36} className="mx-auto text-cream-muted mb-4" /><p className="text-cream font-semibold">You have no accommodation listings yet.</p><p className="text-cream-muted text-sm mt-2">Start with your property details, monthly rent and what you offer.</p><button onClick={() => navigate('/accommodation/plan-select')} className="mt-5 inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-4 py-2.5 rounded-xl text-sm">Create listing <ArrowRight size={14} /></button></div> : <section><h2 className="text-2xl font-extrabold text-cream mb-4">Your accommodation listing</h2><div className="flex gap-4 overflow-x-auto pb-2">{listings.map(item => <AccommodationCard key={item.id} listing={item} />)}</div></section>}
      </main>
      <BottomNav />
    </div>
  )
}
