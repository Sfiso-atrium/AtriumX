import { useEffect, useState } from 'react'
import { partnerPayfastAdminData, payfastAdminAction, splitStatusLabel, type PayfastAccount, type PayfastSplit, type SplitSettings } from '../../services/partnerPayfast'

type Data = Awaited<ReturnType<typeof partnerPayfastAdminData>>
const inputClass = 'block w-full bg-slate-deep text-cream border border-slate-border rounded-lg p-2 mt-1 text-sm'
const buttonClass = 'bg-teal-primary text-white text-xs font-bold rounded-xl px-3 py-2 disabled:opacity-50'
const errorText = (e: unknown) => e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Could not save. Please try again.'
const localDate = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''

function Settings({ settings, changed }: { settings?: SplitSettings; changed: () => Promise<void> }) {
  const [environment, setEnvironment] = useState(settings?.environment || 'live')
  const [merchant, setMerchant] = useState(settings?.primary_merchant_id || '')
  const [enabled, setEnabled] = useState(settings?.enabled || false)
  const [reference, setReference] = useState(settings?.verification_reference || '')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await payfastAdminAction('configure_payfast_splits', { p_environment: environment, p_merchant_id: merchant, p_enabled: enabled, p_reference: reference }); await changed(); setMessage('Platform configuration saved.') }
    catch (e) { setMessage(errorText(e)) } finally { setBusy(false) }
  }
  return <details className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-4"><summary className="text-cream font-bold cursor-pointer">Platform PayFast activation · {settings?.environment || 'new'}{settings?.enabled ? ' · enabled' : ' · disabled'}</summary>
    <form onSubmit={save} className="space-y-3 mt-3 text-xs text-cream-muted">
      <p>Enable Split Payments in AtriumX’s PayFast dashboard. Confirm the partner account is eligible and allowed, and that no global split sends unrelated sales to a partner. Run a split checkout and verify both balances before activating live routing.</p>
      <a href="https://support.payfast.help/portal/en/kb/articles/how-do-i-enable-split-payments-20-9-2022" target="_blank" rel="noopener noreferrer" className="inline-block text-gold underline">PayFast setup instructions</a>
      <label className="block">Environment<select disabled={!!settings} value={environment} onChange={e => setEnvironment(e.target.value as 'live' | 'sandbox')} className={inputClass}><option value="live">Live</option><option value="sandbox">Sandbox</option></select></label>
      <label className="block">AtriumX primary Merchant ID<input required inputMode="numeric" pattern="[1-9][0-9]{7}" maxLength={8} value={merchant} onChange={e => setMerchant(e.target.value)} className={inputClass} /></label>
      <label className="block">Setup / test evidence reference<input required maxLength={500} value={reference} onChange={e => setReference(e.target.value)} className={inputClass} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); setChecked(false) }} />Enable routing for reviewed partners with active agreements</label>
      {enabled && <label className="flex gap-2"><input required type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />I verified PayFast setup and the split test for this environment. This does not enable the feature inside PayFast itself.</label>}
      <button disabled={busy || (enabled && !checked)} className={buttonClass}>{busy ? 'Saving…' : 'Save platform configuration'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>
}

function AccountReview({ account, term, changed }: { account: PayfastAccount; term?: Data['terms'][number]; changed: () => Promise<void> }) {
  const [rate, setRate] = useState(term ? String(Number(term.rate) * 100) : '')
  const [starts, setStarts] = useState(localDate(term?.starts_at))
  const [ends, setEnds] = useState(localDate(term?.ends_at))
  const [agreement, setAgreement] = useState(term?.agreement_reference || '')
  const [reference, setReference] = useState('')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const save = async (status: 'ready' | 'paused') => {
    setBusy(true); setMessage('')
    try {
      await payfastAdminAction('configure_partner_payfast', { p_partner: account.partner_id, p_revision: account.revision, p_status: status, p_reference: reference,
        p_rate: rate ? Number(rate) / 100 : null, p_starts: starts ? new Date(starts).toISOString() : null, p_ends: ends ? new Date(ends).toISOString() : null, p_agreement: agreement })
      await changed(); setMessage('Review saved.')
    } catch (e) { setMessage(errorText(e)) } finally { setBusy(false) }
  }
  return <details className="mt-3 border-t border-slate-border pt-3"><summary className="text-gold text-xs font-bold cursor-pointer">Review PayFast account and commission agreement</summary>
    <p className="text-cream-muted text-xs mt-3">{account.account_name} · Merchant {account.merchant_id} · {account.environment} · {account.status}</p>
    <form onSubmit={e => { e.preventDefault(); void save('ready') }} className="space-y-3 mt-3 text-xs text-cream-muted">
      <label className="block">Agreed commission (%) of cash paid, before gateway fees<input type="number" required min="0.01" max="99.99" step="0.01" value={rate} onChange={e => setRate(e.target.value)} className={inputClass} /></label>
      <div className="grid sm:grid-cols-2 gap-3"><label>Agreement starts (your local time)<input required type="datetime-local" value={starts} onChange={e => setStarts(e.target.value)} className={inputClass} /></label><label>Agreement ends (your local time)<input required type="datetime-local" min={starts} value={ends} onChange={e => setEnds(e.target.value)} className={inputClass} /></label></div>
      <p>One fixed agreement period for this partner. Only cash payments quoted within these dates qualify. Rates are never applied retrospectively to an existing checkout.</p>
      <label className="block">Agreement reference<input required maxLength={500} value={agreement} onChange={e => setAgreement(e.target.value)} className={inputClass} /></label>
      <label className="block">Account verification evidence / pause reason<input required maxLength={500} value={reference} onChange={e => setReference(e.target.value)} className={inputClass} /></label>
      <label className="flex gap-2"><input required type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />I verified this Merchant ID belongs to this partner, its PayFast verification and split eligibility, and the partner accepted these terms.</label>
      <div className="flex flex-wrap gap-2"><button disabled={busy || !checked} className={buttonClass}>Approve account and save agreement</button><button type="button" disabled={busy || !reference.trim()} onClick={() => void save('paused')} className="border border-slate-border text-cream text-xs rounded-xl px-3 py-2 disabled:opacity-50">Pause routing</button></div>
      {message && <p role="status">{message}</p>}
    </form>
  </details>
}

