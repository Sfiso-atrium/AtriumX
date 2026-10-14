import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import TestRenderer, {act} from 'react-test-renderer'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
let account=null,saves=[]
const api={getPartnerPayfast:async()=>({account,platformEnabled:false,splits:[]}),savePartnerPayfast:async(...args)=>{saves.push(args);account={merchant_id:args[0],account_name:args[1],environment:args[2],status:'pending'}},splitStatusLabel:{}}
const exp={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/partner/PartnerPayfast.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:exp,require:n=>n==='../../services/partnerPayfast'?api:n==='lucide-react'?new Proxy({},{get:(_,k)=>k}):require(n),console,Date})
let view
await act(async()=>{view=TestRenderer.create(React.createElement(exp.default))})
assert.match(JSON.stringify(view.toJSON()),/Account not connected/)
assert.equal(view.root.findByType('a').props.href,'https://my.payfast.io')
assert.match(JSON.stringify(view.toJSON()),/Do not enter your password/)
console.log('PASS Setup starts disconnected, uses official PayFast link, requests no secrets')
await act(async()=>{view.root.findByProps({pattern:'[1-9][0-9]{7}'}).props.onChange({target:{value:'12345678'}});view.root.findByProps({maxLength:160}).props.onChange({target:{value:'Test Account'}})})
await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}})})
assert.deepEqual(saves,[['12345678','Test Account','live']]);assert.match(JSON.stringify(view.toJSON()),/Awaiting account review/);assert.match(JSON.stringify(view.toJSON()),/Withdraw through PayFast/)
console.log('PASS Saving account details requests review rather than falsely claiming connection')
await act(async()=>view.unmount())
console.log('2 partner payout UI checks passed')
