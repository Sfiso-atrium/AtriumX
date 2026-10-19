import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

const utils = {}, links = {}, mail = {}
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(transpile('src/utils/busTravel.ts'), { exports: utils, URL, Intl, Date })
vm.runInNewContext(transpile('src/utils/travelLinks.ts'), { exports: links, require: () => utils, URLSearchParams, Date })
vm.runInNewContext(transpile('supabase/functions/travel-alerts/mail.ts'), { exports: mail, URLSearchParams, URL, Date, Intl })
let passed = 0
async function test(name, fn) { await fn(); passed++; console.log('PASS', name) }
await test('Shared searches reopen all filters and exclude email, token and campaign parameters', () => {
  const filters = { ...utils.emptyBusFilters, from: 'Johannesburg', to: 'Durban', date: '2026-12-10', maxPrice: '450', departure: 'evening', journey: 'one_way', connection: 'direct', studentDiscount: true, sort: 'duration' }
  const url = links.travelShareLink(filters)
  assert.deepEqual(JSON.parse(JSON.stringify(links.readTravelFilters(new URLSearchParams(url.split('?')[1])))), filters)
  const input = links.readTravelFilters(new URLSearchParams('from=Durban&email=secret@example.com&confirm=private-token&utm_source=private'))
  const shared = links.travelShareLink(input)
  assert(!shared.includes('secret')); assert(!shared.includes('private'))
  const invalid = links.readTravelFilters(new URLSearchParams('maxPrice=-1&sort=bad&journey=invalid&date=not-a-date'))
  assert.equal(invalid.maxPrice, ''); assert.equal(invalid.sort, 'price_low'); assert.equal(invalid.date, '')
})
await test('Card sharing includes its company and bus ID without inventing a reverse journey', () => {
  const url = links.travelShareLink(utils.emptyBusFilters, { id: 'bus-id', company_name: 'Company A', origin: 'Johannesburg', destination: 'Durban', boarding_points: [], dropoff_points: [], travel_date: '2026-12-10' })
  const params = new URLSearchParams(url.split('?')[1])
  assert.equal(params.get('from'), 'Johannesburg'); assert.equal(params.get('to'), 'Durban'); assert.equal(params.get('company'), 'Company A'); assert.equal(params.get('bus'), 'bus-id')
})
await test('Email content has confirmation and unsubscribe links, and never promotes expired information', () => {
  const job = { kind: 'confirmation', from_place: 'Johannesburg', to_place: 'Durban', confirmation_token: 'confirm', unsubscribe_token: 'unsubscribe', payload: {} }
  assert.match(mail.travelEmail(job).text, /confirm=confirm/); assert.match(mail.travelEmail(job).text, /unsubscribe=unsubscribe/)
  const update = { ...job, kind: 'update', payload: { id: 'bus', company_name: 'Company A', website_url: 'https://example.com', price: 250, price_type: 'from' } }
  assert.match(mail.travelEmail(update).text, /Starting fare: R250.00/)
  assert.match(mail.travelEmail(update).text, /Confirm current fares/)
  assert.equal(mail.travelEmail({ ...update, payload: { ...update.payload, valid_until: '2020-01-01' } }), null)
  assert.equal(mail.travelEmail({ ...update, payload: { ...update.payload, website_url: 'javascript:alert(1)' } }), null)
})

