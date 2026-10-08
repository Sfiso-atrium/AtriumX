import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { PGlite } from '@electric-sql/pglite'
const require = createRequire(import.meta.url)
const stored = new Map()
let storageDisabled = false, clipboardFails = false, copiedValue = ''
const localStorage = new Proxy({ getItem: k => stored.get(k) ?? null, setItem: (k,v) => stored.set(k,v), removeItem: k => stored.delete(k) }, { get(target, prop) { if (storageDisabled) throw Error('Storage disabled'); return target[prop] } })
function load(file, mocks = {}) {
  const exports = {}
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { exports, require: name => name in mocks ? mocks[name] : require(name), localStorage, navigator: { clipboard: { writeText: async value => { if (clipboardFails) throw Error('Clipboard denied'); copiedValue = value } } }, window: { location: { origin: 'https://atriumx.co.za', search: '?do-not-copy=this' } }, console, Date, setTimeout, clearTimeout, URLSearchParams })
  return exports
}
const drafts = load('src/utils/businessReviewDraft.ts')
const businessId = '00000000-0000-4000-8000-000000000001', studentId = '00000000-0000-4000-8000-000000000002', otherId = '00000000-0000-4000-8000-000000000003'
let count = 0
function check(name, fn) { fn(); console.log('PASS ' + name); count++ }
check('Invitation URL identifies business without unrelated query parameters', () => assert.equal(drafts.businessReviewLink(businessId), `https://atriumx.co.za/#/business/${businessId}/review`))
drafts.saveReviewDraft(businessId, { stars: 4, comment: 'Good lessons' })
check('Draft survives remount and stays isolated to one business', () => { assert.equal(drafts.readReviewDraft(businessId).comment, 'Good lessons'); assert.equal(drafts.readReviewDraft(otherId).comment, '') })
stored.set('atriumx:business-review:' + otherId, JSON.stringify({ stars: 5, comment: 'Old', savedAt: Date.now() - 90000000 }))
check('Expired drafts are discarded', () => assert.equal(drafts.readReviewDraft(otherId).comment, ''))
storageDisabled = true
check('Disabled storage is handled without throwing', () => { assert.equal(drafts.saveReviewDraft(businessId, { stars: 5, comment: 'x' }), false); assert.equal(drafts.readReviewDraft(businessId).stars, 0) })
storageDisabled = false

