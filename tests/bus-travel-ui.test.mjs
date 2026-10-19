import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

const require = createRequire(import.meta.url)
function load(path, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020,
  } }).outputText, { exports, require: name => mocks[name] || require(name), console, URL, Intl, Date, URLSearchParams,
    requestAnimationFrame: callback => callback(), setTimeout, clearTimeout })
  return exports
}
const utils = load('src/utils/busTravel.ts')
const engagement = { recordTravelEvent: async () => {} }
const params = new URLSearchParams()
const icons = new Proxy({}, { get: (_, name) => String(name) })
const card = load('src/components/travel/BusCard.tsx', { 'lucide-react': icons, '../../utils/busTravel': utils, '../../services/travelEngagement': engagement, './TravelShare': { default: () => null, __esModule: true } }).default
const place = load('src/components/travel/PlaceSearch.tsx', { 'lucide-react': icons, '../../utils/busTravel': utils }).default
const base = {
  id: 'a', company_name: 'Company A', website_url: 'https://example.com/a', origin: 'Johannesburg', destination: 'Durban',
  origin_aliases: [], destination_aliases: [], boarding_points: ['Park Station'], dropoff_points: [], price: 250,
  price_type: 'fixed', journey_type: 'unknown', connection_type: 'unknown', connection_details: null,
  departure_time: null, arrival_time: null, duration_minutes: null, operating_days: [], travel_date: null,
  valid_from: null, valid_until: '2020-01-01', information_date: null, student_discount: null, baggage_allowance: null,
  notes: null, is_outdated: false, created_at: '2026-10-19T00:00:00Z', updated_at: '2026-10-19T00:00:00Z',
}
const unknown = { ...base, id: 'b', company_name: 'Company B', origin: null, destination: null, boarding_points: [], price: null, valid_until: null }
const context = { currentUser: null }
let rows = [base, unknown], fail = false, calls = 0, savedInput
const service = {
  getBusListings: async () => { calls++; if (fail) throw Error('offline'); return rows },
  saveBusListing: async (input, id) => { savedInput = input; return { ...base, ...input, id: id || 'new' } },
  busError: error => error.message,
}
const Travel = load('src/pages/Travel.tsx', {
  'lucide-react': icons, 'react-router-dom': { Link: props => React.createElement('a', props, props.children), useSearchParams: () => [params, () => {}] },
  '../components/common/Navbar': { default: () => null, __esModule: true },
  '../utils/travelLinks': load('src/utils/travelLinks.ts', { './busTravel': utils }),
  '../services/travelEngagement': engagement,
  '../components/travel/TravelShare': { default: () => null, __esModule: true },
  '../components/travel/TravelAlerts': { default: () => null, __esModule: true },
  '../components/travel/BusCard': { default: card, __esModule: true },
  '../components/travel/PlaceSearch': { default: place, __esModule: true },
  '../context/AppContext': { useApp: () => context }, '../services/busTravel': service, '../utils/busTravel': utils,
}).default
const Admin = load('src/components/admin/BusListingsAdmin.tsx', {
  'lucide-react': icons, '../../services/busTravel': service, '../../utils/busTravel': utils, './TravelEngagementAdmin': { default: () => null, __esModule: true },
}).default
let view, passed = 0
const json = () => JSON.stringify(view.toJSON())
const cards = () => view.root.findAllByType('article').map(node => node.findByType('h2').children.join('')).join(',')
const button = label => view.root.findAllByType('button').find(node => node.children.join('') === label)
async function test(name, fn) { await fn(); passed++; console.log('PASS', name) }
await test('Guest directory loads immediately, shows incomplete listings and links to the companies', async () => {
  await act(async () => { view = TestRenderer.create(React.createElement(Travel)) })
  assert.equal(calls, 1); assert.match(json(), /Company A/); assert.match(json(), /Company B/)
  assert.match(json(), /Check fare with company/); assert.match(json(), /Outdated information/)
  assert.match(json(), /This information is outdated/); assert.doesNotMatch(json(), /Choose a university|Sign in to/)
  const links = view.root.findAllByType('a').filter(node => node.props.href === base.website_url)
  assert(links.length >= 2); assert(links.every(node => node.props.target === '_blank' && node.props.rel.includes('noopener')))
})
await test('Typing a misspelled city finds its route and clearly shows the matching place', async () => {
  const origin = view.root.findAllByType('input').find(node => node.props.role === 'combobox')
  await act(async () => origin.props.onChange({ target: { value: 'Johannesbrg' } }))
  assert.match(json(), /From.*matched/); assert.match(json(), /Johannesburg/)
  assert.equal(cards(), 'Company A')
  assert.equal(view.root.findAllByProps({ role: 'option' }).length, 1)
})
await test('Place dropdown supports keyboard selection, swapping and clearing filters', async () => {
  let origin = view.root.findAllByType('input').find(node => node.props.role === 'combobox')
  await act(async () => origin.props.onKeyDown({ key: 'ArrowDown', preventDefault() {} }))
  origin = view.root.findAllByType('input').find(node => node.props.role === 'combobox')
  assert(origin.props['aria-activedescendant'])
  await act(async () => origin.props.onKeyDown({ key: 'Enter', preventDefault() {} }))
  assert.equal(view.root.findAllByType('input').find(node => node.props.role === 'combobox').props.value, 'Johannesburg')
  await act(async () => view.root.findByProps({ 'aria-label': 'Swap departure and destination' }).props.onClick())
  const places = view.root.findAllByType('input').filter(node => node.props.role === 'combobox')
  assert.equal(places[0].props.value, ''); assert.equal(places[1].props.value, 'Johannesburg')
  assert.match(json(), /No listed routes match/)
  await act(async () => button('Clear filters').props.onClick())
  assert.match(json(), /Company B/)
})
await test('Missing dates remain discoverable and absent fares are not treated as zero-priced options', async () => {
  await act(async () => view.root.findByProps({ type: 'date' }).props.onChange({ target: { value: '2026-12-10' } }))
  assert.match(json(), /Company B/)
  await act(async () => view.root.findByProps({ type: 'number' }).props.onChange({ target: { value: '300' } }))
  assert.equal(cards(), 'Company A')
  await act(async () => view.unmount())
})
await test('Network failure shows a retry instead of a false empty directory; a retry recovers', async () => {
  fail = true
  await act(async () => { view = TestRenderer.create(React.createElement(Travel)) })
  assert.match(json(), /could not load/); assert.doesNotMatch(json(), /Bus routes are on their way/)
  fail = false
  await act(async () => button('Try again').props.onClick())
  assert.match(json(), /Company A/)
  await act(async () => view.unmount())
})
await test('Empty directory asks for no account and contains no fabricated companies or prices', async () => {
  rows = []
  await act(async () => { view = TestRenderer.create(React.createElement(Travel)) })
  assert.match(json(), /Bus routes are on their way/); assert.doesNotMatch(json(), /Company A|Company B/)
  await act(async () => view.unmount())
})
await test('Admin can save just a company and website with every other field empty', async () => {
  await act(async () => { view = TestRenderer.create(React.createElement(Admin)) })
  const add = view.root.findAllByType('button').find(node => node.children.includes(' Add bus listing'))
  await act(async () => add.props.onClick())
  assert.equal(view.root.findAllByType('input').filter(node => node.props.required).length, 2)
  const labels = view.root.findAllByType('label')
  const company = labels.find(node => node.children[0] === 'Bus company').findByType('input')
  const website = labels.find(node => node.children[0] === 'Company website').findByType('input')
  await act(async () => company.props.onChange({ target: { value: 'New company' } }))
  await act(async () => website.props.onChange({ target: { value: 'https://example.com/new' } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.equal(savedInput.company_name, 'New company'); assert.equal(savedInput.price, null)
  assert.equal(savedInput.origin, null); assert.equal(savedInput.travel_date, null)
  assert.equal(savedInput.operating_days.length, 0); assert.equal(savedInput.journey_type, 'unknown')
  assert.match(json(), /Bus listing saved/)
  await act(async () => view.unmount())
})
await test('Admin can edit and preserve an outdated listing without replacing unknown details', async () => {
  rows = [base]
  await act(async () => { view = TestRenderer.create(React.createElement(Admin)) })
  await act(async () => view.root.findByProps({ 'aria-label': 'Edit Company A from Johannesburg to Durban' }).props.onClick())
  const outdated = view.root.findAllByType('label').find(node => node.children.includes(' Mark information as outdated')).findByType('input')
  await act(async () => outdated.props.onChange({ target: { checked: true } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.equal(savedInput.is_outdated, true); assert.equal(savedInput.valid_until, '2020-01-01')
  assert.equal(savedInput.departure_time, null)
  await act(async () => view.unmount())
})
await test('The existing side menu exposes Travel to guests and students without changing their other links', async () => {
  let destination = ''
  Object.assign(context, { partner: null, darkMode: false, toggleDarkMode() {}, businessProfile: null })
  const Navbar = load('src/components/common/Navbar.tsx', {
    'lucide-react': icons,
    'react-router-dom': { useNavigate: () => path => { destination = path }, useLocation: () => ({ pathname: '/travel', search: '' }) },
    '../../context/AppContext': { useApp: () => context },
    './NotificationBell': { default: () => null, __esModule: true },
    '../../services/push': { pushSupported: () => false },
    '../../services/dataService': { getEffectiveBusinessPlan: () => 'ghost', PLAN_TIERS: { ghost: { maxUniversities: 1 } } },
  }).default
  for (const user of [null, { id: 'student', account_type: 'student', avatar_initials: 'S' }]) {
    context.currentUser = user
    await act(async () => { view = TestRenderer.create(React.createElement(Navbar)) })
    assert.equal(view.root.findAllByType('Bus').length, 1)
    const travel = view.root.findAllByType('button').find(node => node.children.includes(' Travel · Buses'))
    await act(async () => travel.props.onClick())
    assert.equal(destination, '/travel')
    await act(async () => view.unmount())
  }
})
await test('Directory service reads all API pages and never requires a session', async () => {
  const ranges = []
  const fake = { from: table => {
    assert.equal(table, 'bus_listings')
    const builder = { select: () => builder, order: () => builder, range: async (start, end) => {
      ranges.push([start, end]); return { data: start === 0 ? new Array(500).fill(base) : [unknown], error: null }
    } }
    return builder
  } }
  const actualService = load('src/services/busTravel.ts', { './supabaseClient': { supabase: fake }, '../utils/busTravel': utils })
  assert.equal((await actualService.getBusListings()).length, 501)
  assert.deepEqual(ranges, [[0, 499], [500, 999]])
})
console.log(`${passed} bus travel UI checks passed`)
