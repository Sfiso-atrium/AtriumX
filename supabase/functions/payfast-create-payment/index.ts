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
const PLAN_PRICES: Record<string, { amount: number; days: number; label: string }> = {
  visible:        { amount: 29,  days: 7,  label: 'Visible' },
  loud:           { amount: 79,  days: 14, label: 'Loud' },
  unmissable:     { amount: 149, days: 30, label: 'Unmissable' },
  featured:       { amount: 350, days: 14, label: 'Featured' },
  campus_partner: { amount: 800, days: 30, label: 'Campus Partner' },
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

    const { planKey } = await req.json()
    const plan = PLAN_PRICES[planKey]
    if (!plan) {
      return Response.json({ error: 'Unknown or free plan.' }, { status: 400, headers: CORS })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Our reference. Unique per attempt, so an abandoned payment that's
    // retried later gets its own row rather than colliding.
    const mPaymentId = `${user.id.slice(0, 8)}-${Date.now()}`

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      m_payment_id: mPaymentId,
      plan_key: planKey,
      plan_days: plan.days,
      amount: plan.amount,
      status: 'pending',
    })
    if (insertError) {
      return Response.json({ error: 'Could not start payment.' }, { status: 500, headers: CORS })
    }

    const nameParts = (profile?.full_name || '').trim().split(' ')

    // Field ORDER here is the order PayFast documents and signs against.
    // Don't reorder these keys -- the signature is built from this object
    // in insertion order.
    const fields: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: `${SITE_URL}/payment/success`,
      cancel_url: `${SITE_URL}/payment/cancelled`,
      notify_url: `${SUPABASE_URL}/functions/v1/payfast-itn`,
      name_first: nameParts[0] || '',
      name_last: nameParts.slice(1).join(' ') || '',
      email_address: profile?.email || user.email || '',
      m_payment_id: mPaymentId,
      amount: plan.amount.toFixed(2),
      item_name: `AtriumX ${plan.label} plan`,
      item_description: `${plan.days}-day ${plan.label} plan on AtriumX`,
      // Echoed back untouched on the ITN, so the callback knows who and
      // what without trusting anything else in the payload.
      custom_str1: user.id,
      custom_str2: planKey,
    }

    fields.signature = signPayload(fields)

    return Response.json(
      { url: PAYFAST_PROCESS_URL, fields },
      { headers: CORS }
    )
  } catch (err) {
    console.error('payfast-create-payment failed:', err)
    return Response.json({ error: 'Could not start payment.' }, { status: 500, headers: CORS })
  }
})
