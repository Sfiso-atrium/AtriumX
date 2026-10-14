import { useEffect, useState } from 'react'
import { ExternalLink, Wallet } from 'lucide-react'
import { getPartnerPayfast, savePartnerPayfast, splitStatusLabel, type PayfastState } from '../../services/partnerPayfast'

export default function PartnerPayfast() {
  const [state, setState] = useState<PayfastState | null>(null)
  const [merchant, setMerchant] = useState('')
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState('live')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const refresh = async () => {
    const data = await getPartnerPayfast(); setState(data)
    setMerchant(data.account?.merchant_id || ''); setName(data.account?.account_name || ''); setEnvironment(data.account?.environment || 'live')
  }
  useEffect(() => { void refresh().catch(() => setError('Could not load PayFast setup. Please reload this page.')) }, [])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await savePartnerPayfast(merchant.trim(), name.trim(), environment); await refresh(); setMessage('Account details saved. AtriumX will review the account before routing commissions.') }
    catch { setError('Could not save these details. Check the Merchant ID; an account can only belong to one partner.') }
    finally { setBusy(false) }
  }
  const account = state?.account
  const ready = account?.status === 'ready' && state?.platformEnabled
  return <section className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-6">
    <h2 className="flex items-center gap-2 text-cream font-bold"><Wallet size={18} className="text-gold" />Receive with PayFast</h2>
    <p className="text-cream-muted text-sm mt-2">Eligible commissions go to your own PayFast account. Add your bank details and request withdrawals securely inside PayFast.</p>
    <p className="text-gold text-xs font-bold mt-3">{!state ? 'Loading setup…' : ready ? `${account?.environment === 'sandbox' ? 'Sandbox only · ' : ''}Account reviewed · requires an active commission agreement` : account?.status === 'paused' ? 'Commission routing paused — contact AtriumX' : account?.status === 'ready' ? 'Account reviewed · awaiting platform activation' : account ? 'Awaiting account review' : 'Account not connected'}</p>
    {error && <p role="alert" className="text-red-300 text-sm mt-3">{error}</p>}
    {message && <p role="status" className="text-teal-light text-sm mt-3">{message}</p>}
    <details className="mt-4 border border-slate-border rounded-xl p-3" open={!account && !!state}>
      <summary className="cursor-pointer text-cream text-sm font-bold">{account ? 'Manage PayFast account' : 'Connect your PayFast account'}</summary>
      <p className="text-cream-muted text-xs mt-3">Create or sign in to PayFast, complete their account verification, then copy your 8-digit Merchant ID from account settings. AtriumX reviews ownership and split-payment eligibility. Changing these details requires a new review.</p>
      <form onSubmit={save} className="space-y-3 mt-3">
        <label className="block text-xs text-cream-muted">Name on PayFast account<input required maxLength={160} minLength={2} value={name} onChange={e => setName(e.target.value)} className="block w-full bg-slate-deep text-cream border border-slate-border rounded-lg p-2 mt-1" /></label>
        <label className="block text-xs text-cream-muted">PayFast Merchant ID<input required inputMode="numeric" pattern="[1-9][0-9]{7}" maxLength={8} value={merchant} onChange={e => setMerchant(e.target.value)} className="block w-full bg-slate-deep text-cream border border-slate-border rounded-lg p-2 mt-1" /></label>
        <label className="block text-xs text-cream-muted">Account environment<select value={environment} onChange={e => setEnvironment(e.target.value)} className="block w-full bg-slate-deep text-cream border border-slate-border rounded-lg p-2 mt-1"><option value="live">Live — real commissions</option><option value="sandbox">Sandbox — testing only</option></select></label>
        <p className="text-cream-muted text-xs">Only your Merchant ID and account name are needed here. Do not enter your password, Merchant Key or passphrase.</p>
        <button disabled={busy || !state} className="bg-teal-primary text-white text-sm font-bold rounded-xl px-4 py-2.5 disabled:opacity-50">{busy ? 'Saving…' : 'Save for review'}</button>
      </form>
    </details>
    <a href={account?.environment === 'sandbox' ? 'https://sandbox.payfast.co.za' : 'https://my.payfast.io'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gold text-black text-sm font-bold rounded-xl px-4 py-2.5 mt-4"><ExternalLink size={15} />{account ? 'Withdraw through PayFast' : 'Open PayFast / create account'}</a>
    <p className="text-cream-muted text-xs mt-2">Opens PayFast. Available balance, bank withdrawals, fees and scheduled payouts are managed there. AtriumX does not display your bank balance.</p>
    {!!state?.splits.length && <details className="mt-4"><summary className="text-cream text-sm font-bold cursor-pointer">PayFast commission history</summary><div className="space-y-2 mt-3">{state.splits.map(s => <div key={s.payment_id} className="border-t border-slate-border pt-2 text-xs"><p className="text-cream">R{(s.amount_cents / 100).toFixed(2)} · {splitStatusLabel[s.status] || s.status}</p><p className="text-cream-muted">{s.environment === 'sandbox' ? 'Test payment · ' : ''}{new Date(s.created_at).toLocaleDateString()}{s.pf_payment_id ? ` · PayFast ${s.pf_payment_id}` : ''}</p></div>)}</div></details>}
  </section>
}
