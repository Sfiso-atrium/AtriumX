// Run against a local Vite server with VITE_SUPABASE_URL=https://partner-preview.supabase.co
// and a dummy anon key. Every API request is intercepted; no production data is used.
// Optional browser packages: playwright-core and @sparticuz/chromium.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {spawn} from 'node:child_process'
const require=createRequire(import.meta.url)
const modules=process.env.PARTNER_UI_BROWSER_MODULES
const {chromium}=require(modules?`${modules}/playwright-core`:'playwright-core')
const binary=require(modules?`${modules}/@sparticuz/chromium`:'@sparticuz/chromium')
const browser=await chromium.launch({headless:true,executablePath:await binary.executablePath(),args:binary.args})
const base=process.env.PARTNER_UI_URL||'http://127.0.0.1:5178'
let server
if(!process.env.PARTNER_UI_URL){
 server=spawn(process.execPath,['node_modules/.bin/vite','--host','127.0.0.1','--port','5178','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://partner-preview.supabase.co',VITE_SUPABASE_ANON_KEY:'preview-only'},stdio:['ignore','pipe','pipe']})
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview server timed out')),15000);server.stdout.on('data',chunk=>{if(chunk.toString().includes('http://127.0.0.1:5178')){clearTimeout(timer);resolve()}});server.on('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited: ${code}`))})})
}