const db = new PGlite()
const admin = '10000000-0000-4000-8000-000000000001', student = '10000000-0000-4000-8000-000000000002', blocked = '10000000-0000-4000-8000-000000000003'
const visit = '20000000-0000-4000-8000-000000000001', token = '30000000-0000-4000-8000-000000000001'
const other = '20000000-0000-4000-8000-000000000002'
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA atriumx_private;CREATE SCHEMA cron;CREATE SCHEMA net;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE TABLE profiles(id uuid PRIMARY KEY,is_admin boolean DEFAULT false,is_blocked boolean DEFAULT false);
INSERT INTO profiles VALUES('${admin}',true,false),('${student}',false,false),('${blocked}',false,true);
CREATE FUNCTION atriumx_private.workspace_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin AND NOT is_blocked)$$;
REVOKE ALL ON FUNCTION atriumx_private.workspace_admin() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION atriumx_private.workspace_admin() TO authenticated;
GRANT USAGE ON SCHEMA auth,atriumx_private TO authenticated,service_role;
CREATE FUNCTION public.admin_visit_alert(text) RETURNS void LANGUAGE sql AS $$SELECT NULL::void$$;
CREATE FUNCTION public.get_vault_secret(text) RETURNS text LANGUAGE sql AS $$SELECT NULL::text$$;
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;`)
const monitor = fs.readFileSync('supabase/migrations/20261006131505_admin_visit_monitor.sql', 'utf8')
await db.exec(monitor.slice(monitor.indexOf('CREATE TABLE public.admin_visit_sessions'), monitor.indexOf('-- Private implementation functions')))
await db.exec(fs.readFileSync('supabase/migrations/20261019205719_free_bus_directory.sql', 'utf8'))
await db.exec(fs.readFileSync('supabase/migrations/20261019220921_travel_engagement_and_alerts.sql', 'utf8'))
await db.exec(fs.readFileSync('supabase/migrations/20261019221056_travel_private_worker_policies.sql', 'utf8'))
const query = async (sql, params = []) => (await db.query(sql, params)).rows
const root = () => db.exec('RESET ROLE')
async function guest() { await root(); await query("select set_config('test.uid','',false)"); await db.exec('SET ROLE anon') }
async function auth(id) { await root(); await query("select set_config('test.uid',$1,false)", [id]); await db.exec('SET ROLE authenticated') }
async function service() { await root(); await query("select set_config('test.uid','',false)"); await db.exec('SET ROLE service_role') }
const request = (email, from = 'Johannesbrg', to = 'Durbna', consent = true) => query('select request_travel_alert($1,$2,$3,$4,$5,null,$6) data', [visit, token, email, from, to, consent])
const event = (id, kind, bus = null, from = null) => query('select record_travel_event($1,$2,$3,$4,$5,1,$6,null)', [id, visit, token, kind, bus, from])
const worker = async (action, data = {}) => (await query('select travel_alert_worker($1,$2) data', [action, JSON.stringify(data)]))[0].data
let bus, subscription
await test('Guests can record Travel visits and activity without logging in', async () => {
  await guest(); await query("select record_admin_visit(p_id=>$1,p_token=>$2,p_path=>'/travel')", [visit, token])
  await event('40000000-0000-4000-8000-000000000001', 'route_search')
  await root(); assert.equal((await query('select entry_path from admin_visit_sessions'))[0].entry_path, '/travel')
  assert.equal((await query('select count(*) n from atriumx_private.travel_events'))[0].n, 1)
})
await test('Activity is idempotent, token-scoped and never stores arbitrary typed search contents', async () => {
  await guest(); await event('40000000-0000-4000-8000-000000000001', 'route_search')
  await event('40000000-0000-4000-8000-000000000002', 'route_search', null, 'private@example.com')
  await assert.rejects(() => query("select record_travel_event(gen_random_uuid(),$1,gen_random_uuid(),'route_search')", [visit]), /Invalid visit reference/)
  await root(); const rows = await query('select * from atriumx_private.travel_events'); assert.equal(rows.length, 2); assert.equal(rows[1].from_place, null)
})
await test('Company clicks identify the supplied company; admin and blocked visitors are excluded', async () => {
  await auth(admin); bus = (await query("insert into bus_listings(company_name,website_url,origin,destination) values('Company A','https://example.com','Johannesburg','Durban') returning *"))[0]
  await guest(); await event('40000000-0000-4000-8000-000000000003', 'company_click', bus.id, 'Johannesburg')
  for (const id of [admin, blocked]) { await auth(id); await event('40000000-0000-4000-8000-000000000004', 'company_click', bus.id) }
  await root(); assert.equal((await query("select count(*) n from atriumx_private.travel_events where kind='company_click'"))[0].n, 1)
})
await test('Guests and students cannot read tracking, email addresses, tokens, admin reports or the mail worker', async () => {
  for (const id of [null, student]) {
    if (id) await auth(id); else await guest()
    for (const table of ['travel_events', 'travel_alert_subscriptions', 'travel_mail_jobs']) await assert.rejects(() => query(`select * from atriumx_private.${table}`), /permission denied/)
    await assert.rejects(() => query('select get_travel_engagement_report()'), /permission denied|Admin access/)
    await assert.rejects(() => worker('claim'), /permission denied/)
  }
})
await test('Email updates require explicit consent, a valid email and the visitor capability', async () => {
  await guest()
  await assert.rejects(() => request('student@example.com', undefined, undefined, false), /agree/)
  await assert.rejects(() => request('invalid'), /valid email/)
  await assert.rejects(() => query("select request_travel_alert($1,gen_random_uuid(),'student@example.com','Johannesburg','Durban',null,true)", [visit]), /Refresh/)
  const result = (await request('STUDENT@example.com'))[0].data
  assert.equal(result.delivery_ready, false)
  await request('student@example.com')
  await root(); subscription = (await query('select * from atriumx_private.travel_alert_subscriptions'))[0]
  assert.equal(subscription.email, 'student@example.com'); assert.equal(subscription.status, 'pending')
  assert.equal((await query('select count(*) n from atriumx_private.travel_mail_jobs'))[0].n, 1)
})
await test('Pending requests receive no route notifications; only the emailed token activates a subscription', async () => {
  await auth(admin); await query('update bus_listings set price=250 where id=$1', [bus.id])
  await root(); assert.equal((await query("select count(*) n from atriumx_private.travel_mail_jobs where kind='update'"))[0].n, 0)
  await guest(); await assert.rejects(() => query("select manage_travel_alert('confirm',gen_random_uuid())"), /invalid or expired/)
  await query("select manage_travel_alert('confirm',$1)", [subscription.confirmation_token])
  await root(); assert.equal((await query('select status from atriumx_private.travel_alert_subscriptions'))[0].status, 'active')
})
await test('Matching a new fare tolerates typos, coalesces updates and does not queue outdated information', async () => {
  await auth(admin); await query('update bus_listings set price=300 where id=$1', [bus.id]); await query('update bus_listings set price=310 where id=$1', [bus.id])
  await root(); let jobs = await query("select * from atriumx_private.travel_mail_jobs where kind='update'"); assert.equal(jobs.length, 1); assert.equal(jobs[0].payload.price, 310)
  await auth(admin); await query('update bus_listings set price=320,is_outdated=true where id=$1', [bus.id])
  await root(); jobs = await query("select * from atriumx_private.travel_mail_jobs where kind='update'"); assert.equal(jobs[0].payload.price, 310); assert.equal(jobs[0].state, 'cancelled')
  await auth(admin); await query('update bus_listings set is_outdated=false,price=325 where id=$1', [bus.id])
  await root(); jobs = await query("select * from atriumx_private.travel_mail_jobs where kind='update'"); assert.equal(jobs[0].state, 'pending'); assert.equal(jobs[0].payload.price, 325)
  for (const [q, p] of [['Johanensbrug', 'Johannesburg'], ['Park Statoin', 'Park Station'], ['elizabth port', 'Port Elizabeth']]) assert.equal((await query('select atriumx_private.travel_place_matches($1,ARRAY[$2]) yes', [q, p]))[0].yes, true)
})
await test('Worker claims are exclusive and stale acknowledgements cannot mark a message as sent', async () => {
  await service(); const jobs = await worker('claim'); assert.equal(jobs.length, 1)
  assert.equal((await worker('claim')).length, 0)
  const job = jobs[0]
  await worker('complete', { id: job.id, lock_token: '50000000-0000-4000-8000-000000000001', outcome: 'sent' })
  await root(); assert.equal((await query('select state from atriumx_private.travel_mail_jobs where id=$1', [job.id]))[0].state, 'processing')
  await service(); await worker('complete', { id: job.id, lock_token: job.lock_token, outcome: 'sent', provider_id: 'test-accepted' })
  await root(); assert.equal((await query('select state from atriumx_private.travel_mail_jobs where id=$1', [job.id]))[0].state, 'sent')
})
await test('Unsubscribe is public, token-scoped and cancels remaining queued messages immediately', async () => {
  await auth(admin); await query('update bus_listings set is_outdated=false,price=330 where id=$1', [bus.id])
  await guest(); await query("select manage_travel_alert('unsubscribe',$1)", [subscription.unsubscribe_token])
  await query("select manage_travel_alert('unsubscribe',$1)", [subscription.unsubscribe_token])
  await root(); assert.equal((await query('select status from atriumx_private.travel_alert_subscriptions'))[0].status, 'unsubscribed')
  await service(); assert.equal((await worker('claim')).length, 0)
})
await test('Admins can see route demand, company referrals and subscription status, but not email-management tokens', async () => {
  await auth(admin); const report = (await query('select get_travel_engagement_report() data'))[0].data
  assert.equal(report.visits, 1); assert.equal(report.counts.company_click, 1); assert.equal(report.companies[0].company, 'Company A')
  assert.equal(report.subscriptions.unsubscribed, 1); assert.equal(report.requests[0].email, 'student@example.com')
  assert(!JSON.stringify(report).includes(subscription.confirmation_token)); assert(!JSON.stringify(report).includes(subscription.unsubscribe_token))
})
await test('Email request rate limits prevent one browser from filling the queue', async () => {
  await guest(); await request('second@example.com'); await request('third@example.com')
  await assert.rejects(() => request('fourth@example.com'), /Too many/)
})
await test('Delivery failures retry without false success and stop after five attempts', async () => {
  await service(); const claimed = await worker('claim'); assert.equal(claimed.length, 2)
  let job = claimed[0]
  await worker('complete', { id: claimed[1].id, lock_token: claimed[1].lock_token, outcome: 'cancelled' })
  for (let attempt = 1; attempt <= 5; attempt++) {
    await worker('complete', { id: job.id, lock_token: job.lock_token, outcome: 'failed', error: 'provider_unavailable' })
    if (attempt < 5) {
      await root(); await query("update atriumx_private.travel_mail_jobs set next_attempt=now()-interval '1 minute' where id=$1", [job.id])
      await service(); const next = await worker('claim'); assert.equal(next.length, 1); job = next[0]
    }
  }
  await root(); const failed = (await query('select state,attempts,accepted_at from atriumx_private.travel_mail_jobs where id=$1', [job.id]))[0]
  assert.equal(failed.state, 'failed'); assert.equal(failed.attempts, 5); assert.equal(failed.accepted_at, null)
})
await test('The daily safety budget prevents additional mail claims after fifty accepted messages', async () => {
  await root()
  await query("insert into atriumx_private.travel_mail_jobs(subscription_id,kind,dedupe_key,state,accepted_at) select $1,'update','history-'||n,'sent',now() from generate_series(1,50) n", [subscription.id])
  await service(); assert.equal((await worker('claim')).length, 0)
})
await root(); await db.close()
console.log(`${passed} travel engagement checks passed`)
