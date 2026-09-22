// src/pages/PostWanted.tsx
//
// Creation flow for a "wanted" post — a student directly saying what
// they're looking for, instead of it being inferred from their private
// watchlist. Deliberately lean: no photos, no plan tier, no payment —
// this is meant to be a quick ask, not a listing.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { createWantedPost, getResidences } from '../services/dataService'
import { PostTypeSwitcher } from '../components/common/PostTypeChooser'
import Navbar from '../components/common/Navbar'
import BottomNav from '../components/common/BottomNav'

const WANTED_CATEGORIES = [
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'food', label: 'Food' },
  { id: 'services', label: 'Services' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Other' },
]

const URGENCY_OPTIONS = [
  { id: 'no_rush', label: 'No rush' },
  { id: 'this_week', label: 'This week' },
  { id: 'urgent', label: 'Urgent' },
] as const

const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

export default function PostWanted() {
  const navigate = useNavigate()
  const { currentUser, isLoadingAuth } = useApp()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceFlexible, setPriceFlexible] = useState(false)
  const [residence, setResidence] = useState(currentUser?.residence || '')
  const [residenceOptions, setResidenceOptions] = useState<string[]>([])
  const [urgency, setUrgency] = useState<'no_rush' | 'this_week' | 'urgent'>('no_rush')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getResidences().then(setResidenceOptions)
  }, [])

  if (isLoadingAuth) return null
  if (!currentUser) { navigate('/student'); return null }

  if (submitted) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <h2 className="text-cream font-bold text-2xl mb-2">Posted</h2>
      <p className="text-cream-muted text-sm max-w-sm mb-6">
        Other students at your university can now see what you're looking for, and can message you about it directly.
      </p>
      <button
        onClick={() => navigate('/feed')}
        className="bg-ember hover:bg-ember-dark text-white font-bold py-3 px-8 rounded-xl transition-colors"
      >
        Back to Feed
      </button>
    </div>
  )

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) return setError('Title is required.')
    if (!category) return setError('Category is required.')
    if (maxPrice && Number(maxPrice) < 0) return setError('Enter a valid price.')

    setLoading(true)
    const { error: createError } = await createWantedPost({
      seekerId: currentUser.id,
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      priceFlexible,
      residence: residence.trim() || undefined,
      urgency,
    })
    setLoading(false)
    if (createError) return setError(createError)
    setSubmitted(true)
  }

  return (
    <>
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-6 pb-36">
          <PostTypeSwitcher current="wanted" />

          <div className="mb-6">
            <h1 className="font-serif text-2xl text-cream">Post What You're Looking For</h1>
            <span className="text-xs text-teal-light font-medium">Free to post · visible to your university</span>
          </div>

          <div className="flex flex-col gap-5">

            {/* TITLE */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                What are you looking for? <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Calc 2 textbook"
                maxLength={80}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputClass}
              />
              <p className="text-cream-muted text-xs text-right mt-1">{title.length}/80</p>
            </div>

            {/* CATEGORY */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>Select a category</option>
                {WANTED_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Details — optional
              </label>
              <textarea
                placeholder="Condition you'd accept, specific edition or model, anything that helps someone know if what they have is a match."
                maxLength={300}
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputClass + ' resize-none'}
              />
              <p className="text-cream-muted text-xs text-right mt-1">{description.length}/300</p>
            </div>

            {/* BUDGET */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Budget — optional
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted text-sm font-bold">R</span>
                <input
                  type="number"
                  placeholder="Max you'd pay"
                  min="0"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className={inputClass + ' pl-8'}
                />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceFlexible}
                  onChange={e => setPriceFlexible(e.target.checked)}
                  className="accent-teal-primary"
                />
                <span className="text-cream-muted text-xs">I'm flexible on price</span>
              </label>
            </div>

            {/* RESIDENCE */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                Residence — optional
              </label>
              <input
                type="text"
                placeholder="e.g. Dalrymple House"
                value={residence}
                onChange={e => setResidence(e.target.value)}
                list="residence-options"
                className={inputClass}
              />
              <datalist id="residence-options">
                {residenceOptions.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            {/* URGENCY */}
            <div>
              <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">
                How soon do you need it?
              </label>
              <div className="flex gap-2">
                {URGENCY_OPTIONS.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      urgency === u.id
                        ? 'bg-teal-primary border-teal-light text-cream'
                        : 'bg-slate-card border-slate-border text-cream-muted'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !title.trim() || !category}
              className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
