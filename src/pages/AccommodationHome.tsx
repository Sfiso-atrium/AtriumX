import { Building2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

export default function AccommodationHome() {
  const navigate = useNavigate()
  const { currentUser, businessProfile } = useApp()

  if (!currentUser || currentUser.account_type !== 'business' || !businessProfile?.is_accommodation) return null

  return (
    <div className="min-h-screen bg-slate-deep pb-28">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-slate-card border border-slate-border rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-teal-light text-xs font-bold uppercase tracking-[0.16em] mb-2">Accommodation</p>
              <h1 className="font-serif text-3xl text-cream">Your accommodation space</h1>
              <p className="text-cream-muted text-sm mt-2 max-w-xl">Your accommodation listings will live in their own marketplace so students can find properties without competing with ordinary listings.</p>
            </div>
            <Building2 className="text-teal-light shrink-0" size={30} />
          </div>
          <button
            onClick={() => navigate('/accommodation/plan-select')}
            className="mt-7 inline-flex items-center gap-2 bg-teal-primary text-white font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={17} /> Create an accommodation listing
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
