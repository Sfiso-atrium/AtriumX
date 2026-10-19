import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const transpile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const mail = {}
vm.runInNewContext(transpile('supabase/functions/travel-alerts/mail.ts'), { exports: mail, URL, URLSearchParams, Intl, Date })
const settings = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-test', CRON_SECRET: 'cron-test' }
const calls = [], outgoing = []
let handler, jobs = [], responseStatus = 200, allowed = true, queueFails = false
vm.runInNewContext(transpile('supabase/functions/travel-alerts/index.ts'), {
  exports: {}, require: name => name === './mail.ts' ? mail : { createClient: () => ({ rpc: async (_, body) => {
    calls.push(body)
    if (queueFails) return { data: null, error: { message: 'offline' } }
    return { error: null, data: body.p_action === 'claim' ? jobs : body.p_action === 'check' ? { allowed } : {} }
  } }) },
  Deno: { env: { get: key => settings[key] }, serve: fn => { handler = fn } }, Response, AbortSignal,
  fetch: async (url, options) => { outgoing.push({ url, options }); return new Response(JSON.stringify(responseStatus === 200 ? { id: 'accepted-test' } : { error: 'rejected' }), { status: responseStatus }) },
})
const request = (secret = 'cron-test', method = 'POST') => handler(new Request('https://example.com', { method, headers: { 'x-cron-secret': secret } }))
let passed = 0
async function test(name, fn) { await fn(); passed++; console.log('PASS', name) }
await test('Mail worker rejects unauthenticated calls before reading the queue or contacting the provider', async () => {
  assert.equal((await request('wrong')).status, 401); assert.equal(calls.length, 0); assert.equal(outgoing.length, 0)
  assert.equal((await request('cron-test', 'GET')).status, 405)
})
await test('Missing sender credentials retain the queue and truthfully report delivery is not configured', async () => {
  const result = await (await request()).json()
  assert.equal(result.ready, false); assert.equal(result.sent, 0); assert.equal(outgoing.length, 0)
  assert.equal(calls.at(-1).p_action, 'health'); assert.equal(calls.at(-1).p_data.ready, false)
})
const job = { id: 'job-test', lock_token: 'lock-test', kind: 'confirmation', email: 'student@example.com', from_place: 'Johannesburg', to_place: 'Durban', confirmation_token: 'confirmation-test', unsubscribe_token: 'unsubscribe-test', payload: {} }
await test('A configured worker sends only the claimed recipient, uses an idempotency key and records provider acceptance', async () => {
  settings.TRAVEL_RESEND_API_KEY = 'api-test'; settings.TRAVEL_MAIL_FROM = 'AtriumX <students@example.com>'; jobs = [job]
  const result = await (await request()).json()
  assert.equal(result.sent, 1); assert.equal(outgoing.length, 1)
  const sent = outgoing[0]; assert.equal(sent.url, 'https://api.resend.com/emails'); assert.equal(sent.options.headers['Idempotency-Key'], 'travel-job-test')
  const body = JSON.parse(sent.options.body); assert.deepEqual(body.to, ['student@example.com']); assert.match(body.text, /confirm=confirmation-test/)
  assert.equal(calls.at(-1).p_data.outcome, 'sent'); assert.equal(calls.at(-1).p_data.provider_id, 'accepted-test')
})
await test('Provider rejections are retried and never counted as sent; configuration failures are visible', async () => {
  responseStatus = 403; const result = await (await request()).json()
  assert.equal(result.sent, 0); assert.equal(result.ready, false)
  assert(calls.some(call => call.p_action === 'complete' && call.p_data.outcome === 'failed'))
  assert.equal(calls.at(-1).p_action, 'health'); assert.equal(calls.at(-1).p_data.ready, false)
})
await test('A subscriber removed after claiming cannot be emailed', async () => {
  responseStatus = 200; allowed = false; const before = outgoing.length
  await request(); assert.equal(outgoing.length, before); assert.equal(calls.at(-1).p_data.outcome, 'cancelled')
})
await test('Queue errors return a bounded error without exposing recipient information or credentials', async () => {
  queueFails = true; const result = await request(); assert.equal(result.status, 503)
  const body = await result.text(); assert(!body.includes(job.email)); assert(!body.includes('api-test')); assert(!body.includes('server-test'))
})
console.log(`${passed} travel mail worker checks passed`)
