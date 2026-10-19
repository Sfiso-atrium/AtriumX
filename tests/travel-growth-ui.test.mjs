import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

const require = createRequire(import.meta.url)
const icons = new Proxy({}, { get: (_, name) => String(name) })
let copyFails = false, copied = '', requested, managed, configured = false
const events = []
const navigator = { clipboard: { writeText: async value => { if (copyFails) throw Error('denied'); copied = value } } }
function load(path, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require: name => mocks[name] || require(name), URL, URLSearchParams, Date, Intl, console, navigator,
      window: { location: { origin: 'https://atriumx.co.za' } }, setTimeout, clearTimeout, setInterval, clearInterval, document: { visibilityState: 'visible' } })
  return exports
}
const utils = load('src/utils/busTravel.ts')
const links = load('src/utils/travelLinks.ts', { './busTravel': utils })
const engagement = {
  recordTravelEvent: async (kind, data) => events.push({ kind, data }),
  requestTravelAlert: async (...args) => { requested = args; return { delivery_ready: configured } },
  manageTravelAlert: async (...args) => { managed = args },
}
const Share = load('src/components/travel/TravelShare.tsx', { 'lucide-react': icons, '../../services/travelEngagement': engagement, '../../utils/travelLinks': links }).default
const Alerts = load('src/components/travel/TravelAlerts.tsx', { 'lucide-react': icons, '../../services/travelEngagement': engagement, '../../utils/busTravel': utils, '../../services/busTravel': { busError: error => error.message } }).default
let view, passed = 0
const json = () => JSON.stringify(view.toJSON())
async function test(name, fn) { await fn(); passed++; console.log('PASS', name) }
await test('WhatsApp sharing opens the selected search; successful copying records a copy event', async () => {
  await act(async () => { view = TestRenderer.create(React.createElement(Share, { filters: { ...utils.emptyBusFilters, from: 'Johannesburg', to: 'Durban' } })) })
  const whatsapp = view.root.findByType('a')
  assert.match(decodeURIComponent(whatsapp.props.href), /from=Johannesburg&to=Durban/)
  assert.equal(whatsapp.props.target, '_blank')
  await act(async () => whatsapp.props.onClick())
  await act(async () => view.root.findByType('button').props.onClick())
  assert.match(copied, /from=Johannesburg/); assert.match(json(), /Link copied/)
  assert.equal(events.map(event => event.kind).join(), 'share_whatsapp,share_copy')
  await act(async () => view.unmount())
})
await test('Clipboard failure offers a selectable link and never records false copying success', async () => {
  copyFails = true; const before = events.length
  await act(async () => { view = TestRenderer.create(React.createElement(Share, { filters: utils.emptyBusFilters })) })
  await act(async () => view.root.findByType('button').props.onClick())
  assert.match(json(), /Copy this link/); assert.doesNotMatch(json(), /Link copied/)
  assert.equal(view.root.findByType('input').props.readOnly, true); assert.equal(events.length, before)
  await act(async () => view.unmount()); copyFails = false
})
await test('Admin sharing remains functional while analytics events are excluded', async () => {
  const before = events.length
  await act(async () => { view = TestRenderer.create(React.createElement(Share, { filters: utils.emptyBusFilters, track: false })) })
  await act(async () => view.root.findByType('a').props.onClick())
  await act(async () => view.root.findByType('button').props.onClick())
  assert.equal(events.length, before)
  await act(async () => view.unmount())
})
await test('Optional route requests are prefilled, require email consent and disclose an unconfigured sender', async () => {
  await act(async () => { view = TestRenderer.create(React.createElement(Alerts, { from: 'Johannesburg', to: 'Durban', date: '' })) })
  assert.equal(view.root.findAllByType('input')[0].props.value, 'Johannesburg')
  assert.equal(view.root.findByProps({ type: 'checkbox' }).props.required, true)
  await act(async () => view.root.findByProps({ type: 'email' }).props.onChange({ target: { value: 'student@example.com' } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.equal(requested.join('|'), 'student@example.com|Johannesburg|Durban|')
  assert.match(json(), /Email delivery is being set up/); assert.doesNotMatch(json(), /account created|Updates are active/)
  assert.equal(view.root.findByProps({ type: 'email' }).props.value, '')
  await act(async () => view.unmount())
})
await test('Configured delivery asks for email confirmation instead of claiming activation', async () => {
  configured = true
  await act(async () => { view = TestRenderer.create(React.createElement(Alerts, { from: 'Johannesburg', to: 'Durban', date: '' })) })
  await act(async () => view.root.findByProps({ type: 'email' }).props.onChange({ target: { value: 'student@example.com' } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.match(json(), /Updates start after confirmation/)
  await act(async () => view.unmount())
})
await test('Email scanners cannot activate or unsubscribe through a page load; a deliberate button works without sign-in', async () => {
  const params = new URLSearchParams('unsubscribe=10000000-0000-4000-8000-000000000001')
  const Manage = load('src/pages/TravelAlertManage.tsx', {
    'react-router-dom': { Link: props => React.createElement('a', props, props.children), useSearchParams: () => [params] },
    '../components/common/Navbar': { default: () => null, __esModule: true }, '../services/travelEngagement': engagement,
  }).default
  managed = null
  await act(async () => { view = TestRenderer.create(React.createElement(Manage)) })
  assert.equal(managed, null); assert.match(json(), /No sign-in needed/)
  await act(async () => view.root.findByType('button').props.onClick())
  assert.equal(managed[0], 'unsubscribe'); assert.match(json(), /have been unsubscribed/)
  await act(async () => view.unmount())
})
await test('Logged-out homepage has a visible bus entry and sends guests directly to Travel', async () => {
  let navigated = ''
  const Entrance = load('src/pages/Entrance.tsx', {
    'lucide-react': icons, 'react-router-dom': { useNavigate: () => path => { navigated = path } },
    '../context/AppContext': { useApp: () => ({ currentUser: null, isLoadingAuth: false, darkMode: false, toggleDarkMode() {} }) },
    '../components/common/LegalFooter': { default: () => null, __esModule: true },
  }).default
  await act(async () => { view = TestRenderer.create(React.createElement(Entrance)) })
  assert.match(json(), /Going home for the holidays/); assert.match(json(), /Browse routes and fares free/)
  const banner = view.root.findAllByType('button').find(node => node.findAllByType('span').some(span => span.children.includes('Going home for the holidays? Find a bus.')))
  assert(banner); await act(async () => banner.props.onClick()); assert.equal(navigated, '/travel'); navigated = ''
  const buses = view.root.findAllByType('button').find(node => node.children.includes(' Buses'))
  assert(buses); await act(async () => buses.props.onClick()); assert.equal(navigated, '/travel')
  await act(async () => view.unmount())
})
console.log(`${passed} travel growth UI checks passed`)
