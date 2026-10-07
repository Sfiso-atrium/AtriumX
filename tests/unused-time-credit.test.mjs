import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
const user='10000000-0000-4000-8000-000000000001',source='20000000-0000-4000-8000-000000000001'
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE profiles(id uuid PRIMARY KEY,account_type text,plan text,plan_expires_at timestamptz,is_blocked boolean DEFAULT false,is_admin boolean DEFAULT false);
CREATE TABLE business_profiles(id uuid PRIMARY KEY,is_accommodation boolean DEFAULT false,accommodation_plan text DEFAULT 'accommodation_free',accommodation_plan_expires_at timestamptz);
CREATE TABLE listings(id uuid PRIMARY KEY,seller_id uuid,status text,plan_enabled boolean DEFAULT true,plan_tier text,expires_at timestamptz);
CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,m_payment_id text UNIQUE,pf_payment_id text,plan_key text,plan_days integer,amount numeric,status text DEFAULT 'pending' CONSTRAINT payments_status_check CHECK(status IN ('pending','complete','failed','cancelled')),itn_payload jsonb,created_at timestamptz DEFAULT now(),completed_at timestamptz,intent text DEFAULT 'purchase',listing_id uuid);
CREATE TABLE notifications(user_id uuid,type text,message text);
CREATE FUNCTION normal_listing_limit_for_account(uuid) RETURNS integer LANGUAGE sql AS $$ SELECT 3 $$;
INSERT INTO profiles(id,account_type,plan) VALUES('${user}','business','featured');
INSERT INTO business_profiles(id) VALUES('${user}');
INSERT INTO payments(id,user_id,m_payment_id,plan_key,plan_days,amount,status,completed_at) VALUES('${source}','${user}','original','featured',30,199,'complete',now()-interval '15 days');
UPDATE profiles SET plan_expires_at=(SELECT completed_at+interval '30 days' FROM payments WHERE id='${source}');`)
await db.exec(fs.readFileSync('supabase/migrations/20261005100500_095_atomic_verified_plan_activation.sql','utf8'))
const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_unused_time_upgrade_credit.sql'))
await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'))
let passed=0
const query=async s=>(await db.query(s)).rows
const quote=async(plan='campus_partner')=>(await query(`select plan_payment_quote('${user}','${plan}') q`))[0].q
const prepare=async(plan='campus_partner')=>(await query(`select prepare_plan_payment('${user}','${plan}') q`))[0].q
const activate=async p=>query(`select * from activate_verified_plan_payment('${p.id}','gateway-verified','{}')`)
async function test(label,fn){await db.exec('BEGIN');try{await fn();console.log('PASS',label);passed++}finally{await db.exec('ROLLBACK')}}
await test('Half-used R199 plan receives R99.50 credit, pays R249.50',async()=>{const q=await quote();assert.equal(q.credit_amount,99.5);assert.equal(q.amount,249.5)})
await test('Repeated quote request reuses one pending payment',async()=>{const a=await prepare(),b=await prepare();assert.equal(a.id,b.id)})
await test('Confirmed upgrade consumes source and activates target atomically',async()=>{const p=await prepare();await activate(p);assert.equal((await query(`select plan from profiles where id='${user}'`))[0].plan,'campus_partner');assert.equal((await query(`select credit_used_by from payments where id='${source}'`))[0].credit_used_by,p.id)})
await test('Duplicate verified callback does not extend expiry twice',async()=>{const p=await prepare();const a=await activate(p),b=await activate(p);assert.equal(+a[0].activated_until,+b[0].activated_until)})
await test('Expired plan gives no credit',async()=>{await db.exec(`update profiles set plan_expires_at=now()-interval '1 second'`);assert.equal((await quote()).credit_amount,0)})
await test('Same-plan renewal charges full price and extends existing expiry',async()=>{const q=await prepare('featured');assert.equal(Number(q.amount),199);assert.equal(q.intent,'renewal');await activate(q);const n=(await query(`select extract(epoch from plan_expires_at-now())/86400 d from profiles`))[0].d;assert.ok(Math.abs(Number(n)-45)<0.001)})
await test('No verified payment means no invented paid credit',async()=>{await db.exec(`update payments set status='failed' where id='${source}'`);assert.equal((await quote()).credit_amount,0)})
await test('Different account audience is rejected',async()=>{await assert.rejects(()=>quote('accommodation_premium'),/not available/)})
await test('Expired credited checkout is retained for admin review, not activated',async()=>{const p=await prepare();await db.exec(`update payments set quote_expires_at=now()-interval '1 second' where id='${p.id}'`);await activate(p);assert.equal((await query(`select status from payments where id='${p.id}'`))[0].status,'review_required');assert.equal((await query('select plan from profiles'))[0].plan,'featured')})
await test('Changed entitlement cannot reuse a stale quote',async()=>{const p=await prepare();await db.exec(`update profiles set plan_expires_at=plan_expires_at+interval '1 day'`);await activate(p);assert.equal((await query(`select status from payments where id='${p.id}'`))[0].status,'review_required')})
await test('Prepaid renewals contribute remaining value',async()=>{const renewal=await prepare('featured');await activate(renewal);const q=await quote();assert.equal(q.credit_amount,298.5);assert.equal(q.amount,50.5)})
await test('Credit above target price preserves surplus as extra days',async()=>{for(let i=0;i<2;i++){const p=await prepare('featured');await activate(p)}const p=await prepare();assert.equal(Number(p.amount),0);assert.ok(p.bonus_seconds>0);await activate(p);assert.equal((await query(`select status from payments where id='${p.id}'`))[0].status,'complete')})
await test('Sub-R5 remainder becomes explicit top-up and extra time',async()=>{await db.exec(`update payments set amount=690 where id='${source}'`);const q=await quote();assert.equal(q.credit_amount,345);assert.equal(q.amount,5);assert.equal(q.minimum_topup,1);assert.ok(q.bonus_seconds>0)})
await test('Accommodation upgrades use their own payment history',async()=>{await db.exec(`update business_profiles set is_accommodation=true,accommodation_plan='accommodation_featured',accommodation_plan_expires_at=(select entitlement_end from payments where id='${source}'); update payments set plan_key='accommodation_featured' where id='${source}'`);const q=await quote('accommodation_premium');assert.equal(q.credit_amount,99.5);assert.equal(q.amount,299.5)})
await test('Authenticated clients cannot invoke price or activation RPCs',async()=>{await db.exec('SET LOCAL ROLE authenticated');await assert.rejects(()=>prepare(),/permission denied/)})
console.log(`${passed} unused-time credit checks passed`)
await db.close()