let user = null, result = { error: null }, calls = [], navigated = '', next = '', throwSubmit = false, targetId = businessId
const context = { useApp: () => ({ currentUser: user, isLoadingAuth: false, setRedirectAfterLogin: path => { next = path }, redirectAfterLogin: '/unrelated-old-page', setCurrentUser: u => { user = u } }) }
const router = { useParams: () => ({ businessId: targetId }), useNavigate: () => path => { navigated = path }, Link: ({ children, ...props }) => React.createElement('a', props, children) }
const services = {
  getPublicBusinessProfile: async id => ({ id, business_name: 'Campus Tutors', business_type: 'Tutoring', physical_address: 'Campus Road' }),
  submitBusinessReview: async (...args) => { calls.push(args); if (throwSubmit) throw Error('Offline'); return result }
}
const common = { 'lucide-react': new Proxy({}, { get: (_, key) => key }), '../context/AppContext': context, 'react-router-dom': router, '../services/dataService': services, '../components/common/Navbar': { default: () => null, __esModule: true } }
const Page = load('src/pages/BusinessReview.tsx', { ...common, '../utils/businessReviewDraft': drafts, '../components/common/ReviewDialog': { __esModule: true, default: ({ title, children, onClose }) => React.createElement('dialog', { title }, children, React.createElement('button', { onClick: onClose }, 'Close')) } }).default
let view
const mount = async () => { await act(async () => { view = TestRenderer.create(React.createElement(Page)) }) }
const text = () => JSON.stringify(view.toJSON())
const publish = async () => { await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }) }) }
const button = label => view.root.findAllByType('button').find(b => b.children.join('') === label)
await mount()
check('Guest sees prefilled business and restored editable review', () => { assert.match(text(), /Campus Tutors/); assert.equal(view.root.findByType('textarea').props.value, 'Good lessons') })
await publish()
check('Guest publishing opens auth popup without inserting', () => { assert.equal(calls.length, 0); assert.equal(view.root.findByType('dialog').props.title, 'Your voice needs a name') })
await act(async () => button('Create student account').props.onClick())
check('Signup carries return route and saved draft', () => { assert.equal(next, `/business/${businessId}/review`); assert.match(navigated, /mode=register&studentOnly=1&next=/); assert.equal(drafts.readReviewDraft(businessId).comment, 'Good lessons') })
await act(async () => view.unmount())
user = { id: studentId, account_type: 'student', is_blocked: false }
await mount(); throwSubmit = true; await publish()
check('Network failure retains text without success popup', () => { assert.match(text(), /could not confirm publication/); assert.equal(view.root.findAllByType('dialog').length, 0); assert.equal(drafts.readReviewDraft(businessId).comment, 'Good lessons') })
throwSubmit = false; result = { error: 'You have already reviewed this business.' }; await publish()
check('Duplicate review error retains draft', () => { assert.match(text(), /already reviewed/); assert.equal(drafts.readReviewDraft(businessId).stars, 4) })
result = { error: null }; await publish()
check('Publication uses correct business and signed-in student', () => assert.deepEqual(calls.at(-1), [businessId, studentId, 4, 'Good lessons']))
check('Success clears draft and offers feed and residence review', () => { assert.equal(drafts.readReviewDraft(businessId).comment, ''); assert.match(text(), /Your review’s live/); const links = view.root.findAllByType('a').map(x => x.props.to); assert.ok(links.includes('/feed')); assert.ok(links.includes('/accommodations/review')) })
await act(async () => view.unmount())
for (const account of [{ id: businessId, account_type: 'business' }, { id: studentId, account_type: 'student', is_blocked: true }]) {
  user = account; drafts.saveReviewDraft(businessId, { stars: 3, comment: 'An experience' }); await mount(); const before = calls.length; await publish()
  check(`${account.is_blocked ? 'Blocked student' : 'Business account'} cannot publish`, () => { assert.equal(calls.length, before); assert.match(text(), /Only active student accounts/) })
  await act(async () => view.unmount())
}
user = null; await mount(); targetId = otherId
await act(async () => { view.update(React.createElement(Page)) })
check('Following another invitation never mixes review text', () => assert.equal(view.root.findByType('textarea').props.value, ''))
await act(async () => view.unmount())

let params = new URLSearchParams('mode=login&studentOnly=1&next=' + encodeURIComponent(`/business/${businessId}/review`))
const Auth = load('src/pages/StudentAuth.tsx', { ...common, 'react-router-dom': { ...router, useSearchParams: () => [params] }, '../services/dataService': { loginWithEmail: async () => ({ user: { id: studentId, account_type: 'student' }, error: null }) }, '../components/common/LegalFooter': { __esModule: true, default: () => null }, '../data/universities': { SOUTH_AFRICAN_UNIVERSITIES: ['Test University'], UNIVERSITY_ALIASES: {} } }).default
await act(async () => { view = TestRenderer.create(React.createElement(Auth)) })
await act(async () => {
  view.root.findAllByType('input').find(x => x.props.type === 'email').props.onChange({ target: { value: 'student@example.com' } })
  view.root.findAllByType('input').find(x => x.props.type === 'password').props.onChange({ target: { value: 'example-password' } })
})
await act(async () => { await button('Sign In').props.onClick() })
check('Sign-in returns to review instead of stale redirect', () => assert.equal(navigated, `/business/${businessId}/review`))
await act(async () => view.unmount())
params = new URLSearchParams('mode=register&studentOnly=1')
await act(async () => { view = TestRenderer.create(React.createElement(Auth)) })
check('Review signup starts with student university selection', () => { assert.match(text(), /Select your university/); assert.doesNotMatch(text(), /What type of account/) })
await act(async () => view.unmount())

