import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
const require = createRequire(import.meta.url)
let count = 0, storageDisabled = false, clipboardFails = false, copied = ''
const stored = new Map()
const localStorage = new Proxy({ getItem: k => stored.get(k) ?? null, setItem: (k,v) => stored.set(k,v), removeItem: k => stored.delete(k) }, { get(t,p) { if (storageDisabled) throw Error('Storage disabled'); return t[p] } })
function load(file, mocks = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), localStorage, window: { location: { origin: 'https://atriumx.co.za' } }, navigator: { clipboard: { writeText: async value => { if (clipboardFails) throw Error('Denied'); copied = value } } }, console, Date, Error, setTimeout, clearTimeout })
  return exports
}
const check = (name, fn) => { fn(); console.log('PASS ' + name); count++ }
const drafts = load('src/utils/accommodationReviewDraft.ts')
const listing = '00000000-0000-4000-8000-000000000001', residence = '00000000-0000-4000-8000-000000000002', second = '00000000-0000-4000-8000-000000000003'
const key = `listing:${listing}`, university = 'Rhodes University'
const row = { id: residence, listing_id: listing, name: 'Campus House', university }
const sample = { residenceId: residence, name: row.name, university, stars: 4, comment: 'Helpful staff and quiet rooms' }
check('Accommodation link identifies one property', () => assert.equal(drafts.accommodationReviewLink(listing), `https://atriumx.co.za/#/accommodations/review?listing=${listing}`))
drafts.saveAccommodationDraft(key, sample)
check('Drafts persist and remain isolated by property', () => { assert.equal(drafts.readAccommodationDraft(key).comment, sample.comment); assert.equal(drafts.readAccommodationDraft(`listing:${second}`).comment, '') })
stored.set('atriumx:accommodation-review:old', JSON.stringify({ ...sample, savedAt: Date.now()-90000000 }))
check('Expired drafts are removed', () => assert.equal(drafts.readAccommodationDraft('old').comment, ''))
storageDisabled = true
check('Storage failure is handled', () => assert.equal(drafts.saveAccommodationDraft(key,sample), false))
storageDisabled = false
let user = null, params = new URLSearchParams(`listing=${listing}`), navigated = '', next = '', failPost = '', missing = false, calls = [], release = null, holdPost = false
const context = { useApp: () => ({ currentUser: user, isLoadingAuth: false, setRedirectAfterLogin: p => { next=p } }) }
const router = { useSearchParams: () => [params], useNavigate: () => p => { navigated=p }, Link: ({children,...props}) => React.createElement('a', props, children) }
const common = { 'lucide-react': new Proxy({}, { get: (_,k) => k }), 'react-router-dom': router, '../context/AppContext': context, '../components/common/Navbar': { __esModule:true, default: () => null } }
const residenceService = {
  getResidences: async () => [row], getResidence: async () => missing ? null : row,
  getResidenceForListing: async id => missing ? null : id === listing ? row : { ...row, id: second, listing_id: second, name: 'Second House' },
  postResidenceReview: async input => { calls.push(input); if (failPost) throw Error(failPost); if (holdPost) await new Promise(resolve => { release=resolve }); return residence }
}
const Page = load('src/pages/AccommodationReview.tsx', { ...common, '../services/residenceReviews': residenceService, '../utils/accommodationReviewDraft': drafts, '../data/universities': { SOUTH_AFRICAN_UNIVERSITIES: [university] }, '../components/common/ReviewDialog': { __esModule:true, default: ({title,children,onClose}) => React.createElement('dialog', {title}, children, React.createElement('button',{onClick:onClose},'Close')) } }).default
let view
const mount = async () => { await act(async () => { view=TestRenderer.create(React.createElement(Page)) }) }
const unmount = async () => { await act(async () => view.unmount()) }
const text = () => JSON.stringify(view.toJSON())
const button = label => view.root.findAllByType('button').find(b => b.children.join('') === label)
const publish = async () => { await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} })) }
await mount()
check('Guest gets prefilled accommodation and editable draft before login', () => { assert.match(text(), /Campus House/); assert.equal(view.root.findByType('textarea').props.value,sample.comment); assert.equal(view.root.findAllByType('select').length,0) })
await publish()
check('Guest publication opens account popup without posting', () => { assert.equal(calls.length,0); assert.equal(view.root.findByType('dialog').props.title,'Your voice needs a name') })
await act(async () => button('Create student account').props.onClick())
check('Signup retains the accommodation return URL and draft', () => { assert.equal(next,`/accommodations/review?listing=${listing}`); assert.match(navigated,/mode=register&studentOnly=1&next=/); assert.equal(drafts.readAccommodationDraft(key).comment,sample.comment) })
await act(async () => button('Sign in').props.onClick())
check('Sign-in uses the same preserved return URL', () => assert.match(navigated,/mode=login&studentOnly=1&next=/))
storageDisabled=true; navigated=''; await act(async () => button('Sign in').props.onClick())
check('Blocked storage cannot silently discard draft on navigation', () => { assert.equal(navigated,''); assert.match(text(),/Enable site storage/) })
storageDisabled=false; await unmount()
user={ id:second, account_type:'student', university, is_blocked:false }; await mount()
check('Student returning from authentication gets the draft back', () => assert.equal(view.root.findByType('textarea').props.value,sample.comment))
failPost='Connection interrupted'; await publish()
check('Failed publication keeps draft and does not show success', () => { assert.match(text(),/Connection interrupted/); assert.equal(view.root.findAllByType('dialog').length,0); assert.equal(drafts.readAccommodationDraft(key).comment,sample.comment) })
failPost='You have already reviewed this residence.'; await publish()
check('Duplicate review retains draft and explains rejection', () => { assert.match(text(),/already reviewed/); assert.equal(drafts.readAccommodationDraft(key).stars,4) })
failPost=''; holdPost=true
await act(async () => {
  const send=view.root.findByType('form').props.onSubmit
  const before=calls.length
  const first=send({preventDefault(){}}), repeated=send({preventDefault(){}})
  check('Repeated publish clicks create one submission', () => assert.equal(calls.length,before+1))
  release(); await Promise.all([first,repeated])
})
holdPost=false
check('Publication remains attached to the selected residence', () => { assert.equal(calls.at(-1).residenceId,residence); assert.equal(calls.at(-1).comment,sample.comment) })
check('Success clears draft and offers feed plus nearby businesses only', () => {
  assert.equal(drafts.readAccommodationDraft(key).comment,'')
  const dialog=view.root.findByType('dialog'), links=dialog.findAllByType('a').map(a=>a.props.to)
  assert.deepEqual(links,['/feed','/businesses/review']); assert.doesNotMatch(text(),/Review my residence/)
})
await unmount()
for (const account of [{ id:listing,account_type:'business' }, { id:second,account_type:'student',is_blocked:true }]) {
  user=account; drafts.saveAccommodationDraft(key,sample); await mount(); const before=calls.length; await publish()
  check(`${account.is_blocked?'Blocked student':'Business account'} cannot publish accommodation review`, () => { assert.equal(calls.length,before); assert.match(text(),/Only active student accounts/) })
  await unmount()
}
user=null; await mount(); params=new URLSearchParams(`listing=${second}`)
await act(async () => view.update(React.createElement(Page)))
check('Switching accommodation links never mixes drafts', () => { assert.equal(view.root.findByType('textarea').props.value,''); assert.match(text(),/Second House/) })
await unmount(); missing=true; await mount()
check('Unknown accommodation blocks submission instead of reviewing wrong property', () => { assert.equal(view.root.findAllByType('form').length,0); assert.match(text(),/couldn’t find/) })
await unmount(); missing=false; params=new URLSearchParams(`residence=${residence}`); await mount()
check('Existing residence review links still prefill correctly', () => assert.match(text(),/Campus House/))
await unmount(); params=new URLSearchParams(); await mount()
await act(async () => { view.root.findByType('input').props.onChange({target:{value:'Campus'}}) })
check('General review form retains residence suggestions for guests', () => assert.match(text(),/Choose the correct match/))
await unmount()

