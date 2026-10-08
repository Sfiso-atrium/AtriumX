import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/businessHours.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Intl, Date })
const { isBusinessOpen: open, isValidHours: valid, summarizeHours: summary } = exports
const hours = { 0: { open: '09:00', close: '17:00' } }
assert.equal(open(null), null)
assert.equal(open(hours, new Date('2026-10-05T06:59:00Z')), false)
assert.equal(open(hours, new Date('2026-10-05T07:00:00Z')), true)
assert.equal(open(hours, new Date('2026-10-05T15:00:00Z')), false)
assert.equal(open(hours, new Date('2026-10-06T08:00:00Z')), false)
const night = { 6: { open: '18:00', close: '02:00' } }
assert.equal(open(night, new Date('2026-10-04T22:30:00Z')), true)
assert.equal(open(night, new Date('2026-10-05T00:00:00Z')), false)
assert.equal(open({}, new Date()), false)
assert.equal(valid({ 0: { open: '09:00', close: '09:00' } }), false)
assert.equal(valid({ 7: { open: '09:00', close: '17:00' } }), false)
assert.equal(valid({ 0: { open: '25:00', close: '17:00' } }), false)
const weekdays = Object.fromEntries([0,1,2,3,4].map(d => [d, hours[0]]))
assert.deepEqual(Array.from(summary(weekdays)), ['Mon–Fri: 09:00–17:00', 'Sat–Sun: Closed'])
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; create table public.business_profiles (id uuid primary key);`)
const migration = fs.readdirSync('supabase/migrations').find(n => n.endsWith('_business_operating_hours.sql'))
await db.exec(fs.readFileSync(`supabase/migrations/${migration}`, 'utf8'))
const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002'
await db.exec(`insert into business_profiles values ('${a}'), ('${b}'); set role authenticated; set request.jwt.claim.sub='${a}';`)
await db.query('insert into business_operating_hours values ($1,$2)',[a,JSON.stringify(hours)])
await assert.rejects(db.query('insert into business_operating_hours values ($1,$2)',[b,JSON.stringify(hours)]))
await assert.rejects(db.query('update business_operating_hours set schedule=$1 where business_id=$2',[JSON.stringify({0:{open:'09:00',close:'09:00'}}),a]))
await db.exec(`set request.jwt.claim.sub='${b}';`)
assert.equal((await db.query('update business_operating_hours set schedule=$1 where business_id=$2 returning *',['{}',a])).rows.length,0)
await db.exec('reset role; set role anon;')
assert.equal((await db.query('select * from business_operating_hours')).rows.length,1)
await assert.rejects(db.query('delete from business_operating_hours'))
await db.close()
console.log('Business hours: time boundaries, overnight/week rollover, summaries, validation, public reads and owner-only writes passed.')
const React = await import('react')
const { default: Renderer, act } = await import('react-test-renderer')
const { createRequire } = await import('node:module')
const require = createRequire(import.meta.url)
const editorExports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/business/BusinessHoursEditor.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText, {exports:editorExports,require:n=>n==='../../utils/businessHours'?exports:require(n)})
let state=null
function Harness(){const [value,setValue]=React.useState(null);state=value;return React.createElement(editorExports.default,{value,onChange:setValue})}
let view
await act(async()=>{view=Renderer.create(React.createElement(Harness))})
assert.equal(view.root.findAllByType('input').length,0)
assert.equal(view.root.findByType('details').props.open,undefined)
await act(async()=>view.root.findByProps({'aria-label':'Day availability'}).props.onChange({target:{value:'open'}}))
assert.equal(state[0].open,'09:00')
await act(async()=>view.root.findByProps({'aria-label':'Closing time'}).props.onChange({target:{value:'18:30'}}))
await act(async()=>view.root.findAllByType('button')[0].props.onClick())
assert.equal(Object.keys(state).length,5)
assert.equal(state[4].close,'18:30')
await act(async()=>view.root.findByProps({'aria-label':'Day'}).props.onChange({target:{value:'5'}}))
assert.equal(view.root.findByProps({'aria-label':'Day availability'}).props.value,'closed')
await act(async()=>view.root.findAllByType('button').at(-1).props.onClick())
assert.equal(state,null)
await act(async()=>view.unmount())
console.log('Compact editor: collapsed default, selectable times, weekday copy and clearing passed.')
