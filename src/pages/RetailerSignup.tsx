import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { registerBusinessWithEmail, loginWithEmail } from '../services/dataService'
import Navbar from '../components/common/Navbar'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
        navigate('/feed')
      }
      return
    }

    if (!businessName.trim()) return setError('Business name is required.')
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

    setLoading(true)
    const refCode = searchParams.get('ref') || undefined
    const { user, error: err } = await registerBusinessWithEmail(
      email, password, businessName.trim(), businessType,
      businessType === 'Other' ? customType.trim() : undefined,
      contactNumber.trim(),
      physicalAddress.trim() || undefined,
      website.trim() || undefined,
      refCode
    )
    setLoading(false)

    if (err) return setError(err)
    if (user) {
      setCurrentUser(user)
      navigate('/feed')
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
            : 'Create a free account — you can list on the Noticeboard plan right away, and upgrade later.'}
        </p>

        {mode === 'register' && requestedPackageLabel && (
          <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-cream text-sm leading-snug">
              Every business starts free on Noticeboard. Once your account is approved, you can upgrade
              to {requestedPackageLabel} from the app when you post your first listing.
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
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
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
