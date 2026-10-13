import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
let count=0
async function check(label, fn) { await fn(); console.log('PASS',label); count++ }
const stored=new Map();let blocked=false
const localStorage={getItem:k=>{if(blocked)throw Error();return stored.get(k)||null},setItem:(k,v)=>{if(blocked)throw Error();stored.set(k,v)},removeItem:k=>stored.delete(k)}
const exp={}; const location={hash:'#/business/post?plan=noticeboard&ref=PARTNER-A',origin:'https://atriumx.co.za',pathname:'/'}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/partnerReferral.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exp,window:{location},localStorage,Date,URLSearchParams})
await check('All five forms and both signup destinations contain the correct code',()=>{const links=exp.partnerLinks('PARTNER-A');assert.equal(links.length,7);for(const l of links)assert.ok(l.url.includes('ref=PARTNER-A'));assert.equal(links[0].url,'https://atriumx.co.za/#/business/post?plan=noticeboard&ref=PARTNER-A')})
await check('Attribution survives navigation and preserves the first link',()=>{assert.equal(exp.capturePartnerReferral(),'PARTNER-A');location.hash='#/student';assert.equal(exp.capturePartnerReferral(),'PARTNER-A');assert.equal(exp.capturePartnerReferral('?ref=OTHER'),'PARTNER-A')})
await check('Expired records and malformed codes are rejected',()=>{stored.set('atriumx:partner-referral',JSON.stringify({code:'OLD',expiresAt:1}));assert.equal(exp.capturePartnerReferral('?ref=%3Cscript%3E'),undefined)})
await check('Storage restrictions retain same-tab referral without crashing',()=>{blocked=true;assert.equal(exp.capturePartnerReferral('?ref=NEW'),'NEW');assert.equal(exp.capturePartnerReferral(''),'NEW');blocked=false;exp.clearPartnerReferral()})
const db=new PGlite()
const partner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',buyer='10000000-0000-4000-8000-000000000003',guest='10000000-0000-4000-8000-000000000004'
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
CREATE TABLE profiles(id uuid PRIMARY KEY,is_blocked boolean NOT NULL DEFAULT false,is_admin boolean NOT NULL DEFAULT false);
CREATE FUNCTION public.is_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce((select is_admin from profiles where id=$1),false) $$;
CREATE TABLE partners(user_id uuid PRIMARY KEY REFERENCES profiles(id),referral_code text UNIQUE,created_at timestamptz default now());
CREATE TABLE referrals(id uuid DEFAULT gen_random_uuid(),partner_id uuid REFERENCES profiles(id),referred_user_id uuid UNIQUE REFERENCES profiles(id),created_at timestamptz DEFAULT now());
CREATE TABLE listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid,title text,plan_tier text);
CREATE TABLE accommodation_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid,title text);
CREATE TABLE events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),host_id uuid,title text);
CREATE TABLE wanted_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seeker_id uuid,title text);
CREATE TABLE referral_events(id uuid DEFAULT gen_random_uuid(),partner_id uuid,referred_user_id uuid,listing_id uuid,plan_tier text,amount numeric,created_at timestamptz DEFAULT now());
CREATE TABLE notifications(user_id uuid,type text,message text,listing_id uuid);
CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,amount numeric,status text DEFAULT 'pending',pf_payment_id text,itn_payload jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE accommodation_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),receipt_hash text,ip_hash text,email text,contact_number text,website text,payload jsonb,status text DEFAULT 'draft',created_at timestamptz DEFAULT now(),claimed_by uuid,claimed_listing_id uuid);
CREATE FUNCTION claim_accommodation_submission(p_id uuid,p_receipt_hash text,p_image_urls text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s accommodation_submissions; lid uuid; BEGIN
SELECT * INTO s FROM accommodation_submissions WHERE id=p_id AND receipt_hash=p_receipt_hash;
IF s.status<>'approved' OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email=s.email AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Invalid claim'; END IF;
INSERT INTO accommodation_listings(seller_id,title) VALUES(auth.uid(),s.payload->>'title') RETURNING id INTO lid;
UPDATE accommodation_submissions SET status='claimed',claimed_by=auth.uid(),claimed_listing_id=lid WHERE id=p_id;RETURN lid;END $$;
INSERT INTO profiles(id) VALUES('${partner}'),('${other}');
INSERT INTO partners(user_id,referral_code) VALUES('${partner}','PARTNER-A'),('${other}','PARTNER-B');
GRANT SELECT ON profiles,partners TO authenticated;`)
await db.exec(fs.readFileSync('supabase/migrations/20261012195026_partner_referral_tracking.sql','utf8'))
const rows=async(q,args)=>(await db.query(q,args)).rows
const uid=async id=>db.query('select set_config(\'test.uid\',$1,false)',[id])
await check('Signup captures referral independently of handle_new_user',async()=>{await db.exec(`INSERT INTO auth.users VALUES('${buyer}','buyer@example.org',now(),'{"ref_code":"PARTNER-A"}');INSERT INTO profiles(id) VALUES('${buyer}');`);assert.equal((await rows(`select partner_id from referrals where referred_user_id='${buyer}'`))[0].partner_id,partner)})
await check('Authenticated RPC cannot overwrite attribution or self-refer',async()=>{await uid(buyer);assert.equal((await rows(`select attach_partner_referral('PARTNER-B') result`))[0].result,'already_attributed');await uid(other);assert.equal((await rows(`select attach_partner_referral('PARTNER-B') result`))[0].result,'invalid')})
await check('All account-based forms appear as separate activity, without earnings',async()=>{for(const [table,col] of [['listings','seller_id'],['accommodation_listings','seller_id'],['events','host_id'],['wanted_posts','seeker_id']])await db.exec(`INSERT INTO ${table}(${col},title) VALUES('${buyer}','Test ${table}')`);assert.equal((await rows('select count(*) n from partner_activity'))[0].n,4);assert.equal((await rows('select count(*) n from partner_commissions'))[0].n,0)})
await check('Guest accommodation stores a valid partner privately and counts submitted activity',async()=>{const s=(await rows(`select reserve_accommodation_submission('receipt','ip','guest@example.org','phone',null,'{"title":"Guest residence","_ref_code":"PARTNER-A"}') id`))[0];await db.exec(`update accommodation_submissions set status='pending' where id='${s.id}'`);const saved=(await rows(`select * from accommodation_submissions where id='${s.id}'`))[0];assert.equal(saved.referral_partner_id,partner);assert.equal(saved.payload._ref_code,undefined);assert.equal((await rows(`select count(*) n from partner_activity where kind='accommodation_submission'`))[0].n,1)})
await check('Verified guest claim binds the owner and avoids double-counting the submission',async()=>{await db.exec(`INSERT INTO auth.users VALUES('${guest}','guest@example.org',now(),'{}');INSERT INTO profiles(id) VALUES('${guest}');UPDATE accommodation_submissions SET status='approved';`);await uid(guest);const id=(await rows('select id from accommodation_submissions'))[0].id;await rows(`select claim_accommodation_submission('${id}','receipt','{}')`);assert.equal((await rows(`select partner_id from referrals where referred_user_id='${guest}'`))[0].partner_id,partner);assert.equal((await rows(`select count(*) n from partner_activity where kind='accommodation_submission'`))[0].n,0);assert.equal((await rows(`select count(*) n from partner_activity where kind='accommodation'`))[0].n,2)})
const newPayment=async(amount=249.5)=>(await rows(`insert into payments(user_id,amount) values('${buyer}',${amount}) returning id`))[0].id
const complete=async id=>db.exec(`update payments set status='complete',pf_payment_id='pf-${id}',itn_payload='{"payment_status":"COMPLETE"}' where id='${id}'`)
await check('No configured contract means no invented commission',async()=>{const id=await newPayment();await complete(id);assert.equal((await rows('select count(*) n from partner_commissions'))[0].n,0)})
await db.exec(`INSERT INTO partner_commission_terms VALUES('${partner}',0.20,now()-interval '1 hour',now()+interval '1 year','TEST-CONTRACT');`)
await check('Verified upgrade earns once on R249.50 cash, not sticker price or reused credit',async()=>{const id=await newPayment();await complete(id);await complete(id);const c=await rows(`select * from partner_commissions where payment_id='${id}'`);assert.equal(c.length,1);assert.equal(Number(c[0].amount),49.9);assert.equal(c[0].status,'pending')})
await check('Pending, failed, review-required, unverified and zero-cash payments earn nothing',async()=>{const before=(await rows('select count(*) n from partner_commissions'))[0].n;for(const status of ['pending','failed','review_required','complete']){const id=await newPayment();await db.exec(`update payments set status='${status}' where id='${id}'`)}await complete(await newPayment(0));assert.equal((await rows('select count(*) n from partner_commissions'))[0].n,before)})
await check('Partners can only read their own commission records, cannot forge payouts',async()=>{await uid(other);await db.exec('SET ROLE authenticated');assert.equal((await rows('select * from partner_commissions')).length,0);await assert.rejects(()=>db.exec(`insert into partner_commissions(partner_id,payment_id,cash_amount,rate,amount,agreement_reference) values('${other}',gen_random_uuid(),10,.2,2,'fake')`),/permission denied/);await assert.rejects(()=>db.exec('update partner_commission_terms set rate=1'),/permission denied/);await db.exec('RESET ROLE')})
await check('Overview restricts records to the signed-in partner',async()=>{await uid(partner);const p=(await rows('select get_partner_overview() o'))[0].o;assert.equal(p.referredCount,2);assert.equal(p.totals.pending,49.9);assert.ok(p.activities.length>=4);await uid(buyer);await assert.rejects(()=>rows('select get_partner_overview()'),/Partner access required/)})
await check('Existing paying customer cannot acquire new attribution',async()=>{await db.exec(`delete from referrals where referred_user_id='${buyer}'`);await uid(buyer);assert.equal((await rows(`select attach_partner_referral('PARTNER-B') result`))[0].result,'existing_customer')})
await check('Anonymous caller cannot execute attribution or read the ledger',async()=>{await db.exec('SET ROLE anon');await assert.rejects(()=>rows(`select attach_partner_referral('PARTNER-A')`),/permission denied/);await assert.rejects(()=>rows('select * from partner_commissions'),/permission denied/);await db.exec('RESET ROLE')})
await db.close();console.log(`${count} partner referral checks passed`)