const Copy = load('src/components/common/AccommodationReviewLink.tsx', { 'lucide-react':common['lucide-react'], '../../utils/accommodationReviewDraft':drafts }).default
await act(async () => { view=TestRenderer.create(React.createElement(Copy,{listingId:listing,title:row.name})) })
await act(async () => view.root.findByType('button').props.onClick())
check('Owner copies the accommodation-specific review link', () => assert.equal(copied,drafts.accommodationReviewLink(listing)))
clipboardFails=true; await act(async () => view.root.findByType('button').props.onClick())
check('Clipboard denial displays a selectable URL', () => assert.equal(view.root.findByType('input').props.value,drafts.accommodationReviewLink(listing)))
await unmount()

user={id:second,account_type:'student',university}; let requestedUniversity='', directoryError=false
const Directory=load('src/pages/BusinessReviewDirectory.tsx',{ ...common,'../utils/businessReviewDraft':{businessReviewPath:id=>`/business/${id}/review`},'../services/dataService':{
 getBusinessListings:async (student,uni)=>{requestedUniversity=uni; if(directoryError)throw Error('Offline'); return [{seller_id:listing},{seller_id:listing},{seller_id:second}]},
 getPublicBusinessProfile:async id=>({id,business_name:id===listing?'Campus Tutors':'Local Cafe',business_type:id===listing?'Tutoring':'Food'})
}}).default
await act(async()=>{view=TestRenderer.create(React.createElement(Directory))})
check('Nearby business picker uses student university and deduplicates businesses',()=>{assert.equal(requestedUniversity,university);assert.equal(view.root.findAllByType('article').length,2)})
check('Business picker leads to the correct prefilled business review form',()=>assert.ok(view.root.findAllByType('a').some(a=>a.props.to===`/business/${listing}/review`)))
await act(async()=>view.root.findByType('input').props.onChange({target:{value:'tutoring'}}))
check('Students can search businesses by type',()=>{assert.match(text(),/Campus Tutors/);assert.doesNotMatch(text(),/Local Cafe/)})
await unmount();directoryError=true
await act(async()=>{view=TestRenderer.create(React.createElement(Directory))})
check('Business picker distinguishes load failure from empty results',()=>assert.match(text(),/Could not load businesses/))
await unmount()
console.log(`${count} checks passed`)
