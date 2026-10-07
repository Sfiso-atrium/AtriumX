// supabase/functions/payfast-create-payment/index.ts
//
// Starts a PayFast payment for a plan upgrade. Called by the browser with
// the person's normal session; returns the field set + signature the
// browser then POSTs to PayFast.
//
// Why this is a server function and not just client-side form building:
// the signature is an MD5 of the payment fields plus the merchant key and
// passphrase. Those two are secrets. If the signing happened in the
// browser they'd be in the JS bundle, and anyone could sign a payment for
// R1 and get an Unmissable plan. So the browser never learns the amount,
// the key, or the passphrase -- it sends a plan name, and this function
// decides what that costs.
//
// Keep JWT verification ON for this function (Dashboard > Edge Functions >
// payfast-create-payment > Settings). It's called by a signed-in user, so
// the default is correct here. payfast-itn is the opposite case.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PAYFAST_MERCHANT_ID = Deno.env.get('PAYFAST_MERCHANT_ID')!
const PAYFAST_MERCHANT_KEY = Deno.env.get('PAYFAST_MERCHANT_KEY')!
const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE') || ''
// 'true' while testing against sandbox.payfast.co.za, anything else = live.
const PAYFAST_SANDBOX = Deno.env.get('PAYFAST_SANDBOX') === 'true'
// e.g. https://atriumx.co.za -- where PayFast sends the person back to.
const SITE_URL = Deno.env.get('SITE_URL') || 'https://atriumx.co.za'

const PAYFAST_PROCESS_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Server-side source of truth for what a plan costs. This intentionally
// duplicates PLAN_TIERS in src/services/dataService.ts rather than
// importing it -- the client copy is for display only and can be edited
// by anyone with devtools. If you change a price, change it in BOTH
// places, and treat this one as the real one.
type PlanAudience = 'student' | 'business' | 'accommodation'

const PLAN_PRICES: Record<string, { amount: number; days: number; label: string; audience: PlanAudience }> = {
  visible:        { amount: 29,  days: 7,  label: 'Visible', audience: 'student' },
  loud:           { amount: 79,  days: 14, label: 'Loud', audience: 'student' },
  unmissable:     { amount: 149, days: 30, label: 'Unmissable', audience: 'student' },
  featured:       { amount: 199, days: 30, label: 'Featured', audience: 'business' },
  campus_partner: { amount: 349, days: 30, label: 'Campus Partner', audience: 'business' },
  accommodation_featured: { amount: 199, days: 30, label: 'Accommodation Featured', audience: 'accommodation' },
  accommodation_premium: { amount: 399, days: 30, label: 'Accommodation Premium', audience: 'accommodation' },
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PayFast signs against PHP's urlencode(): spaces become '+', hex digits
// are uppercase, and a few characters JS leaves alone do get encoded.
// Getting this wrong produces a signature mismatch that PayFast reports
// only as a generic failure, so it's worth being exact.
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase())
    .replace(/%20/g, '+')
}

