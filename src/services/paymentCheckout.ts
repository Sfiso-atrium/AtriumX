import { supabase } from './supabaseClient'

type Quote = { paymentId: string; planLabel: string; listPrice: number; credit: number; minimumTopup: number; amountDue: number; days: number; bonusDays: number; expiresAt: string; intent: string }
const money = (n: number) => `R${n.toFixed(2)}`

// The server fixes this quote for 15 minutes. DOM textContent is intentional:
// neither server errors nor plan labels are interpreted as HTML.
function confirmQuote(quote: Quote): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog')
    dialog.className = 'w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-slate-card text-cream border border-slate-border p-6 backdrop:bg-black/60'
    dialog.setAttribute('aria-label', 'Review your payment')
    const heading = document.createElement('h2')
    heading.className = 'text-xl font-bold mb-4'; heading.textContent = `Review ${quote.planLabel}`
    dialog.appendChild(heading)
    const line = (label: string, value: string, bold = false) => {
      const row = document.createElement('p'); row.className = `flex justify-between gap-4 py-2 text-sm ${bold ? 'font-bold border-t border-slate-border mt-2' : ''}`
      const key = document.createElement('span'); key.textContent = label
      const amount = document.createElement('span'); amount.textContent = value
      row.append(key, amount); dialog.appendChild(row)
    }
    line(`${quote.days}-day plan`, money(quote.listPrice))
    line('Unused paid-time credit', `−${money(quote.credit)}`)
    if (quote.minimumTopup > 0) line('R5 minimum adjustment (adds plan time)', money(quote.minimumTopup))
    line('Pay today', money(quote.amountDue), true)
    const note = document.createElement('p'); note.className = 'text-sm text-cream-muted my-4'
    note.textContent = `${quote.intent === 'renewal' ? 'This renewal extends your existing period.' : 'Your new period begins once payment is confirmed.'} ${quote.bonusDays > 0 ? `Value beyond the plan price adds approximately ${quote.bonusDays.toFixed(2)} extra days. ` : ''}No automatic renewal. This quote is valid until ${new Date(quote.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}; if it expires, return here for a fresh quote.`
    dialog.appendChild(note)
    const actions = document.createElement('div'); actions.className = 'flex flex-wrap gap-3'
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'border border-slate-border rounded-xl px-4 py-2.5 text-sm'; cancel.textContent = 'Not now'
    const pay = document.createElement('button'); pay.type = 'button'; pay.className = 'bg-teal-primary text-white font-bold rounded-xl px-4 py-2.5 text-sm'; pay.textContent = quote.amountDue === 0 ? 'Apply my credit' : `Continue to PayFast · ${money(quote.amountDue)}`
    let settled = false
    const finish = (accepted: boolean) => { if (settled) return; settled = true; dialog.close(); dialog.remove(); resolve(accepted) }
    cancel.onclick = () => finish(false); pay.onclick = () => finish(true)
    dialog.oncancel = e => { e.preventDefault(); finish(false) }
    actions.append(cancel, pay); dialog.appendChild(actions); document.body.appendChild(dialog); dialog.showModal(); cancel.focus()
  })
}

async function invoke(body: Record<string, unknown>) {
  const result = await supabase.functions.invoke('payfast-create-payment', { body })
  if (result.error) {
    try { const payload = await result.error.context?.json(); if (payload?.error) return { error: String(payload.error), data: null } } catch { /* Network failure has no JSON body. */ }
    return { error: 'Could not reach the payment service. Please try again.', data: null }
  }
  return { error: result.data?.error ? String(result.data.error) : null, data: result.data }
}

export async function checkoutPlan(planKey: string, intent: string, listingId: string | null = null): Promise<{ error: string | null }> {
  const request = { planKey, intent, listingId }
  const prepared = await invoke({ ...request, mode: 'quote' })
  if (prepared.error) return { error: prepared.error }
  const quote = prepared.data?.quote as Quote | undefined
  if (!quote || !quote.paymentId || ![quote.listPrice, quote.credit, quote.amountDue].every(n => Number.isFinite(n) && n >= 0)) return { error: 'Could not load your payment quote.' }
  if (!await confirmQuote(quote)) {
    await invoke({ ...request, mode: 'cancel', paymentId: quote.paymentId })
    return { error: 'Checkout closed.' }
  }
  const checkout = await invoke({ ...request, mode: 'checkout', paymentId: quote.paymentId })
  if (checkout.error) return { error: checkout.error }
  sessionStorage.setItem('atriumx_payment_id', quote.paymentId)
  sessionStorage.setItem('atriumx_payment_intent', quote.intent)
  if (checkout.data?.completed) { window.location.hash = '/payment/success'; return { error: null } }
  if (!checkout.data?.url || !checkout.data?.fields) return { error: 'Could not start payment. Please try again.' }
  const form = document.createElement('form'); form.method = 'POST'; form.action = checkout.data.url; form.style.display = 'none'
  for (const [name, value] of Object.entries(checkout.data.fields as Record<string, string>)) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
  }
  document.body.appendChild(form); form.submit()
  return { error: null }
}
