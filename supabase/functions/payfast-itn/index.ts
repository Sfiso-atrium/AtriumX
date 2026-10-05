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
    // Renewing the SAME still-active plan preserves any remaining paid time:
    // the new period starts after the existing expiry. An upgrade/different
    // plan starts a fresh paid period from the confirmation time.
    const now = Date.now()
    let expiresAt: string

    if (String(payment.plan_key).startsWith('accommodation_')) {
      const { data: currentAccommodation } = await supabase
        .from('business_profiles')
        .select('accommodation_plan, accommodation_plan_expires_at')
        .eq('id', payment.user_id)
        .single()

      const currentExpiry = currentAccommodation?.accommodation_plan_expires_at
        ? new Date(currentAccommodation.accommodation_plan_expires_at).getTime()
        : 0
      const sameActivePlan = currentAccommodation?.accommodation_plan === payment.plan_key && currentExpiry > now
      const base = sameActivePlan ? currentExpiry : now
      expiresAt = new Date(base + payment.plan_days * 24 * 60 * 60 * 1000).toISOString()

      const { error: planError } = await supabase
        .from('business_profiles')
        .update({ accommodation_plan: payment.plan_key, accommodation_plan_expires_at: expiresAt })
        .eq('id', payment.user_id)

      if (planError) {
        console.error('Accommodation plan activation failed:', planError)
        return ok()
      }
    } else {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', payment.user_id)
        .single()

      const currentExpiry = currentProfile?.plan_expires_at
        ? new Date(currentProfile.plan_expires_at).getTime()
        : 0
      const sameActivePlan = currentProfile?.plan === payment.plan_key && currentExpiry > now
      const base = sameActivePlan ? currentExpiry : now
      expiresAt = new Date(base + payment.plan_days * 24 * 60 * 60 * 1000).toISOString()

      const { error: planError } = await supabase
        .from('profiles')
        .update({ plan: payment.plan_key, plan_expires_at: expiresAt })
        .eq('id', payment.user_id)

      if (planError) {
        console.error('Plan activation failed:', planError)
        return ok()
      }

      // A paid plan is account-wide. Keep every currently active/pending
      // listing aligned with the newly verified plan period.
      const { error: listingError } = await supabase
        .from('listings')
        .update({ plan_tier: payment.plan_key, expires_at: expiresAt })
        .eq('seller_id', payment.user_id)
        .in('status', ['active', 'pending'])

      if (listingError) {
        console.error('Listing plan alignment failed:', listingError)
        return ok()
      }

      // If this checkout came from an explicit renewal of an expired listing,
      // the verified payment may reactivate that one row. Sold/suspended rows
      // are rejected earlier by payfast-create-payment.
      if (payment.listing_id) {
        const { data: renewalListing } = await supabase
          .from('listings')
          .select('status')
          .eq('id', payment.listing_id)
          .eq('seller_id', payment.user_id)
          .maybeSingle()

        if (renewalListing?.status === 'expired') {
          const { error: reactivateError } = await supabase
            .from('listings')
            .update({ status: 'active', plan_tier: payment.plan_key, expires_at: expiresAt })
            .eq('id', payment.listing_id)
            .eq('seller_id', payment.user_id)

          if (reactivateError) {
            console.error('Paid listing reactivation failed:', reactivateError)
            return ok()
          }
        }
      }
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
