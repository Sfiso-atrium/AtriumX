import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { registerBusinessWithEmail, loginWithEmail, getBusinessProfile } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'

export const BUSINESS_TYPES = [
  'Restaurant', 'Clothing', 'Electronics',
  'Tutoring', 'Printing', 'Salon', 'Other'
]

export default function RetailerSignup() {
  const navigate = useNavigate()
  const { setCurrentUser } = useApp()
  const [searchParams] = useSearchParams()
  const requestedPackage = searchParams.get('package')
  const requestedPackageLabel = requestedPackage === 'featured'
    ? 'Featured'
    : requestedPackage === 'campus_partner'
    ? 'Campus Partner'
    : null

  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [customType, setCustomType] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [university, setUniversity] = useState('')
  const [isAccommodation, setIsAccommodation] = useState<boolean | null>(() => searchParams.get('accommodation') === '1' ? true : null)
  const [universitySearch, setUniversitySearch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmedBusiness, setConfirmedBusiness] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const universityQuery = universitySearch.trim().toLowerCase()
  const filteredUniversities = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery ||
    u.toLowerCase().includes(universityQuery) ||
    (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-sapphire-light transition-colors"

  const handleSubmit = async () => {
    setError('')

    if (mode === 'login') {
      if (!email) return setError('Email is required.')
      if (!password) return setError('Password is required.')

      setLoading(true)
      const { user, error: err } = await loginWithEmail(email, password)
      setLoading(false)

      if (err) return setError(err)
      if (user) {
        setCurrentUser(user)
        if (user.account_type === 'business') {
          const profile = await getBusinessProfile(user.id)
          navigate(profile?.is_accommodation ? '/accommodation' : '/feed')
        } else {
          navigate('/feed')
        }
      }
      return
    }

    if (!businessName.trim()) return setError('Business name is required.')
    if (isAccommodation === null) return setError('Please tell us whether this business is an accommodation provider.')
    if (!university) return setError('Please select your university.')
    if (!businessType) return setError('Select a business type.')
    if (businessType === 'Other' && !customType.trim()) return setError('Please specify your business type.')
if (!contactNumber.trim()) return setError('Contact number is required.')
    if (!physicalAddress.trim() && !website.trim()) {
      return setError('Add a physical address or a website — at least one so students can find you outside the app.')
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailValid) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    if (!confirmedBusiness) return setError('Please confirm you are authorised to register this business on AtriumX.')
    if (!acceptedPrivacy) return setError('Please accept the Privacy Policy to create an account.')

    setLoading(true)
    const refCode = searchParams.get('ref') || undefined
    const { user, error: err } = await registerBusinessWithEmail(
      email, password, businessName.trim(), businessType,
      businessType === 'Other' ? customType.trim() : undefined,
      contactNumber.trim(),
      physicalAddress.trim() || undefined,
      website.trim() || undefined,
      university,
      isAccommodation,
      refCode
    )
    setLoading(false)

    if (err) return setError(err)
    if (user) {
      setCurrentUser(user)
      navigate(isAccommodation ? '/accommodation' : '/feed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">
          {mode === 'login' ? 'Welcome back' : 'Register Your Business'}
        </h1>
<p className="text-cream-muted text-sm mb-8">
          {mode === 'login'
            ? 'Sign in to your business account'
            : 'Create your free business account and reach your chosen university right away. Upgrade later to reach more universities.'}
        </p>

        {mode === 'register' && requestedPackageLabel && (
          <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-cream text-sm leading-snug">
              Every business starts free on Noticeboard. You can upgrade to {requestedPackageLabel} from the app when you post your first listing.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <input type="text" placeholder="Business Name" value={businessName}
                onChange={e => setBusinessName(e.target.value)} className={inputClass} />

              <select value={businessType}
                onChange={e => setBusinessType(e.target.value)} className={inputClass}>
                <option value="" disabled>Select business type</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {businessType === 'Other' && (
                <input type="text" placeholder="Specify your business type"
                  value={customType} onChange={e => setCustomType(e.target.value)}
                  className={inputClass} />
              )}

              <div>
                <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">Accommodation provider</label>
                <p className="text-cream-muted text-xs mb-2">Tell us whether this business offers student accommodation. You can only change this during account creation.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: true, label: 'Yes, accommodation' }, { value: false, label: 'No, other business' }].map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setIsAccommodation(option.value)}
                      className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                        isAccommodation === option.value ? 'border-teal-light bg-teal-faint text-cream' : 'border-slate-border bg-slate-card text-cream-muted hover:border-teal-light'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-cream-muted text-xs font-bold uppercase tracking-wide mb-2 block">University</label>
                <input
                  type="text"
                  placeholder="Search for your university..."
                  value={universitySearch}
                  onChange={e => setUniversitySearch(e.target.value)}
                  className={inputClass}
                />
                <div className="mt-2 flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {filteredUniversities.map(u => {
                    const selected = university === u
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUniversity(u)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-colors ${
                          selected ? 'border-teal-light bg-teal-faint text-cream' : 'border-slate-border bg-slate-card text-cream hover:border-teal-light'
                        }`}
                      >
                        <span className="flex-1 min-w-0">{u}</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selected ? 'border-teal-light' : 'border-slate-border'}`}>
                          {selected && <span className="w-2 h-2 rounded-full bg-teal-light" />}
                        </span>
                      </button>
                    )
                  })}
                  {filteredUniversities.length === 0 && (
                    <p className="text-cream-muted text-sm text-center py-4">No universities match your search.</p>
                  )}
                </div>
              </div>

              <input type="tel" placeholder="Contact Number" value={contactNumber}
                onChange={e => setContactNumber(e.target.value)} className={inputClass} />

              <div>
                <input type="text" placeholder="Physical Address (e.g. Shop 4, Campus Square)" value={physicalAddress}
                  onChange={e => setPhysicalAddress(e.target.value)} className={inputClass} />
                <p className="text-cream-muted text-xs mt-1 px-1">
                  Add a physical address or a website below — at least one, so students can find you outside the app.
                </p>
              </div>

              <input type="url" placeholder="Website (e.g. https://yourbusiness.co.za)" value={website}
                onChange={e => setWebsite(e.target.value)} className={inputClass} />
            </>
          )}
          <input type="email" placeholder="Email Address" value={email}
            onChange={e => setEmail(e.target.value)} className={inputClass} />

          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} className={inputClass} />

          {mode === 'register' && (
            <>
              <input type="password" placeholder="Confirm password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />

              <div className="flex flex-col gap-2.5 px-1">
                <label className="flex items-start gap-2.5 text-cream-muted text-xs leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedBusiness}
                    onChange={e => setConfirmedBusiness(e.target.checked)}
                    className="mt-0.5 accent-sapphire-light"
                  />
                  <span>I confirm that I am authorised to register this business on AtriumX.</span>
                </label>
                <label className="flex items-start gap-2.5 text-cream-muted text-xs leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={e => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 accent-sapphire-light"
                  />
                  <span>
                    I have read and accept the{' '}
                    <a href="/Privacy.html" target="_blank" rel="noopener noreferrer" className="text-sapphire-light underline">
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm px-1">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-2">
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-sapphire-light text-sm text-center underline mt-1"
          >
            {mode === 'login' ? "Don't have a business account? Register" : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
