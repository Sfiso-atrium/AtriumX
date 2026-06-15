import { useState, useMemo, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Listing, getListings } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import CategoryChips from '../components/common/CategoryChips'
import ListingCard from '../components/common/ListingCard'
import EmptyState from '../components/common/EmptyState'
import BottomNav from '../components/common/BottomNav'
export default function Feed() {
  const { activeCategory } = useApp()
  const navigate = useNavigate()
  const [localSearch, setLocalSearch] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [dbLoading, setDbLoading] = useState(true)

const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    getListings()
      .then(data => {
        setListings(data)
        setDbLoading(false)
      })
      .catch(() => {
        setDbLoading(false)
        setFetchError(true)
      })
  }, [])

  const filtered = useMemo(() => {
    return listings.filter(listing => {
      const matchCat = activeCategory === 'all' || listing.category === activeCategory
      const q = localSearch.toLowerCase()
      const matchSearch = !q ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [listings, activeCategory, localSearch])

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />

        <div className="max-w-4xl mx-auto">
          <div className="px-4 pt-4 pb-2 relative">
            <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-cream-muted" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search listings..."
              className="w-full bg-slate-card border border-slate-border rounded-xl pl-9 pr-10 py-2.5 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <CategoryChips />

          <div className="px-4 pb-2">
            <p className="text-cream-muted text-xs">
              {dbLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {filtered.length === 0 ? (
         <EmptyState
              message={
                fetchError
                  ? 'Could not load listings. Check your connection and try again.'
                  : dbLoading
                  ? 'Loading listings...'
                  : 'Nothing here yet. Be the first to post.'
              }
              actionLabel={dbLoading || fetchError ? undefined : 'Post a Listing'}
              onAction={() => navigate('/plan-select')}
            />
          ) : (
            <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
    </div>
      <BottomNav />
    </>
  )
}