// Signature is built over the fields in the exact order they're submitted
// -- not alphabetical -- skipping empty ones, with the passphrase last.
function signPayload(fields: Record<string, string>): string {
  const query = Object.entries(fields)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${pfEncode(String(v))}`)
    .join('&')

  const withPassphrase = PAYFAST_PASSPHRASE
    ? `${query}&passphrase=${pfEncode(PAYFAST_PASSPHRASE)}`
    : query

  return createHash('md5').update(withPassphrase).digest('hex')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 500, headers: CORS })
    }

    // Identify the payer from their own session token. We never take a
    // user id from the request body -- that would let anyone buy a plan
    // for (or as) someone else.
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData?.user) {
      return Response.json({ error: 'Not signed in.' }, { status: 401, headers: CORS })
    }
    const user = authData.user

    const { planKey, intent = 'purchase', listingId = null, mode = 'checkout', paymentId = null } = await req.json()
    const plan = PLAN_PRICES[planKey]
    if (!plan) {
      return Response.json({ error: 'Unknown or free plan.' }, { status: 400, headers: CORS })
    }

    if (!['purchase', 'upgrade', 'renewal'].includes(intent)) {
      return Response.json({ error: 'Unknown payment intent.' }, { status: 400, headers: CORS })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, account_type, is_blocked')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.is_blocked) {
      return Response.json({ error: 'Your AtriumX profile could not be loaded.' }, { status: 403, headers: CORS })
    }

    const { data: accommodationProfile } = await supabase
      .from('business_profiles')
      .select('is_accommodation')
      .eq('id', user.id)
      .maybeSingle()

    const actualAudience: PlanAudience = accommodationProfile?.is_accommodation
      ? 'accommodation'
      : profile?.account_type === 'business'
        ? 'business'
        : 'student'

    if (plan.audience !== actualAudience) {
      return Response.json({ error: 'This plan is not available for this account type.' }, { status: 403, headers: CORS })
    }

    if (listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('id, seller_id, status')
        .eq('id', listingId)
        .maybeSingle()

      if (!listing || listing.seller_id !== user.id || ['sold', 'suspended'].includes(listing.status)) {
        return Response.json({ error: 'This listing cannot be renewed.' }, { status: 400, headers: CORS })
      }
    }

    if (!['quote', 'checkout', 'cancel'].includes(mode)) {
      return Response.json({ error: 'Unknown checkout action.' }, { status: 400, headers: CORS })
    }
    let payment: any
    if (paymentId) {
      const { data, error } = await supabase.from('payments').select('*')
        .eq('id', paymentId).eq('user_id', user.id).maybeSingle()
      if (error || !data || data.plan_key !== planKey || data.pricing_version !== 1) {
        return Response.json({ error: 'This payment quote is unavailable.' }, { status: 400, headers: CORS })
      }
      payment = data
    } else {
      const { data, error } = await supabase.rpc('prepare_plan_payment', {
        p_user: user.id, p_plan: planKey, p_listing: listingId,
      })
      if (error || !data) {
        return Response.json({ error: error?.message || 'Could not prepare checkout.' }, { status: 400, headers: CORS })
      }
      payment = data
    }
    if (mode === 'cancel') {
      await supabase.from('payments').update({ status: 'cancelled' }).eq('id', payment.id).eq('user_id', user.id).eq('status', 'pending').is('checkout_started_at', null)
      return Response.json({ cancelled: true }, { headers: CORS })
    }
    if (payment.status !== 'pending' || new Date(payment.quote_expires_at).getTime() <= Date.now()) {
      return Response.json({ error: 'This quote has expired or has already been used. Please choose your plan again.' }, { status: 400, headers: CORS })
    }
    const quote = {
      paymentId: payment.id, planLabel: plan.label, listPrice: Number(payment.list_price),
      credit: Number(payment.credit_amount), minimumTopup: Number(payment.minimum_topup || 0), amountDue: Number(payment.amount), days: payment.plan_days,
      bonusDays: Number(payment.bonus_seconds || 0) / 86400, expiresAt: payment.quote_expires_at,
      intent: payment.intent,
    }
    if (mode === 'quote') return Response.json({ quote }, { headers: CORS })
    const { data: reserved, error: reservationError } = await supabase.from('payments')
      .update({ checkout_started_at: new Date().toISOString() }).eq('id', payment.id).eq('status', 'pending').select('id').maybeSingle()
    if (reservationError || !reserved) return Response.json({ error: 'This checkout is no longer available. Please choose your plan again.' }, { status: 400, headers: CORS })
    if (Number(payment.amount) === 0) {
      // No gateway transaction is needed when verified existing value covers it.
      const { error } = await supabase.rpc('activate_verified_plan_payment', {
        p_payment_id: payment.id, p_pf_payment_id: null,
        p_itn_payload: { source: 'verified_unused_time_credit' },
      })
      if (error) return Response.json({ error: 'Could not apply the credit. Please try again.' }, { status: 400, headers: CORS })
      return Response.json({ completed: true, quote }, { headers: CORS })
    }
    const mPaymentId = payment.m_payment_id

    const nameParts = (profile?.full_name || '').trim().split(' ')

    // Field ORDER here is the order PayFast documents and signs against.
    // Don't reorder these keys -- the signature is built from this object
    // in insertion order.
    const fields: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${SITE_URL}/#/payment/success`,
      cancel_url: `${SITE_URL}/#/payment/cancelled`,
      notify_url: `${SUPABASE_URL}/functions/v1/payfast-itn`,
      name_first: nameParts[0] || '',
      name_last: nameParts.slice(1).join(' ') || '',
      email_address: profile?.email || user.email || '',
      m_payment_id: mPaymentId,
      amount: Number(payment.amount).toFixed(2),
      item_name: `AtriumX ${plan.label} plan`,
      item_description: `${plan.days}-day ${plan.label} plan on AtriumX - one-time payment, no automatic renewal`,
      // Echoed back untouched on the ITN, so the callback knows who and
      // what without trusting anything else in the payload.
      custom_str1: user.id,
      custom_str2: planKey,
      custom_str3: plan.audience,
      custom_str4: payment.intent,
    }

    fields.signature = signPayload(fields)

    return Response.json(
      { url: PAYFAST_PROCESS_URL, fields, quote },
      { headers: CORS }
    )
  } catch (err) {
    console.error('payfast-create-payment failed:', err)
    return Response.json({ error: 'Could not start payment.' }, { status: 500, headers: CORS })
  }
})
