// supabase/functions/payfast-itn/index.ts
//
// PayFast Instant Transaction Notification handler. This is the ONLY
// thing in the system that grants a paid plan. The browser being
// redirected back to /payment/success proves nothing -- anyone can type
// that URL -- so the return page only ever says "we're confirming this",
// and the actual upgrade happens here, from a server-to-server callback.
//
// IMPORTANT DEPLOYMENT NOTE: this function MUST have JWT verification
// turned OFF (Dashboard > Edge Functions > payfast-itn > Settings >
// "Verify JWT with legacy secret" -> off). PayFast is an outside server
// and sends no Supabase token; with verification on, every callback is
// rejected at the door with a 401 before this code runs, and payments
// silently never activate. This is the same failure mode the deadline
// reminder functions hit.
//
// Validation follows PayFast's documented order: signature, then amount
// against what we actually asked for, then a server confirmation POST
// back to PayFast. Only if all three pass does a plan get activated.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE') || ''
const PAYFAST_SANDBOX = Deno.env.get('PAYFAST_SANDBOX') === 'true'

const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/query/validate'
  : 'https://www.payfast.co.za/eng/query/validate'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase())
    .replace(/%20/g, '+')
}

// The ITN signature is built over the posted fields in the order they
// arrived, excluding `signature` itself, with the passphrase appended.
function verifySignature(pairs: [string, string][], received: string): boolean {
  const query = pairs
    .filter(([k]) => k !== 'signature')
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join('&')

  const withPassphrase = PAYFAST_PASSPHRASE
    ? `${query}&passphrase=${pfEncode(PAYFAST_PASSPHRASE)}`
    : query

  const expected = createHash('md5').update(withPassphrase).digest('hex')
  return expected === received
}

// Step 3 of PayFast's checklist: send the payload straight back to them
// and let them confirm they really sent it. This is the check that
// defeats a forged callback from someone who somehow guessed the rest.
async function serverConfirm(rawBody: string): Promise<boolean> {
  try {
    const res = await fetch(PAYFAST_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
    })
    const text = (await res.text()).trim()
    return text === 'VALID'
  } catch (err) {
    console.error('PayFast server confirmation failed:', err)
    return false
  }
}

Deno.serve(async (req) => {
  // Always answer 200, even on rejection. A non-200 makes PayFast retry
  // the same notification for up to 48 hours, which would bury real
  // problems under repeats of ones we've already deliberately refused.
  const ok = () => new Response('OK', { status: 200 })

  try {
    const rawBody = await req.text()
    const pairs: [string, string][] = []
    for (const [k, v] of new URLSearchParams(rawBody).entries()) pairs.push([k, v])
    const data = Object.fromEntries(pairs) as Record<string, string>

    const mPaymentId = data.m_payment_id
    if (!mPaymentId) {
      console.error('ITN missing m_payment_id')
      return ok()
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('m_payment_id', mPaymentId)
      .single()

    if (!payment) {
      console.error('ITN for unknown m_payment_id:', mPaymentId)
      return ok()
    }

    // Idempotency. PayFast can legitimately deliver the same notification
    // more than once; without this, a repeat would extend the person's
    // plan expiry a second time off a single payment.
    if (payment.status === 'complete') return ok()

    if (!verifySignature(pairs, data.signature || '')) {
      console.error('ITN signature mismatch for', mPaymentId)
      await supabase.from('payments')
        .update({ status: 'failed', itn_payload: data })
        .eq('id', payment.id)
      return ok()
    }

    // The amount PayFast says was paid must match what we asked for. This
    // is what catches a tampered payment form.
    const paid = parseFloat(data.amount_gross || '0')
    const expected = parseFloat(String(payment.amount))
    if (Math.abs(paid - expected) > 0.01) {
      console.error(`ITN amount mismatch for ${mPaymentId}: paid ${paid}, expected ${expected}`)
      await supabase.from('payments')
        .update({ status: 'failed', itn_payload: data })
        .eq('id', payment.id)
      return ok()
    }

    if (!(await serverConfirm(rawBody))) {
      console.error('ITN not confirmed by PayFast for', mPaymentId)
      await supabase.from('payments')
        .update({ status: 'failed', itn_payload: data })
        .eq('id', payment.id)
      return ok()
    }

    if (data.payment_status !== 'COMPLETE') {
      await supabase.from('payments')
        .update({
          status: data.payment_status === 'CANCELLED' ? 'cancelled' : 'failed',
          pf_payment_id: data.pf_payment_id || null,
          itn_payload: data,
        })
        .eq('id', payment.id)
      return ok()
    }

    // Everything checks out -- activate the correct kind of plan.
    // Accommodation plans live on business_profiles and deliberately do not
    // touch the ordinary business/student plan column.
    const expiresAt = new Date(Date.now() + payment.plan_days * 24 * 60 * 60 * 1000).toISOString()

    if (String(payment.plan_key).startsWith('accommodation_')) {
      await supabase
        .from('business_profiles')
        .update({ accommodation_plan: payment.plan_key, accommodation_plan_expires_at: expiresAt })
        .eq('id', payment.user_id)
    } else {
      await supabase
        .from('profiles')
        .update({ plan: payment.plan_key, plan_expires_at: expiresAt })
        .eq('id', payment.user_id)

      await supabase
        .from('listings')
        .update({ plan_tier: payment.plan_key })
        .eq('seller_id', payment.user_id)
        .in('status', ['active', 'pending'])
    }

    await supabase
      .from('payments')
      .update({
        status: 'complete',
        pf_payment_id: data.pf_payment_id || null,
        itn_payload: data,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    return ok()
  } catch (err) {
    console.error('payfast-itn failed:', err)
    return ok()
  }
})
