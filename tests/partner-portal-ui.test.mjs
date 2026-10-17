import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import TestRenderer, {act} from 'react-test-renderer'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
let rejectCopy=false, resolvePartner, redirected='', overviewCalls=0
const navigate=path=>{redirected=path}
const context={currentUser:{id:'partner'},isLoadingAuth:false,partner:null}
const mocks={
 '../components/partner/PartnerTasks':{default:()=>null,__esModule:true},
 '../components/partner/PartnerGuide':{default:()=>null,__esModule:true},
 'react-router-dom':{useNavigate:()=>navigate,useSearchParams:()=>[new URLSearchParams('tab=referrals'),()=>{}]},
 'lucide-react':new Proxy({}, {get:(_,k)=>k}),
 '../context/AppContext':{useApp:()=>context},
 '../services/dataService':{getPartnerStatus:()=>new Promise(resolve=>{resolvePartner=resolve})},
 '../services/partnerReferral':{getPartnerOverview:async()=>{overviewCalls++;return {referredCount:2,activityCount:3,activities:[],commissions:[],totals:{pending:0,approved:0,paid:0},terms:null}}},
 '../utils/partnerReferral':{partnerLinks:()=>[{label:'Business listing',url:'https://atriumx.co.za/#/business/post?ref=PARTNER-A'}]},
 '../components/partner/PartnerPayfast':{default:()=>null,__esModule:true},
 '../components/common/Navbar':{default:()=>null,__esModule:true},
 '../components/common/BottomNav':{default:()=>null,__esModule:true}
}
const exp={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/Partnerdashboard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:exp,require:n=>mocks[n]||require(n),navigator:{clipboard:{writeText:async()=>{if(rejectCopy)throw Error('denied')}}},document:{visibilityState:'visible'},setInterval,clearInterval,setTimeout,clearTimeout,console,Date,URLSearchParams})
let view
await act(async()=>{view=TestRenderer.create(React.createElement(exp.default))})
assert.equal(redirected,'');assert.equal(overviewCalls,0)
console.log('PASS Partner is not redirected while membership lookup is pending')
await act(async()=>{resolvePartner({user_id:'partner',referral_code:'PARTNER-A'})})
assert.equal(overviewCalls,1);assert.match(JSON.stringify(view.toJSON()),/No active commission agreement/)
console.log('PASS Portal loads verified records and explicitly shows missing terms')
rejectCopy=true
await act(async()=>{await view.root.findByProps({'aria-label':'Copy business listing link'}).props.onClick()})
assert.match(JSON.stringify(view.toJSON()),/Copy was blocked/);assert.doesNotMatch(JSON.stringify(view.toJSON()),/'Copied'/)
console.log('PASS Clipboard failure shows manual fallback, not false success')
rejectCopy=false
await act(async()=>{await view.root.findByProps({'aria-label':'Copy business listing link'}).props.onClick()})
assert.match(JSON.stringify(view.toJSON()),/Copied/)
console.log('PASS Clipboard success confirms copying')
await act(async()=>view.unmount())
console.log('4 partner portal UI checks passed')
