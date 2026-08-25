import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { loginWithEmail, registerWithEmail, joinStudyGroup } from '../services/dataService'
import Navbar from '../components/common/Navbar'
import LegalFooter from '../components/common/LegalFooter'

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
      if (!confirmedStudent) return setError('Please confirm that you are a currently enrolled student to continue.')
      if (!acceptedPrivacy) return setError('Please accept the Privacy Policy to create an account.')

      setLoading(true)
      const refCode = searchParams.get('ref') || undefined
      const { user, error: err } = await registerWithEmail(email, password, fullName.trim(), residence.trim(), refCode)
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
        const dest = redirectAfterLogin || '/feed'
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
        const dest = redirectAfterLogin || (user.is_admin ? '/admin' : '/feed')
        setRedirectAfterLogin(null)
        navigate(dest)
      }
    }
  }

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"
  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-sm mx-auto px-4 pt-12">
        <h1 className="font-serif text-3xl text-cream mb-1">
          {mode === 'login' ? 'Welcome back' : 'Join your campus'}
        </h1>
        <p className="text-cream-muted text-sm mb-8">
          {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
        </p>

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

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-teal-light text-sm text-center underline mt-1"
          >
            {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