function Reconcile({ split, changed }: { split: PayfastSplit; changed: () => Promise<void> }) {
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const save = async (reverse: boolean) => {
    setBusy(true); setMessage('')
    try { await payfastAdminAction('reconcile_partner_split', { p_payment: split.payment_id, p_reference: reference, p_reverse: reverse }); await changed() }
    catch (e) { setMessage(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="border-t border-slate-border pt-3 mt-3 text-xs text-cream-muted"><p>R{(split.amount_cents / 100).toFixed(2)} · {split.environment} · {splitStatusLabel[split.status]}</p><p>PayFast reference: {split.pf_payment_id || 'Awaiting payment'}</p>
    {['customer_paid', 'confirmed', 'review_required'].includes(split.status) && <><label className="block mt-2">PayFast receipt / reversal evidence reference<input value={reference} maxLength={500} onChange={e => setReference(e.target.value)} className={inputClass} /></label><div className="flex flex-wrap gap-2 mt-2">{split.status !== 'confirmed' && <button disabled={busy || !reference.trim()} onClick={() => void save(false)} className={buttonClass}>Record verified PayFast receipt</button>}<button disabled={busy || !reference.trim()} onClick={() => void save(true)} className="border border-slate-border text-cream rounded-xl px-3 py-2 disabled:opacity-50">Record verified reversal</button></div><p className="mt-2">Records evidence only. These buttons do not transfer or refund money.</p></>}
    {message && <p role="status">{message}</p>}
  </div>
}

export default function PartnerPayfastAdmin({ partners }: { partners: { user_id: string; referral_code: string; profile: { full_name: string } | null }[] }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const refresh = async () => { const result = await partnerPayfastAdminData(); setData(result); setError('') }
  useEffect(() => { void refresh().catch(e => setError(errorText(e))) }, [])
  return <section className="mb-6"><div className="flex justify-between items-center mb-3"><h2 className="text-cream font-bold">Partner payments</h2><button onClick={() => void refresh().catch(e => setError(errorText(e)))} className="text-gold text-xs">Refresh</button></div>
    {error && <p role="alert" className="text-red-300 text-sm mb-3">{error}</p>}
    {data && <>{data.settings.map(s => <Settings key={s.environment} settings={s} changed={refresh} />)}{data.settings.length < 2 && <Settings key={`new-${data.settings.length}`} changed={refresh} />}
      {partners.map(p => { const account = data.accounts.find(a => a.partner_id === p.user_id); return <div key={p.user_id} className="bg-slate-card border border-slate-border rounded-2xl p-4 mb-3"><p className="text-cream font-bold text-sm">{p.profile?.full_name || p.referral_code}</p><p className="text-cream-muted text-xs mt-1">Referral code: {p.referral_code}</p>{account ? <AccountReview key={`${p.user_id}-${account.revision}`} account={account} term={data.terms.find(t => t.partner_id === p.user_id)} changed={refresh} /> : <p className="text-cream-muted text-xs mt-3">Partner has not submitted a PayFast account yet.</p>}{data.splits.filter(s => s.partner_id === p.user_id).map(s => <Reconcile key={`${s.payment_id}-${s.status}`} split={s} changed={refresh} />)}</div> })}
      {!partners.length && <p className="text-cream-muted text-sm">No partners yet.</p>}
    </>}
  </section>
}
