import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

const utils = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/busTravel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: utils, URL, Intl, Date })
const { emptyBusFilters, filterBusListings, placeOptions, placeScore, isBusOutdated, safeBusWebsite, southAfricanToday } = utils
let passed = 0
async function test(name, fn) { await fn(); passed++; console.log('PASS', name) }
const base = {
  id: '1', company_name: 'Company A', website_url: 'https://example.com', origin: 'Johannesburg', destination: 'Durban',
  origin_aliases: ['Joburg'], destination_aliases: ['eThekwini'], boarding_points: ['Park Station, Johannesburg'],
  dropoff_points: ['Durban Station'], price: 350, price_type: 'fixed', journey_type: 'one_way', connection_type: 'direct',
  connection_details: null, departure_time: '22:00:00', arrival_time: '05:30:00', duration_minutes: 450,
  operating_days: [1, 3, 5], travel_date: null, valid_from: null, valid_until: null, information_date: null,
  student_discount: null, baggage_allowance: null, notes: null, is_outdated: false,
  created_at: '2026-10-19T00:00:00Z', updated_at: '2026-10-19T00:00:00Z',
}
const filter = (rows, changes) => filterBusListings(rows, { ...emptyBusFilters, ...changes })
await test('Typos, transpositions, case, punctuation, accents and partial town names match', () => {
  for (const query of ['Johannesbrg', 'Johanensbrug', 'JOHANNESBURG', 'Johann']) assert(Number.isFinite(placeScore(query, 'Johannesburg')), query)
  assert(Number.isFinite(placeScore('Durbna', 'Durban')))
  assert(Number.isFinite(placeScore('elizabth port', 'Port Elizabeth')))
  assert.equal(placeScore('Sao Tome', 'São-Tomé'), 0)
  assert.equal(placeScore('Cape Town', 'Johannesburg'), Infinity)
  assert.equal(placeScore('xyz', 'Durban'), Infinity)
})
await test('Search uses both endpoints together, known aliases and confirmed stops, without reversing routes', () => {
  assert.equal(filter([base], { from: 'Johannesbrg', to: 'Durbna' }).length, 1)
  assert.equal(filter([base], { from: 'Joburg', to: 'eThekwini' }).length, 1)
  assert.equal(filter([base], { from: 'Park Statoin', to: 'Durban Station' }).length, 1)
  assert.equal(filter([base], { from: 'Durban', to: 'Johannesburg' }).length, 0)
  assert.equal(filter([base], { from: 'Cape Town', to: 'Durban' }).length, 0)
  const options = placeOptions([base, base], 'from', 'Johannesbrg')
  assert.equal(options.filter(value => value === 'Johannesburg').length, 1)
})
await test('Price and timetable sorting always puts unknown values last, including descending prices', () => {
  const rows = [{ ...base, id: 'unknown', price: null, duration_minutes: null, departure_time: null }, { ...base, id: 'high', price: 500 }, { ...base, id: 'low', price: 100, duration_minutes: 300, departure_time: '06:00:00' }]
  assert.equal(filter(rows, { sort: 'price_low' }).map(row => row.id).join(), 'low,high,unknown')
  assert.equal(filter(rows, { sort: 'price_high' }).map(row => row.id).join(), 'high,low,unknown')
  assert.equal(filter(rows, { sort: 'duration' }).map(row => row.id).join(), 'low,high,unknown')
  assert.equal(filter(rows, { sort: 'departure' }).map(row => row.id).join(), 'low,high,unknown')
  assert.equal(filter(rows, { maxPrice: '350' }).length, 1)
  assert.equal(filter([{ ...base, price: 0 }], { maxPrice: '0' }).length, 1)
})
await test('Optional company, fare basis, departure, connection and discount filters combine correctly', () => {
  assert.equal(filter([base], { company: 'Company A', journey: 'one_way', departure: 'evening', connection: 'direct' }).length, 1)
  assert.equal(filter([base], { departure: 'morning' }).length, 0)
  assert.equal(filter([{ ...base, departure_time: '00:00:00' }], { departure: 'overnight' }).length, 1)
  assert.equal(filter([base], { journey: 'return' }).length, 0)
  assert.equal(filter([base], { studentDiscount: true }).length, 0)
  assert.equal(filter([{ ...base, student_discount: '10% with student ID' }], { studentDiscount: true }).length, 1)
})
await test('Dates use the supplied timetable, preserve unknown dates and treat expiry as freshness', () => {
  assert.equal(filter([base], { date: '2026-12-07' }).length, 1) // Monday
  assert.equal(filter([base], { date: '2026-12-08' }).length, 0) // Tuesday
  assert.equal(filter([{ ...base, operating_days: [], travel_date: '2026-12-08' }], { date: '2026-12-07' }).length, 0)
  assert.equal(filter([{ ...base, operating_days: [] }], { date: '2026-12-07' }).length, 1)
  assert.equal(filter([{ ...base, valid_until: '2020-01-01' }], {}).length, 1)
})
await test('Outdated markers retain records and only explicit expiry or a past dated departure ages data', () => {
  assert.equal(isBusOutdated({ ...base, valid_until: '2026-10-18' }, '2026-10-19'), true)
  assert.equal(isBusOutdated({ ...base, valid_until: '2026-10-19' }, '2026-10-19'), false)
  assert.equal(isBusOutdated({ ...base, travel_date: '2026-10-18' }, '2026-10-19'), true)
  assert.equal(isBusOutdated({ ...base, is_outdated: true }), true)
  assert.equal(isBusOutdated({ ...base, information_date: '2020-01-01' }), false)
  assert.equal(southAfricanToday(new Date('2026-10-19T22:30:00Z')), '2026-10-20')
})
await test('Company links allow web addresses and reject scripts, relative URLs and embedded credentials', () => {
  assert.equal(safeBusWebsite('https://example.com/book'), 'https://example.com/book')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '/book', 'https://user:password@example.com']) assert.equal(safeBusWebsite(value), null)
})

