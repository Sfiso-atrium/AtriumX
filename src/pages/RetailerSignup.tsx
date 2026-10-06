import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { registerBusinessWithEmail, registerBusinessShellWithEmail, loginWithEmail, getBusinessProfile } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import AddressAutocomplete from '../components/common/AddressAutocomplete'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'
import { getSubmissionAccountContext } from '../services/accommodationIntake'
import type { AccommodationAccountContext } from '../services/accommodationIntake'

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
    : requestedPackage === 'accommodation_featured'
    ? 'Featured'
    : requestedPackage === 'accommodation_premium'
    ? 'Premium'
    : null

  const isAccommodation = searchParams.get('accommodation') === '1'
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'register'
  const accountLabel = isAccommodation ? 'Accommodation' : 'Business'
  const accountLower = isAccommodation ? 'accommodation' : 'business'
  const isSubmissionAccount = isAccommodation && searchParams.get('submission') === '1'
  const isQuickSetup = searchParams.get('quick') === '1' && !isSubmissionAccount

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState(isAccommodation ? 'Other' : '')
  const [customType, setCustomType] = useState(isAccommodation ? 'Student accommodation' : '')
  const [contactNumber, setContactNumber] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [university, setUniversity] = useState('')
  const [universitySearch, setUniversitySearch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmedBusiness, setConfirmedBusiness] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [submissionContext, setSubmissionContext] = useState<AccommodationAccountContext | null>(null)
  const [loadingSubmission, setLoadingSubmission] = useState(isSubmissionAccount)
  const universityQuery = universitySearch.trim().toLowerCase()
  const filteredUniversities = useMemo(() => SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery ||
    u.toLowerCase().includes(universityQuery) ||
    (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  ), [universityQuery])

  useEffect(() => {
    if (!isSubmissionAccount) return
    let active = true
    getSubmissionAccountContext().then(({ context, error: contextError }) => {
      if (!active) return
      if (contextError || !context) {
        setError(contextError || 'Could not load your accommodation submission.')
      } else {
        setSubmissionContext(context)
        setEmail(context.email)
      }
      setLoadingSubmission(false)
    })
    return () => { active = false }
  }, [isSubmissionAccount])

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
          navigate(profile?.is_accommodation && searchParams.get('submission') === '1' ? '/accommodation/claim' : '/home')
        } else {
          navigate('/feed')
        }
      }
      return
    }

    if (isSubmissionAccount) {
      if (!submissionContext) return setError('Could not verify the accommodation details from your submission.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')

      setLoading(true)
      const refCode = searchParams.get('ref') || undefined
      const { user, error: err } = await registerBusinessWithEmail(
        submissionContext.email,
        password,
        submissionContext.title,
        'Other',
        'Student accommodation',
        submissionContext.phone,
        submissionContext.address,
        submissionContext.website || undefined,
        submissionContext.university,
        true,
        refCode
      )
      setLoading(false)
      if (err) return setError(err)
      if (user) {
        setCurrentUser(user)
        navigate('/accommodation/claim', { replace: true })
      }
      return
    }

    if (isQuickSetup) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      if (!emailValid) return setError('Enter a valid email address.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')

      setLoading(true)
      const { user, error: err } = await registerBusinessShellWithEmail(email.trim(), password)
      setLoading(false)
      if (err) return setError(err)
      if (user) {
        setCurrentUser(user)
        const validAccommodationPlan = requestedPackage === 'accommodation_featured' || requestedPackage === 'accommodation_premium'
        const validBusinessPlan = requestedPackage === 'featured' || requestedPackage === 'campus_partner' || requestedPackage === 'noticeboard'
        const plan = isAccommodation
          ? (validAccommodationPlan ? requestedPackage : 'accommodation_free')
          : (validBusinessPlan ? requestedPackage : 'noticeboard')
        navigate(`${isAccommodation ? '/accommodation/post' : '/business/post'}?setup=1&plan=${plan}`, { replace: true })
      }
      return
    }

    if (!businessName.trim()) return setError(`${accountLabel} name is required.`)
    if (!university) return setError('Please select your university.')
    if (!isAccommodation && !businessType) return setError('Select a business type.')
    if (!isAccommodation && businessType === 'Other' && !customType.trim()) return setError('Please specify your business type.')
    if (!contactNumber.trim()) return setError('Contact number is required.')
    if (!physicalAddress.trim() && !website.trim()) {
      return setError(`Add a physical address or a website — at least one so students can find this ${accountLower} outside the app.`)
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailValid) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    if (!confirmedBusiness) return setError(`Please confirm you are authorised to register this ${accountLower} on AtriumX.`)
    if (!acceptedPrivacy) return setError('Please accept the Privacy Policy to create an account.')

    const effectiveBusinessType = isAccommodation ? 'Other' : businessType
    const effectiveCustomType = isAccommodation ? 'Student accommodation' : businessType === 'Other' ? customType.trim() : undefined

    setLoading(true)
    const refCode = searchParams.get('ref') || undefined
    const { user, error: err } = await registerBusinessWithEmail(
      email, password, businessName.trim(), effectiveBusinessType,
      effectiveCustomType,
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
      navigate(isAccommodation && searchParams.get('submission') === '1' ? '/accommodation/claim' : '/home')
    }
  }

  if (mode === 'register' && isSubmissionAccount) {
    return (
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
          <h1 className="font-serif text-3xl text-cream mb-1">Create your password</h1>
          <p className="text-cream-muted text-sm mb-6">We already have the accommodation details you submitted. You do not need to type them again.</p>

          {loadingSubmission ? (
            <p className="text-cream-muted text-sm">Loading your submitted details...</p>
          ) : submissionContext ? (
            <>
              <div className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-5 space-y-2 text-sm">
                <p className="text-cream font-bold">{submissionContext.title}</p>
                <p className="text-cream-muted">{submissionContext.email}</p>
                <p className="text-cream-muted">{submissionContext.university}</p>
                <p className="text-cream-muted">{submissionContext.address}</p>
                {submissionContext.website && <p className="text-cream-muted break-all">{submissionContext.website}</p>}
              </div>
              <input type="password" placeholder="Create password" value={password}
                onChange={e => setPassword(e.target.value)} className={inputClass} />
              <p className="text-cream-muted text-xs mt-2 px-1">Use at least 8 characters. This password will let you manage the listing after approval.</p>
              <p className="text-cream-muted text-xs mt-4 px-1">By creating the account you agree to the <a href="/Privacy.html" target="_blank" rel="noopener noreferrer" className="text-sapphire-light underline">Privacy Policy</a>.</p>
              {error && <p className="text-red-400 text-sm mt-4 px-1">{error}</p>}
              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-5">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <button onClick={() => navigate('/retailer/signup?accommodation=1&mode=login&submission=1')} className="w-full text-sapphire-light text-sm text-center underline mt-4">Already have an account? Sign in</button>
            </>
          ) : (
            <>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={() => navigate('/accommodation/post')} className="text-sapphire-light text-sm underline mt-4">Return to accommodation form</button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'register' && isQuickSetup) {
    return (
      <div className="min-h-screen bg-slate-deep">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
          <h1 className="font-serif text-3xl text-cream mb-1">Create your {accountLower} account</h1>
          <p className="text-cream-muted text-sm mb-6">{requestedPackageLabel ? `${requestedPackageLabel} selected. ` : ''}Create the login first, then we will take you straight to the listing form.</p>
          <div className="flex flex-col gap-4">
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
            <p className="text-cream-muted text-xs px-1">Use at least 8 characters. Your business/property details are collected on the next screen.</p>
            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors">
              {loading ? 'Creating account...' : 'Continue to listing form'}
            </button>
            <button onClick={() => navigate(`/retailer/signup?mode=login${isAccommodation ? '&accommodation=1' : ''}`)} className="text-sapphire-light text-sm text-center underline">Already registered? Sign in</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">
          {mode === 'login' ? 'Welcome back' : `Register Your ${accountLabel}`}
        </h1>
        <p className="text-cream-muted text-sm mb-8">
          {mode === 'login'
            ? `Sign in to your ${accountLower} account`
            : isAccommodation
            ? 'Create your accommodation account and start listing your space for students near your chosen university.'
            : 'Create your free business account and reach your chosen university right away. Upgrade later to reach more universities.'}
        </p>

        {mode === 'register' && requestedPackageLabel && !isAccommodation && (
          <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-cream text-sm leading-snug">
              Every business starts free on Noticeboard. You can upgrade to {requestedPackageLabel} from the app when you post your first listing.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <input type="text" placeholder={isAccommodation ? 'Accommodation name' : 'Business name'} value={businessName}
                onChange={e => setBusinessName(e.target.value)} className={inputClass} />

              {!isAccommodation && (
                <>
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
                </>
              )}

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
                <AddressAutocomplete
                  value={physicalAddress}
                  onChange={setPhysicalAddress}
                  placeholder={isAccommodation ? 'Property address' : 'Physical address (e.g. Shop 4, Campus Square)'}
                  className={inputClass}
                />
                <p className="text-cream-muted text-xs mt-1 px-1">
                  Add a physical address or a website below — at least one, so students can find you outside the app.
                </p>
              </div>

              <input type="url" placeholder={isAccommodation ? 'Website (optional)' : 'Website (e.g. https://yourbusiness.co.za)'} value={website}
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
                  <span>I confirm that I am authorised to register this {accountLower} on AtriumX.</span>
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
            {mode === 'login' ? `Don't have a ${accountLower} account? Register` : 'Already registered? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
