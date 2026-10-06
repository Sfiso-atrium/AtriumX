import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../services/supabaseClient'
import { subscribeToPush } from '../../services/push'
type VisitRow = { id: string; started_at: string; last_seen: string; entry_path: string; last_path: string; source: string; campaign: string; device: string; active_seconds: number; form_seconds: number; form_opened: boolean; form_started: boolean; visitor: string; outcome: string; pages: { path: string; at: string }[]; submissions: { kind: string; id: string; at: string }[] }
type Report = { visits: number; forms_opened: number; forms_started: number; submitted_visits: number; inactive_without_submission: number; active: number; average_form_seconds: number; listings: number; rows: VisitRow[] }
const duration = (n: number) => `${Math.floor(n / 60)}m ${n % 60}s`
const date = (s: string) => new Date(s).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
export default function AdminVisitMonitor() {
  const { currentUser } = useApp()
  const [report, setReport] = useState<Report | null>(null)
  const [days, setDays] = useState(30), [offset, setOffset] = useState(0)
  const [error, setError] = useState(''), [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!currentUser?.is_admin) return
    let alive = true
    const load = async () => {
      const { data, error: e } = await supabase.rpc('get_admin_visit_report', { p_days: days, p_offset: offset })
      if (!alive) return
      if (e) setError('Could not load monitoring. Confirm the monitor migration has been installed, then retry.')
      else { setReport(data as Report); setError('') }
    }
    void load().catch(() => { if (alive) setError('Could not connect to monitoring. Retry shortly.') })
    const timer = setInterval(() => { void load().catch(() => {}) }, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [currentUser?.id, currentUser?.is_admin, days, offset, refresh])
  useEffect(() => {
    if (!currentUser?.is_admin) return
    void Promise.resolve(supabase.from('admin_visit_settings').select('enabled').eq('user_id', currentUser.id).maybeSingle()).then(({ data }) => setEnabled(!!data?.enabled)).catch(() => {})
  }, [currentUser?.id, currentUser?.is_admin])
  if (!currentUser?.is_admin) return null
  const alerts = async (enable: boolean) => {
    setBusy(true); setMessage('')
    try {
      if (enable) { const result = await subscribeToPush(currentUser.id); if (result.error) throw new Error(result.error) }
      const { error: e } = await supabase.from('admin_visit_settings').upsert({ user_id: currentUser.id, enabled: enable, updated_at: new Date().toISOString() })
      if (e) throw e
      setEnabled(enable); setMessage(enable ? 'Visit alerts enabled for this admin account. Send a test and check your phone.' : 'Visit alerts paused. Counts will continue to be recorded.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not change alerts.') } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try { const { error: e } = await supabase.rpc('test_admin_visit_push'); if (e) throw e; setMessage('Test queued. Check your phone notification tray; this confirms sending was requested, not delivery.') }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Test failed.') } finally { setBusy(false) }
  }
  return <section className="mb-8 bg-slate-card border border-slate-border rounded-2xl p-4 sm:p-6 space-y-5">
    <div><h2 className="text-xl font-bold text-cream">Visit and listing monitor</h2><p className="text-sm text-cream-muted mt-2">Admin only. Times are South African time. Counts are browser visits, not verified people or email clicks. Refreshes every 30 seconds.</p></div>
    <div className="flex flex-wrap gap-3 items-center">
      <label className="text-sm text-cream">Period <select value={days} onChange={e => { setDays(Number(e.target.value)); setOffset(0) }} className="bg-slate-deep border border-slate-border rounded-lg p-2 ml-2"><option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={3650}>All recorded history</option></select></label>
      <button onClick={() => setRefresh(x => x + 1)} className="text-teal-light underline">Refresh</button>
      <button disabled={busy} onClick={() => void alerts(true)} className="bg-teal-primary text-white rounded-xl px-4 py-2 disabled:opacity-50">{enabled ? 'Enable on this phone' : 'Enable phone alerts'}</button>
      {enabled && <><button disabled={busy} onClick={() => void alerts(false)} className="text-cream-muted underline">Pause visit alerts</button><button disabled={busy} onClick={() => void test()} className="text-teal-light underline">Send test notification</button></>}
    </div>
    <p className="text-xs text-cream-muted">Open this panel on your phone and allow browser notifications. On iPhone/iPad, use the installed home-screen app. Alerts cover new visits, verified submissions and visits inactive for 3 minutes without a recorded submission. A visitor can still return. High traffic is limited to 30 alert records per minute; counts continue.</p>
    {message && <p role="status" className="text-sm text-teal-light">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {!report && !error && <p className="text-cream-muted">Loading monitor…</p>}
    {report && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Object.entries({ 'Visits': report.visits, 'Forms opened': report.forms_opened, 'Forms started': report.forms_started, 'Listings submitted': report.listings, 'Visits with submissions': report.submitted_visits, 'Inactive without submission': report.inactive_without_submission, 'Recently seen': report.active, 'Average active form time': duration(report.average_form_seconds) }).map(([label, value]) => <div key={label} className="bg-slate-deep rounded-xl p-3"><p className="text-xs text-cream-muted">{label}</p><p className="text-lg font-bold text-cream mt-1">{value}</p></div>)}</div>
      <p className="text-xs text-cream-muted">Active time pauses when a page is hidden or there has been no interaction for 60 seconds. Closing a browser, losing signal, blocked tracking and automatic link previews can affect counts. No typed form contents are recorded. Your admin visits are excluded.</p>
      <details className="text-sm text-cream-muted"><summary className="cursor-pointer text-teal-light">Identify your outreach links</summary><p className="mt-2">Use campaign labels, not names or email addresses, for example:</p><code className="block break-all mt-2">https://atriumx.co.za/#/accommodation/post?utm_source=email&amp;utm_campaign=rhodes-october</code><p className="mt-2">Existing plain links also record visits, but cannot identify which email or WhatsApp message they came from.</p></details>
      <div className="space-y-3">{report.rows.map(row => <details key={row.id} className="border border-slate-border rounded-xl p-4"><summary className="cursor-pointer text-cream"><span className="font-semibold">{row.outcome}</span><span className="block text-xs text-cream-muted mt-1">{date(row.started_at)} · {row.visitor} · {row.device}</span><span className="block text-sm text-teal-light mt-1">{row.entry_path} · form time {duration(row.form_seconds)}</span></summary><div className="mt-3 text-sm text-cream-muted space-y-2"><p>Source: {row.source || 'Unlabelled'} · Campaign: {row.campaign || 'Unlabelled'}</p><p>Last seen: {date(row.last_seen)} · Active time: {duration(row.active_seconds)}</p><p>Form: {row.form_started ? 'Interacted with' : row.form_opened ? 'Opened only' : 'Not opened'}</p><p>Pages (up to 50):</p><ul>{row.pages.map((page, i) => <li key={i}>{date(page.at)} — {page.path}</li>)}</ul>{row.submissions.map(s => <p key={`${s.kind}${s.id}`}>Verified {s.kind} submission: {s.id} · {date(s.at)}</p>)}</div></details>)}{!report.rows.length && <p className="text-cream-muted">No visits recorded in this period yet.</p>}</div>
      <div className="flex gap-4 items-center text-sm"><button disabled={!offset} onClick={() => setOffset(x => Math.max(0, x - 50))} className="text-teal-light disabled:opacity-40">Previous</button><span className="text-cream-muted">Page {offset / 50 + 1}</span><button disabled={offset + 50 >= report.visits} onClick={() => setOffset(x => x + 50)} className="text-teal-light disabled:opacity-40">Next</button></div>
    </>}
  </section>
}