const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA atriumx_private;
  GRANT USAGE ON SCHEMA auth,atriumx_private TO authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
  CREATE TABLE profiles(id uuid PRIMARY KEY,is_admin boolean DEFAULT false,is_blocked boolean DEFAULT false);
  INSERT INTO profiles VALUES ('10000000-0000-4000-8000-000000000001',true,false),('10000000-0000-4000-8000-000000000002',false,false),('10000000-0000-4000-8000-000000000003',true,true);
  CREATE FUNCTION atriumx_private.workspace_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin AND NOT is_blocked)$$;
  REVOKE ALL ON FUNCTION atriumx_private.workspace_admin() FROM PUBLIC,anon;
  GRANT EXECUTE ON FUNCTION atriumx_private.workspace_admin() TO authenticated;`)
await db.exec(fs.readFileSync('supabase/migrations/20261019205719_free_bus_directory.sql', 'utf8'))
const query = async (sql, params = []) => (await db.query(sql, params)).rows
const root = () => db.exec('RESET ROLE')
const auth = async suffix => { await root(); await query("select set_config('test.uid',$1,false)", [`10000000-0000-4000-8000-00000000000${suffix}`]); await db.exec('SET ROLE authenticated') }
let saved
await test('Admin can publish a minimal company listing without any optional route, fare or timetable fields', async () => {
  await auth(1)
  saved = (await query("insert into bus_listings(company_name,website_url) values ('Test company','https://example.com') returning *"))[0]
  assert.equal(saved.price, null); assert.equal(saved.origin, null); assert.equal(saved.destination, null)
  assert.equal(saved.journey_type, 'unknown'); assert.equal(saved.operating_days.length, 0)
})
await test('Guest can read company data without login and cannot write, update or delete', async () => {
  await root(); await db.exec('SET ROLE anon')
  assert.equal((await query('select * from bus_listings')).length, 1)
  await assert.rejects(() => query("insert into bus_listings(company_name,website_url) values ('Bad','https://example.com')"), /permission denied/)
  await assert.rejects(() => query("update bus_listings set company_name='Bad'"), /permission denied/)
  await assert.rejects(() => query('delete from bus_listings'), /permission denied/)
})
await test('Nonadmin and blocked admin cannot insert or alter existing listings', async () => {
  for (const suffix of [2, 3]) {
    await auth(suffix)
    await assert.rejects(() => query("insert into bus_listings(company_name,website_url) values ('Bad','https://example.com')"), /row-level security/)
    assert.equal((await query("update bus_listings set company_name='Bad' returning *")).length, 0)
    assert.equal((await query('select company_name from bus_listings'))[0].company_name, 'Test company')
  }
})
await test('Admin updates persist optional fields and server timestamps, while old listings remain readable', async () => {
  await auth(1)
  const updated = (await query("update bus_listings set price=250.50, valid_until='2020-01-01', is_outdated=true, boarding_points=ARRAY['Park Station'], updated_at='2000-01-01' where id=$1 returning *", [saved.id]))[0]
  assert.equal(Number(updated.price), 250.5); assert.notEqual(String(updated.updated_at), '2000-01-01')
  await root(); await db.exec('SET ROLE anon'); assert.equal((await query('select * from bus_listings')).length, 1)
})
await test('Database rejects unsafe URLs, negative fares, invalid days and reversed validity dates', async () => {
  await auth(1)
  for (const clause of ["website_url='javascript:alert(1)'", 'price=-1', 'operating_days=ARRAY[8]', "valid_from='2026-12-10',valid_until='2026-12-01'"]) {
    await assert.rejects(() => query(`update bus_listings set ${clause} where id=$1`, [saved.id]), /check constraint/)
  }
})
await root(); await db.close()
console.log(`${passed} bus travel checks passed`)
