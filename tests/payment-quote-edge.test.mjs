import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {createHash} from 'node:crypto'
let payment,activationCalls=0,handler
const user={id:'owner',email:'owner@example.invalid'}
const supabase={auth:{getUser:async()=>({data:{user}})},from(table){let updating=false,filters={};return {select(){return this},eq(k,v){filters[k]=v;return this},is(){return this},update(){updating=true;return this},async single(){return {data:{full_name:'Test Owner',email:user.email,account_type:'business'}}},async maybeSingle(){if(table==='business_profiles')return {data:{is_accommodation:false}};if(table==='payments')return {data:filters.id===payment.id&&(!filters.user_id||filters.user_id===user.id)?(updating?{id:payment.id}:payment):null};return {data:null}}}},rpc:async name=>{if(name==='prepare_plan_payment')return {data:payment};activationCalls++;return {data:[]}}}
const code=ts.transpileModule(fs.readFileSync('supabase/functions/payfast-create-payment/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(code,{exports:{},require:id=>id==='node:crypto'?{createHash}: {createClient:()=>supabase},Deno:{env:{get:k=>({PAYFAST_MERCHANT_ID:'test',PAYFAST_MERCHANT_KEY:'test',SITE_URL:'https://example.invalid'})[k]||'test'},serve:fn=>{handler=fn}},Response,Request,console,Date,JSON,Number,Math,Object,encodeURIComponent})
function reset(){payment={id:'quote-1',user_id:'owner',m_payment_id:'checkout-1',plan_key:'campus_partner',pricing_version:1,status:'pending',quote_expires_at:new Date(Date.now()+900000).toISOString(),list_price:349,credit_amount:99.5,amount:249.5,plan_days:30,bonus_seconds:0,intent:'upgrade'};activationCalls=0}
async function call(body){const response=await handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}}
let count=0;async function test(label,fn){reset();await fn();console.log('PASS',label);count++}
await test('Quote returns authoritative credit without gateway signature',async()=>{const r=await call({planKey:'campus_partner',mode:'quote',amount:1,credit:348});assert.equal(r.body.quote.amountDue,249.5);assert.equal(r.body.fields,undefined)})
await test('Checkout signs the stored discounted amount',async()=>{const r=await call({planKey:'campus_partner',mode:'checkout',paymentId:'quote-1',amount:1});assert.equal(r.body.fields.amount,'249.50');assert.equal(r.body.fields.m_payment_id,'checkout-1');assert.ok(r.body.fields.signature)})
await test('Unknown quote is rejected',async()=>{assert.equal((await call({planKey:'campus_partner',paymentId:'other'})).status,400)})
await test('Expired quote is not sent to gateway',async()=>{payment.quote_expires_at=new Date(Date.now()-1).toISOString();const r=await call({planKey:'campus_partner',paymentId:payment.id});assert.equal(r.status,400);assert.equal(r.body.fields,undefined)})
await test('Credit-only purchase needs no gateway charge',async()=>{payment.amount=0;const r=await call({planKey:'campus_partner',paymentId:payment.id});assert.equal(r.body.completed,true);assert.equal(activationCalls,1);assert.equal(r.body.fields,undefined)})
await test('Quote preview never activates even when amount due is zero',async()=>{payment.amount=0;await call({planKey:'campus_partner',mode:'quote'});assert.equal(activationCalls,0)})
console.log(`${count} edge-function checks passed`)