user = { id: businessId, account_type: 'business' }
const Reviews = load('src/components/common/BusinessReviews.tsx', {
  'lucide-react': common['lucide-react'], '../../context/AppContext': context,
  '../../services/dataService': { getBusinessReviews: async () => [], getEffectiveBusinessPlan: () => 'free' },
  '../../utils/businessReviewDraft': drafts, './ReviewReply': { __esModule: true, default: () => null }
}).default
await act(async () => { view = TestRenderer.create(React.createElement(Reviews, { businessId, shareable: true })) })
await act(async () => view.root.findByType('button').props.onClick())
check('Owner can copy a review link even with no reviews and a free plan', () => { assert.equal(copiedValue, drafts.businessReviewLink(businessId)); assert.match(text(), /Copied!/) })
clipboardFails = true
await act(async () => view.root.findByType('button').props.onClick())
check('Clipboard failure exposes selectable review URL', () => assert.equal(view.root.findByType('input').props.value, drafts.businessReviewLink(businessId)))
user = { id: otherId, account_type: 'business' }
await act(async () => view.update(React.createElement(Reviews, { businessId, shareable: true })))
check('Copy invitation control is owner-only', () => assert.equal(view.root.findAllByType('button').length, 0))
await act(async () => view.unmount())

const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, account_type text, is_blocked boolean DEFAULT false);
CREATE VIEW public.profiles_public AS SELECT id,account_type FROM public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE TABLE public.business_reviews(id uuid DEFAULT gen_random_uuid(), business_id uuid REFERENCES profiles(id), student_id uuid REFERENCES profiles(id), stars integer CHECK(stars BETWEEN 1 AND 5), comment text, reply text, replied_at timestamptz, UNIQUE(business_id,student_id));
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_reviews_insert_student ON public.business_reviews FOR INSERT TO authenticated WITH CHECK(auth.uid()=student_id);
CREATE POLICY business_reviews_select_all ON public.business_reviews FOR SELECT USING(true);
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT SELECT ON profiles,profiles_public,business_reviews TO authenticated,anon;
GRANT INSERT ON business_reviews TO authenticated;
INSERT INTO profiles VALUES('${businessId}','business',false),('${studentId}','student',false),('${otherId}','business',false);`)
await db.exec(fs.readFileSync('supabase/migrations/20261008012734_student_business_review_invites.sql', 'utf8'))
async function insert(name, role, actor, author, target, allowed, extra = '') {
  await db.exec(`BEGIN;SET LOCAL ROLE ${role};SELECT set_config('request.jwt.claim.sub','${actor}',true)`)
  let success = false
  try { await db.exec(`INSERT INTO business_reviews(business_id,student_id,stars,comment${extra ? ',reply' : ''}) VALUES('${target}','${author}',5,'Good experience'${extra ? ",'Spoofed reply'" : ''})`); success = true } catch { /* Expected policy or uniqueness rejection. */ }
  await db.exec('ROLLBACK')
  check(name, () => assert.equal(success, allowed))
}
await insert('RLS permits active student', 'authenticated', studentId, studentId, businessId, true)
await insert('RLS rejects anonymous publication', 'anon', '', studentId, businessId, false)
await insert('RLS rejects business reviewing another business', 'authenticated', otherId, otherId, businessId, false)
await insert('RLS rejects self-review', 'authenticated', businessId, businessId, businessId, false)
await insert('RLS rejects impersonation', 'authenticated', studentId, otherId, businessId, false)
await insert('RLS rejects student as target business', 'authenticated', studentId, studentId, studentId, false)
await insert('RLS rejects forged business reply on insert', 'authenticated', studentId, studentId, businessId, false, 'reply')
await db.exec(`UPDATE profiles SET is_blocked=true WHERE id='${studentId}'`)
await insert('RLS rejects blocked student', 'authenticated', studentId, studentId, businessId, false)
await db.exec(`UPDATE profiles SET is_blocked=false WHERE id='${studentId}'; INSERT INTO business_reviews(business_id,student_id,stars,comment) VALUES('${businessId}','${studentId}',5,'Existing review')`)
await insert('Uniqueness prevents repeat publication', 'authenticated', studentId, studentId, businessId, false)
await db.exec('SET ROLE anon')
const rows = await db.query('SELECT count(*)::int AS n FROM business_reviews')
check('Published reviews remain publicly readable', () => assert.equal(rows.rows[0].n, 1))
await db.close()
console.log(`${count} checks passed`)
