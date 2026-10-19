import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import { manageTravelAlert } from '../services/travelEngagement'

export default function TravelAlertManage() {
  const [params] = useSearchParams()
  const action = params.has('unsubscribe') ? 'unsubscribe' : 'confirm'
  const token = params.get(action) || ''
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('')
  async function submit() {
    setBusy(true); setError('')
    try { await manageTravelAlert(action, token); setDone(true) }
    catch { setError('This link could not be used. Please check the link in your email and try again.') }
    finally { setBusy(false) }
  }
  return <div className="min-h-screen bg-slate-deep"><Navbar /><main className="max-w-lg mx-auto px-4 py-12"><h1 className="font-serif text-2xl text-cream">{action === 'unsubscribe' ? 'Stop route updates' : 'Confirm route updates'}</h1>
    <p className="text-sm text-cream-muted mt-3">{done ? action === 'unsubscribe' ? 'You have been unsubscribed from these route updates.' : 'Your route updates are confirmed. You can unsubscribe at any time.' : !valid ? 'This link is incomplete. Open the full link from your email.' : action === 'unsubscribe' ? 'Use the button below to stop these route update emails. No sign-in needed.' : 'Use the button below to confirm you requested these route update emails. No account is created.'}</p>
    {valid && !done && <button disabled={busy} onClick={() => void submit()} className="mt-5 rounded-xl bg-teal-primary text-white text-sm font-bold px-5 py-3 disabled:opacity-60">{busy ? 'Please wait…' : action === 'unsubscribe' ? 'Unsubscribe' : 'Confirm my route updates'}</button>}
    {error && <p role="alert" className="text-sm text-cream mt-4">{error}</p>}<Link to="/travel" className="block mt-6 text-teal-light text-sm underline">Back to buses</Link>
  </main></div>
}
