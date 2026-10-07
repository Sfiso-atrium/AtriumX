import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {createHash} from 'node:crypto'
let handler,updates=0,activations=0,provider='VALID',payment
const supabase={from(){return {select(){return this},eq(){return this},single:async()=>({data:payment}),update(){updates++;return this}}},rpc:async()=>{activations++;return {error:null}}}
const code=ts.transpileModule(fs.readFileSync('supabase/functions/payfast-itn/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(code,{exports:{},require:id=>id==='node:crypto'?{createHash}:{createClient:()=>supabase},Deno:{env:{get:k=>k==='PAYFAST_PASSPHRASE'?'':'test'},serve:fn=>handler=fn},fetch:async()=>({text:async()=>provider}),Response,Request,URLSearchParams,console:{error(){}},Number,Math,Object,encodeURIComponent})
function body(amount='249.50',valid=true){const p=new URLSearchParams({m_payment_id:'quote',payment_status:'COMPLETE',amount_gross:amount,pf_payment_id:'gateway'});p.set('signature',valid?createHash('md5').update(p.toString()).digest('hex'):'invalid');return p.toString()}
async function call(raw){return handler(new Request('https://example.invalid',{method:'POST',body:raw}))}
let count=0;async function test(name,fn){updates=0;activations=0;provider='VALID';payment={id:'id',amount:249.5,status:'pending'};await fn();console.log('PASS',name);count++}
await test('Valid discounted callback invokes atomic activation',async()=>{assert.equal((await call(body())).status,200);assert.equal(activations,1)})
await test('Forged signature cannot overwrite pending payment',async()=>{await call(body('249.50',false));assert.equal(updates,0);assert.equal(activations,0)})
await test('Non-finite gateway amount cannot activate',async()=>{await call(body('NaN'));assert.equal(updates,0);assert.equal(activations,0)})
await test('Temporary provider verification failure permits retry',async()=>{provider='INVALID';assert.equal((await call(body())).status,503);assert.equal(updates,0);assert.equal(activations,0)})
await test('Review-required payment is not granted on repeated callback',async()=>{payment.status='review_required';await call(body());assert.equal(activations,0)})
console.log(`${count} callback checks passed`)
