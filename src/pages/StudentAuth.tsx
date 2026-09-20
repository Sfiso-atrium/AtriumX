import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GraduationCap, Briefcase, ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { loginWithEmail, registerWithEmail, joinStudyGroup } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import LegalFooter from '../components/common/LegalFooter'
import { SOUTH_AFRICAN_UNIVERSITIES, UNIVERSITY_ALIASES } from '../data/universities'

export default function StudentAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
const { setCurrentUser, setRedirectAfterLogin } = useApp()
  const redirectAfterLogin = useApp().redirectAfterLogin

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  )
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [residence, setResidence] = useState('')
  const [university, setUniversity] = useState('')
  const [step, setStep] = useState<'type' | 'university' | 'details'>('type')
  const [accountType, setAccountType] = useState<'student' | 'business'>('student')
  const [universitySearch, setUniversitySearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmedStudent, setConfirmedStudent] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (mode === 'register') {
      if (!fullName.trim()) return setError('Full name is required.')
const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      if (!emailValid) return setError('Enter a valid email address.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')
      if (password !== confirmPassword) return setError('Passwords do not match.')
      if (!residence.trim()) return setError('Residence is required.')
      if (!university) return setError('Please select your university.')
      if (!confirmedStudent) return setError('Please confirm that you are a currently enrolled student to continue.')
      if (!acceptedPrivacy) return setError('Please accept the Privacy Policy to create an account.')

      setLoading(true)
      const refCode = searchParams.get('ref') || undefined
      const { user, error: err } = await registerWithEmail(email, password, fullName.trim(), residence.trim(), university, refCode)
      setLoading(false)

      if (err) return setError(err)
      if (user) {
        setCurrentUser(user)
        const joinGroupId = searchParams.get('join')
        if (joinGroupId) {
          await joinStudyGroup(joinGroupId, user.id)
          navigate(`/group/${joinGroupId}`)
          return
        }
        const dest = redirectAfterLogin || '/space'
        setRedirectAfterLogin(null)
        navigate(dest)
      }
    } else {
      if (!email) return setError('Email is required.')
      if (!password) return setError('Password is required.')

    setLoading(true)
      const { user, error: err } = await loginWithEmail(email, password)
      setLoading(false)

      if (err) return setError(err)

if (user) {
        setCurrentUser(user)
        const joinGroupId = searchParams.get('join')
        if (joinGroupId) {
          await joinStudyGroup(joinGroupId, user.id)
          navigate(`/group/${joinGroupId}`)
          return
        }
        const dest = redirectAfterLogin || (user.is_admin ? '/admin' : '/space')
        setRedirectAfterLogin(null)
        navigate(dest)
      }
    }
  }

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  const headingText =
    mode === 'login' ? 'Welcome back'
    : step === 'type' ? 'What type of account are you?'
    : step === 'university' ? 'Select your university'
    : 'Join your campus'
  const subheadingText =
    mode === 'login' ? 'Sign in to continue to My Space and the rest of AtriumX'
    : step === 'type' ? 'Choose the option that best describes you.'
    : step === 'university' ? 'This helps us show you relevant events, listings and opportunities.'
    : 'Create your free account to get started with AtriumX'

  const universityQuery = universitySearch.trim().toLowerCase()
  const filteredUniversities = SOUTH_AFRICAN_UNIVERSITIES.filter(u =>
    !universityQuery ||
    u.toLowerCase().includes(universityQuery) ||
    (UNIVERSITY_ALIASES[u] ?? []).some(a => a.toLowerCase().startsWith(universityQuery))
  )

  const handleTypeContinue = () => {
    setError('')
    if (accountType === 'business') {
      navigate('/retailer')
      return
    }
    setStep('university')
  }

  const handleBack = () => {
    setError('')
    if (step === 'details') setStep('university')
    else if (step === 'university') setStep('type')
    else navigate('/')
  }

  const ACCOUNT_TYPE_OPTIONS = [
    {
      key: 'student' as const,
      label: 'Student',
      Icon: GraduationCap,
      points: ['Access to all student features', 'Buy & sell, find opportunities', 'Join events and focus sessions'],
    },
    {
      key: 'business' as const,
      label: 'Business',
      Icon: Briefcase,
      points: ['Reach students where they live', 'Post listings on the Business tab', 'Free to start, upgrade for more reach'],
    },
  ]

  return (
    <div className={`min-h-screen bg-slate-deep ${mode === 'login' ? 'flex flex-col' : ''}`}>
      <Navbar />
      <div className={`max-w-md mx-auto px-4 pt-8 sm:pt-12 pb-10 ${mode === 'login' ? 'w-full flex-1 flex flex-col' : ''}`}>
        {mode === 'register' && (
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="mb-4 -ml-1 p-1 text-cream-muted hover:text-cream transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="mb-7">
          <p className="text-teal-light text-xs font-bold uppercase tracking-wider mb-2">AtriumX</p>
          <h1 className="font-serif text-3xl text-cream mb-1">
          {headingText}
        </h1>
        <p className="text-cream-muted text-sm">
            {subheadingText}
          </p>
        </div>

        <div className={mode === 'register' ? "bg-slate-card border border-slate-border rounded-2xl p-5 sm:p-6" : ""}>
          {mode === 'register' && step === 'type' && (
            <div className="flex flex-col gap-3">
              {ACCOUNT_TYPE_OPTIONS.map(opt => {
                const selected = accountType === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAccountType(opt.key)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                      selected ? 'border-teal-light bg-teal-faint' : 'border-slate-border bg-slate-card hover:border-teal-light'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-faint flex items-center justify-center flex-shrink-0">
                      <opt.Icon size={20} className="text-teal-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-cream font-bold text-sm mb-1">{opt.label}</p>
                      <ul className="list-disc pl-4 text-cream-muted text-xs leading-relaxed">
                        {opt.points.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                    <span className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selected ? 'border-teal-light' : 'border-slate-border'}`}>
                      {selected && <span className="w-2 h-2 rounded-full bg-teal-light" />}
                    </span>
                  </button>
                )
              })}

              <button
                onClick={handleTypeContinue}
                className="w-full bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                Continue
              </button>

              <button
                onClick={() => { setMode('login'); setError('') }}
                className="text-teal-light text-sm text-center underline mt-1"
              >
                Already have an account? Sign in
              </button>
            </div>
          )}

          {mode === 'register' && step === 'university' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search for your university..."
                value={universitySearch}
                onChange={e => setUniversitySearch(e.target.value)}
                className={inputClass}
              />

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
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

              <button
                onClick={() => { setError(''); setStep('details') }}
                disabled={!university}
                className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                Continue
              </button>

              <button
                onClick={() => { setStep('type'); setError('') }}
                className="text-cream-muted text-sm text-center"
              >
                Back
              </button>
            </div>
          )}

          {(mode === 'login' || step === 'details') && (
          <div className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className={inputClass}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === 'register' && (
            <>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Your residence (e.g. Dalrymple House)"
                value={residence}
                onChange={e => setResidence(e.target.value)}
                className={inputClass}
              />
              <p className="text-cream-muted text-xs px-1">
                Type your residence name exactly as it appears on campus. This helps students nearby find your listings.
              </p>

              <div className="flex flex-col gap-2.5 px-1 mt-1">
                <label className="flex items-start gap-2.5 text-cream-muted text-xs leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedStudent}
                    onChange={e => setConfirmedStudent(e.target.checked)}
                    className="mt-0.5 accent-teal-light"
                  />
                  <span>I confirm that I am a currently enrolled student and will register using my student email address.</span>
                </label>
                <label className="flex items-start gap-2.5 text-cream-muted text-xs leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={e => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 accent-teal-light"
                  />
                  <span>
                    I have read and accept the{' '}
                    <a href="/Privacy.html" target="_blank" rel="noopener noreferrer" className="text-teal-light underline">
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm px-1">
              <p>{error}</p>
              {error.includes('could not sign you in') && (
                <a
                  href="mailto:students@atriumx.co.za?subject=Student%20email%20not%20recognised"
                  className="text-teal-light underline text-xs mt-1 inline-block"
                >
                  Email students@atriumx.co.za for help
                </a>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {mode === 'register' && (
            <button
              onClick={() => { setStep('university'); setError('') }}
              className="text-cream-muted text-sm text-center"
            >
              Back
            </button>
          )}

          {mode === 'register' && (
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="text-teal-light text-sm text-center underline mt-1"
            >
              Already have an account? Sign in
            </button>
          )}
          </div>
          )}
        </div>

        {mode === 'login' && (
          <button
            onClick={() => { setMode('register'); setStep('type'); setError('') }}
            className="mt-auto pt-8 text-teal-light text-sm text-center underline"
          >
            Don't have an account? Register
          </button>
        )}
      </div>

      <LegalFooter />
    </div>
  )
}
