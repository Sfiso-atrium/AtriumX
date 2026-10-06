import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
const admin='10000000-0000-4000-8000-000000000001', student='10000000-0000-4000-8000-000000000002', other='10000000-0000-4000-8000-000000000003'
const visit='20000000-0000-4000-8000-000000000001', token='30000000-0000-4000-8000-000000000001', listing='40000000-0000-4000-8000-000000000001'
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA net; CREATE SCHEMA cron; CREATE SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE FUNCTION public.get_vault_secret(text) RETURNS text LANGUAGE sql AS $$SELECT NULL::text$$;
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;
-- Only receipt comparison is tested locally; production uses pgcrypto SHA256.
CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql AS $$SELECT decode(md5($1)||md5($1),'hex')$$;
CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,is_admin boolean DEFAULT false,is_blocked boolean DEFAULT false);
CREATE TABLE listings(id uuid PRIMARY KEY,seller_id uuid,created_at timestamptz DEFAULT now());
CREATE TABLE accommodation_listings(LIKE listings INCLUDING ALL);
CREATE TABLE accommodation_submissions(id uuid PRIMARY KEY,receipt_hash text,status text,created_at timestamptz DEFAULT now());
CREATE TABLE notifications(user_id uuid,type text,message text,created_at timestamptz DEFAULT now());
INSERT INTO profiles VALUES('${admin}','Admin',true,false),('${student}','Student',false,false),('${other}','Other',false,false);
INSERT INTO listings(id,seller_id) VALUES('${listing}','${student}');
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT SELECT ON profiles TO authenticated;`)
await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261006131505_admin_visit_monitor.sql',import.meta.url),'utf8'))
let checks=0
const check = (label, fn) => fn().then(()=>{checks++;console.log('PASS '+label)})
async function as(role,user,sql) {await db.exec(`BEGIN; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${user||''}',true)`);try {const result=await db.query(sql);await db.exec('COMMIT');return result.rows} catch(e){await db.exec('ROLLBACK');throw e}}
const record=(id=visit,key=token,path='/accommodation/post',active=0,form=0)=>`SELECT record_admin_visit('${id}','${key}','${path}','email','rhodes','phone',${active},${form},true,false)`
await check('Anonymous visit is accepted',async()=>{await as('anon',null,record());assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_sessions')).rows[0].n,1)})
await check('Retry does not duplicate visit',async()=>{await as('anon',null,record());assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_sessions')).rows[0].n,1)})
await check('Anonymous cannot read activity',async()=>{await assert.rejects(()=>as('anon',null,'SELECT * FROM admin_visit_sessions'))})
await check('Ordinary account cannot read activity',async()=>{assert.equal((await as('authenticated',student,'SELECT * FROM admin_visit_sessions')).length,0);await assert.rejects(()=>as('authenticated',student,'SELECT get_admin_visit_report()'))})
await check('Wrong capability cannot update a visit',async()=>{await assert.rejects(()=>as('anon',null,record(visit,other)))})
await check('Private paths ignored',async()=>{await as('anon',null,record(other,token,'/chat'));assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_sessions')).rows[0].n,1)})
await check('Admin visits excluded',async()=>{await as('authenticated',admin,record(other));assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_sessions')).rows[0].n,1)})
await check('Duration cannot exceed elapsed time',async()=>{await as('anon',null,record(visit,token,'/accommodation/post',99999,99999));assert.ok((await db.query('SELECT active_seconds n FROM admin_visit_sessions')).rows[0].n<30)})
await check('Unverified listing cannot be attributed',async()=>{await assert.rejects(()=>as('authenticated',other,`SELECT record_admin_visit_conversion('${visit}','${token}','listing','${listing}')`))})
await check('Verified submission is idempotent',async()=>{for(let i=0;i<2;i++)await as('authenticated',student,`SELECT record_admin_visit_conversion('${visit}','${token}','listing','${listing}')`);assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_conversions')).rows[0].n,1)})
await check('Only admin can enable alerts',async()=>{await assert.rejects(()=>as('authenticated',student,`INSERT INTO admin_visit_settings VALUES('${student}',true,now())`));await as('authenticated',admin,`INSERT INTO admin_visit_settings VALUES('${admin}',true,now())`)})
await check('Admin report includes accurate conversion count',async()=>{const r=(await as('authenticated',admin,'SELECT get_admin_visit_report() report'))[0].report;assert.equal(r.visits,1);assert.equal(r.listings,1);assert.equal(r.submitted_visits,1);assert.ok(!('token' in r.rows[0]))})
await check('Idle finalizer skips submitted sessions',async()=>{await db.exec(`UPDATE admin_visit_sessions SET last_seen=now()-interval '5 minutes',alerted_at=now();SELECT finalize_admin_visits()`);assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,0)})
await check('Idle visitor alerts once and only to admin',async()=>{await as('anon',null,record(other));await db.exec(`UPDATE admin_visit_sessions SET last_seen=now()-interval '5 minutes',alerted_at=now() WHERE id='${other}';SELECT finalize_admin_visits();SELECT finalize_admin_visits()`);const rows=(await db.query('SELECT * FROM notifications')).rows;assert.equal(rows.length,2);assert.ok(rows.every(row=>row.user_id===admin));assert.equal(rows.filter(row=>row.message.startsWith('No submission')).length,1)})
await check('Ordinary accounts cannot invoke alert/finalizer/test',async()=>{for(const sql of ["SELECT admin_visit_alert('fake')",'SELECT finalize_admin_visits()','SELECT test_admin_visit_push()'])await assert.rejects(()=>as('authenticated',student,sql))})
await check('Guest submission requires correct receipt',async()=>{const receipt='a'.repeat(64);await db.exec(`INSERT INTO accommodation_submissions VALUES('${other}',encode(extensions.digest('${receipt}','sha256'),'hex'),'pending',now())`);await assert.rejects(()=>as('anon',null,`SELECT record_admin_visit_conversion('${other}','${token}','submission','${other}','${'b'.repeat(64)}')`));await as('anon',null,`SELECT record_admin_visit_conversion('${other}','${token}','submission','${other}','${receipt}')`);assert.equal((await db.query('SELECT count(*)::int n FROM admin_visit_conversions')).rows[0].n,2)})
await check('Out-of-order heartbeat cannot overwrite newer route',async()=>{await as('anon',null,`SELECT record_admin_visit('${visit}','${token}','/feed','','','phone',0,0,false,false,10)`);await as('anon',null,`SELECT record_admin_visit('${visit}','${token}','/accommodation/post','','','phone',0,0,false,true,9)`);assert.equal((await db.query(`SELECT last_path FROM admin_visit_sessions WHERE id='${visit}'`)).rows[0].last_path,'/feed')})
console.log(`${checks} monitor checks passed`)
await db.close()