const shots=process.env.PARTNER_UI_SCREENSHOTS||'/tmp/partner-workspace-ui';fs.mkdirSync(shots,{recursive:true})
const uid='10000000-0000-4000-8000-000000000001',adminId='10000000-0000-4000-8000-000000000003'
const profileBase={id:uid,email:'partner@example.com',full_name:'Naledi Partner',account_type:'partner',is_admin:false,is_blocked:false,plan:'ghost',avatar_initials:'NP',avatar_color:'#1A5F7A',university:null,residence:null,watched_residences:[],created_at:'2026-10-16T12:00:00Z'}
const partner={user_id:uid,referral_code:'ax-demo',created_at:'2026-10-16T12:00:00Z'}
const contact={id:'40000000-0000-4000-8000-000000000001',partner_id:uid,name:'Campus Tutoring',kind:'tutor',phone:'+27821234567',email:'hello@example.com',universities:['Rhodes University','University of Johannesburg'],revision:1}
let task={id:'50000000-0000-4000-8000-000000000001',partner_id:uid,contact_id:contact.id,title:'Introduce AtriumX to Campus Tutoring',steps:[{label:'Explain how their listing helps students find them',done:false},{label:'Share the tutoring listing link',done:false}],revision:1}
const messages=[{id:1,content:'Welcome! Your first contact is ready in your tasks.',from_admin:true,sender_name:'Admin',sent_at:'2026-10-16T12:00:00Z'}]
function session(profile){const b=s=>Buffer.from(JSON.stringify(s)).toString('base64url');return {access_token:`${b({alg:'HS256',typ:'JWT'})}.${b({sub:profile.id,role:'authenticated',exp:2000000000})}.signature`,refresh_token:'mock',expires_at:2000000000,expires_in:3600,token_type:'bearer',user:{id:profile.id,email:profile.email,aud:'authenticated',role:'authenticated',user_metadata:{full_name:profile.full_name},app_metadata:{provider:'email'}}}}
async function pageFor(role,width=390){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'})
 const profile=role==='admin'?{...profileBase,id:adminId,is_admin:true,account_type:'student',full_name:'Site Administrator'}:profileBase
 if(role!=='guest')await context.addInitScript(session=>localStorage.setItem('atriumx-auth',JSON.stringify(session)),session(profile))
 await context.routeWebSocket('**',ws=>ws.close())
 await context.route('https://partner-preview.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').pop();let body={};try{body=req.postDataJSON()||{}}catch{}
 let data=[]
 if(url.pathname.includes('/auth/'))data=session(profile).user
 if(name==='signup'){assert.equal(body.data.account_type,'partner');assert.equal(body.email,'newpartner@gmail.com');data=session(profile)}
 if(name==='profiles')data=req.headers().accept?.includes('object')?profile:[profile]
 if(name==='partners')data=url.searchParams.has('user_id')?partner:[partner]
 if(name==='partner_contacts')data=[contact]
 if(name==='partner_tasks')data=[task]
 if(name==='get_partner_overview')data={referredCount:0,activityCount:0,activities:[],commissions:[],totals:{pending:0,approved:0,paid:0},terms:null}
 if(name==='get_partner_payfast_state')data={account:null,platformEnabled:false,splits:[]}
 if(name==='partner_workspace_action'){task={...task,revision:task.revision+1,steps:task.steps.map((s,i)=>i===body.p_data.step?{...s,done:body.p_data.checked}:s)};data=task}
 if(name==='partner_support'){
  if(body.p_action==='unread')data=0
  if(body.p_action==='inbox')data=[{partner_id:uid,name:role==='admin'?'Naledi Partner':'Admin',preview:messages.at(-1).content,last_at:messages.at(-1).sent_at,unread:1}]
  if(body.p_action==='messages')data=messages
  if(body.p_action==='send'){messages.push({id:messages.length+1,content:body.p_content,from_admin:role==='admin',sender_name:role==='admin'?'Admin':'Naledi Partner',sent_at:new Date().toISOString()});data={sent:true}}
  if(body.p_action==='read')data=null
 }
 await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':`0-0/${Array.isArray(data)?data.length:1}`},body:JSON.stringify(data)})
 })
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));return {page,context,errors}
}
async function noOverflow(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'horizontal document overflow')}
try {
 const guest=await pageFor('guest');await guest.page.goto(`${base}/#/partner/join`);await guest.page.getByRole('heading',{name:'Good conversations start here.'}).waitFor();await noOverflow(guest.page);await guest.page.screenshot({path:`${shots}/join-mobile.png`,fullPage:true});await guest.page.getByLabel('Your name',{exact:true}).fill('New Partner');await guest.page.getByLabel(/^Email/).fill('newpartner@gmail.com');await guest.page.getByLabel(/^Password/).fill('preview-password-123');await guest.page.getByRole('checkbox').check();await guest.page.getByRole('button',{name:'Join & open my dashboard'}).click();await guest.page.getByRole('heading',{name:'Your tasks & contacts'}).waitFor();assert.equal(guest.errors.length,0,guest.errors.join('\n'));console.log('PASS personal-email signup opens dashboard without approval')
 const member=await pageFor('partner');await member.page.goto(`${base}/#/partner?welcome=1`);await member.page.getByRole('heading',{name:'Your tasks & contacts'}).waitFor();await member.page.getByText('Introduce AtriumX to Campus Tutoring').waitFor();await noOverflow(member.page);await member.page.screenshot({path:`${shots}/dashboard-mobile.png`,fullPage:true});await member.page.getByRole('checkbox').first().click();await member.page.getByText('Progress saved. Admin has been notified.').waitFor();assert(await member.page.getByRole('checkbox').first().isChecked());console.log('PASS task checkbox saves and confirms admin notification')
 await member.page.getByRole('button',{name:'Approach guide',exact:true}).click();await member.page.getByText('Start with what matters to them',{exact:true}).waitFor();await member.page.getByText('Accommodations',{exact:true}).click();await noOverflow(member.page);await member.page.screenshot({path:`${shots}/guide-mobile.png`,fullPage:true});
 await member.page.getByRole('button',{name:'Chat with Admin',exact:true}).last().click();await member.page.getByText('Welcome! Your first contact is ready in your tasks.').waitFor();await member.page.getByRole('textbox',{name:'Message',exact:true}).fill('Can I have another contact for Rhodes?');await member.page.getByRole('button',{name:'Send message'}).click();await member.page.getByText('Can I have another contact for Rhodes?',{exact:true}).waitFor();await noOverflow(member.page);await member.page.screenshot({path:`${shots}/chat-mobile.png`,fullPage:true});await member.page.setViewportSize({width:390,height:440});await member.page.waitForTimeout(100);const composer=await member.page.getByRole('button',{name:'Send message'}).boundingBox();assert(composer.y+composer.height<=441,'composer hidden under reduced viewport');assert.equal(member.errors.length,0,member.errors.join('\n'));console.log('PASS support sends messages and fits a keyboard-sized viewport')
 const admin=await pageFor('admin',1280);await admin.page.goto(`${base}/#/admin?tab=partners`);await admin.page.getByRole('heading',{name:'Partner workspace',exact:true}).waitFor();await admin.page.getByText('Add a contact',{exact:true}).click();await noOverflow(admin.page);await admin.page.screenshot({path:`${shots}/admin-desktop.png`,fullPage:true});await admin.page.goto(`${base}/#/chat?support=1&partner=${uid}`);await admin.page.getByLabel('Support conversation').getByText('Can I have another contact for Rhodes?',{exact:true}).waitFor();await admin.page.screenshot({path:`${shots}/admin-chat-desktop.png`,fullPage:true});await admin.page.setViewportSize({width:360,height:800});await noOverflow(admin.page);await admin.page.getByRole('button',{name:'Back to partners'}).click();await admin.page.getByRole('button',{name:/Naledi Partner/}).waitFor();assert.equal(admin.errors.length,0,admin.errors.join('\n'));console.log('PASS shared admin inbox and assignments fit desktop and 360px')
} finally {await browser.close();server?.kill()}
