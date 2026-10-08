import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Navbar from '../components/common/Navbar'
import { getBusinessListings, getPublicBusinessProfile, type PublicBusinessProfile } from '../services/dataService'
import { businessReviewPath } from '../utils/businessReviewDraft'

export default function BusinessReviewDirectory() {
  const { currentUser } = useApp()
  const [businesses, setBusinesses] = useState<PublicBusinessProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    async function load() {
      try {
        const listings = await getBusinessListings(currentUser, currentUser?.university)
        const ids = [...new Set(listings.map(l => l.seller_id))]
        const profiles = await Promise.all(ids.map(getPublicBusinessProfile))
        if (profiles.some(p => !p)) throw new Error('Business details unavailable')
        if (active) setBusinesses(profiles.filter((p): p is PublicBusinessProfile => !!p))
      } catch { if (active) setError(true) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [currentUser?.id, currentUser?.university, revision])
  const matches = useMemo(() => businesses.filter(b => `${b.business_name} ${b.custom_business_type || b.business_type}`.toLowerCase().includes(search.trim().toLowerCase())), [businesses, search])
  return <div className="min-h-screen bg-slate-deep text-cream"><Navbar /><main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
    <Link to="/feed" className="text-teal-light underline text-sm">Back to the feed</Link>
    <h1 className="text-3xl font-serif">Review nearby businesses</h1>
    <p className="text-cream-muted">Choose a business serving {currentUser?.university || 'your university'} and share your experience.</p>
    <label className="block text-sm">Find a business<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by business name or type" className="mt-2 w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream" /></label>
    {loading ? <p role="status" className="text-cream-muted">Loading businesses…</p> : error ? <p role="alert" className="text-cream-muted">Could not load businesses. <button onClick={() => setRevision(n => n + 1)} className="underline">Try again</button></p> : !matches.length ? <p className="text-cream-muted">{businesses.length ? 'No matches. Try another name or business type.' : 'No businesses are listed for your university yet. You can still use a review link shared directly by a business.'}</p> : matches.map(b => <article key={b.id} className="border border-slate-border rounded-xl p-4 space-y-2">
      <h2 className="text-lg font-bold">{b.business_name}</h2><p className="text-sm text-cream-muted">{b.custom_business_type || b.business_type}</p>
      {b.physical_address && <p className="text-sm text-cream-muted">{b.physical_address}</p>}
      <Link to={businessReviewPath(b.id)} className="inline-block bg-teal-primary text-white font-semibold px-4 py-2 rounded-lg">Review this business</Link>
    </article>)}
  </main></div>
}
