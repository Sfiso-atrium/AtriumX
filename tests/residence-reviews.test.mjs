import {PGlite} from '@electric-sql/pglite'
import fs from 'node:fs'
const db=new PGlite()
const one='00000000-0000-4000-8000-000000000001',two='00000000-0000-4000-8000-000000000002',owner='00000000-0000-4000-8000-000000000003'
const uni='University of Pretoria'
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE supabase_admin; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,account_type text,is_blocked boolean DEFAULT false);
CREATE TABLE business_profiles(id uuid PRIMARY KEY,accommodation_plan text);
CREATE FUNCTION current_accommodation_plan(id uuid) RETURNS text LANGUAGE sql AS $$SELECT accommodation_plan FROM business_profiles WHERE business_profiles.id=$1$$;
CREATE TABLE accommodation_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),seller_id uuid,title text,universities text[],status text DEFAULT 'active');
CREATE TABLE accommodation_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payload jsonb,status text,claimed_listing_id uuid);
CREATE TABLE accommodation_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),accommodation_listing_id uuid NOT NULL REFERENCES accommodation_listings(id) ON DELETE CASCADE,student_id uuid NOT NULL REFERENCES profiles(id),stars integer CHECK(stars BETWEEN 1 AND 5),comment text,reply text,replied_at timestamptz,created_at timestamptz DEFAULT now(),UNIQUE(accommodation_listing_id,student_id));
CREATE TABLE notifications(user_id uuid NOT NULL,type text,message text);
ALTER TABLE accommodation_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY accommodation_reviews_select_all ON accommodation_reviews FOR SELECT USING(true);
CREATE POLICY accommodation_reviews_insert_student ON accommodation_reviews FOR INSERT TO authenticated WITH CHECK(student_id=auth.uid());
CREATE POLICY accommodation_reviews_update_owner ON accommodation_reviews FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM accommodation_listings WHERE id=accommodation_listing_id AND seller_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE ON accommodation_reviews TO authenticated; GRANT SELECT ON accommodation_reviews TO anon;
GRANT SELECT ON profiles,business_profiles,accommodation_listings TO authenticated;GRANT DELETE ON accommodation_listings TO authenticated;
INSERT INTO profiles VALUES('${one}','Student One','student',false),('${two}','Student Two','student',false),('${owner}','Owner','business',false);
INSERT INTO business_profiles VALUES('${owner}','accommodation_free');
INSERT INTO accommodation_listings(id,seller_id,title,universities) VALUES('${owner}','${owner}','Existing Residence',ARRAY['${uni}']);
INSERT INTO accommodation_reviews(accommodation_listing_id,student_id,stars,comment) VALUES('${owner}','${two}',4,'Existing review');`)
await db.exec(fs.readFileSync(new URL('../supabase/migrations/20260930191614_accommodation_residence_reviews.sql',import.meta.url),'utf8'))
await db.exec(`CREATE TRIGGER notify_on_accommodation_review AFTER INSERT ON accommodation_reviews FOR EACH ROW EXECUTE FUNCTION notify_on_accommodation_review();CREATE TRIGGER enforce_accommodation_review_reply_tier BEFORE UPDATE ON accommodation_reviews FOR EACH ROW EXECUTE FUNCTION enforce_accommodation_review_reply_tier();`)
let n=0
async function check(label,role,actor,sql,expected=true){await db.exec(`BEGIN;SET LOCAL ROLE ${role};SELECT set_config('request.jwt.claim.sub','${actor??''}',true);`);let value;try{value=(await db.query(sql)).rows[0]?.v}catch(e){value='denied'}await db.exec('ROLLBACK');if(value!==expected)throw Error(label+': '+value);console.log('PASS '+label);n++}
await check('Legacy review migrated with name','anon',null,`SELECT reviewer_name='Student Two' AND residence_id IS NOT NULL v FROM accommodation_reviews`)
await check('Guest can read all residence names','anon',null,'SELECT count(*)=1 v FROM accommodation_residences')
await check('Guest cannot post review','anon',null,`SELECT submit_residence_review(null,'New Place','${uni}',5,'Good') v`,'denied')
await check('Business cannot post review','authenticated',owner,`SELECT submit_residence_review(null,'New Place','${uni}',5,'Good') v`,'denied')
await check('Client cannot create arbitrary directory record','authenticated',one,`INSERT INTO accommodation_residences(name,university) VALUES('Fake','Invalid') RETURNING true v`,'denied')
await check('Invalid university denied','authenticated',one,`SELECT submit_residence_review(null,'New Place','Invalid',5,'Good') v`,'denied')
await check('Missing stars denied','authenticated',one,`SELECT submit_residence_review(null,'New Place','${uni}',0,'Good') v`,'denied')
await check('Empty review denied','authenticated',one,`SELECT submit_residence_review(null,'New Place','${uni}',5,' ') v`,'denied')
await db.exec(`SELECT set_config('request.jwt.claim.sub','${one}',false);SELECT submit_residence_review(null,'New Place','${uni}',5,'My own experience');`)
await check('New residence and named review are public','anon',null,`SELECT reviewer_name='Student One' AND comment='My own experience' v FROM accommodation_reviews WHERE student_id='${one}'`)
await check('Duplicate review denied despite case/spacing','authenticated',one,`SELECT submit_residence_review(null,' new   place ','${uni}',2,'Duplicate') v`,'denied')
await check('Spoofed author denied','authenticated',one,`INSERT INTO accommodation_reviews(residence_id,student_id,stars,comment,reviewer_name) SELECT id,'${two}',5,'Spoof','Invented' FROM accommodation_residences WHERE name='New Place' RETURNING true v`,'denied')
await db.exec(`INSERT INTO accommodation_listings(id,seller_id,title,universities) VALUES('${one}','${owner}','new place',ARRAY['${uni}']);`)
await check('Later listing embeds existing review','anon',null,`SELECT accommodation_listing_id='${one}' v FROM accommodation_reviews WHERE student_id='${one}'`)
await check('Owner cannot rewrite rating','authenticated',owner,`UPDATE accommodation_reviews SET stars=1 WHERE accommodation_listing_id='${one}' RETURNING true v`,'denied')
await check('Owner cannot rewrite comment','authenticated',owner,`UPDATE accommodation_reviews SET comment='Changed' WHERE accommodation_listing_id='${one}' RETURNING true v`,'denied')
await check('Free owner cannot reply','authenticated',owner,`UPDATE accommodation_reviews SET reply='Reply' WHERE accommodation_listing_id='${one}' RETURNING true v`,'denied')
await db.exec(`UPDATE business_profiles SET accommodation_plan='accommodation_featured' WHERE id='${owner}';`)
await check('Paid owner can reply','authenticated',owner,`UPDATE accommodation_reviews SET reply='Reply' WHERE accommodation_listing_id='${one}' RETURNING reply='Reply' v`)
await check('Other student cannot reply','authenticated',two,`WITH changed AS (UPDATE accommodation_reviews SET reply='Other' WHERE accommodation_listing_id='${one}' RETURNING id) SELECT count(*)=0 v FROM changed`)
await db.exec(`SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${owner}',false);DELETE FROM accommodation_listings WHERE id='${one}';RESET ROLE;`)
await check('Deleting advertisement preserves review','anon',null,`SELECT accommodation_listing_id IS NULL AND comment='My own experience' v FROM accommodation_reviews WHERE student_id='${one}'`)
await db.exec(`UPDATE profiles SET is_blocked=true WHERE id='${one}';`)
await check('Blocked student cannot post','authenticated',one,`SELECT submit_residence_review(null,'Blocked Place','${uni}',5,'Good') v`,'denied')
console.log(n+' checks passed');await db.close()
