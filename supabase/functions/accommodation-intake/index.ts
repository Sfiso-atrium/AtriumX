import { createClient } from 'npm:@supabase/supabase-js@2.43.0'
import { validateSubmission } from './validation.ts'

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Content-Type':'application/json' }
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers})
const sha256 = async (s:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('')

Deno.serve(async req => {
  if(req.method==='OPTIONS')return new Response('ok',{headers})
  if(req.method!=='POST')return reply({error:'Method not allowed.'},405)
  try {
    // Bound the body while streaming, before allocating/decoding arbitrary images.
    const reader=req.body?.getReader(); if(!reader)return reply({error:'Missing submission.'},400)
    const chunks:Uint8Array[]=[];let size=0
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2300000){await reader.cancel();return reply({error:'Submission is too large. Use up to three smaller photos.'},413)}chunks.push(value)}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
    const body=JSON.parse(new TextDecoder().decode(bytes))
    if(typeof body.receipt!=='string'||!/^[a-f0-9]{64}$/.test(body.receipt))return reply({error:'The submission receipt is missing. Please refresh and try again.'},400)
    const receiptHash=await sha256(body.receipt)
    if(body.action==='claim'){
      const authorization=req.headers.get('Authorization')??''
      const client=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
      const {data:{user},error:authError}=await client.auth.getUser()
      if(authError||!user)return reply({error:'Sign in to your accommodation account first.'},401)
      const {data:s}=await admin.from('accommodation_submissions').select('*').eq('id',body.id).eq('receipt_hash',receiptHash).maybeSingle()
      if(!s||s.email!==user.email?.toLowerCase()||!user.email_confirmed_at)return reply({error:'Use the verified email and saved receipt from this submission.'},403)
      if(s.status==='claimed'&&s.claimed_by===user.id)return reply({id:s.claimed_listing_id})
      if(s.status!=='approved')return reply({error:'Your submission must be approved before it can be linked to your account.'},400)
      const imageUrls:string[]=[]
      for(const [i,imageUrl] of s.image_urls.entries()){
        const oldPath=new URL(imageUrl).pathname.split('/object/public/listing-images/')[1]
        if(!oldPath)return reply({error:'Could not locate a submitted photo.'},400)
        const newPath=`accommodation/${user.id}/submission-${s.id}-${i}.${oldPath.split('.').pop()}`
        const {data:file,error:downloadError}=await admin.storage.from('listing-images').download(oldPath)
        if(downloadError||!file)throw new Error('Photo transfer failed. Please try again.')
        const {error:uploadError}=await admin.storage.from('listing-images').upload(newPath,file,{contentType:file.type,upsert:true})
        if(uploadError)throw new Error('Photo transfer failed. Please try again.')
        imageUrls.push(admin.storage.from('listing-images').getPublicUrl(newPath).data.publicUrl)
      }
      const {data:id,error}=await client.rpc('claim_accommodation_submission',{p_id:s.id,p_receipt_hash:receiptHash,p_image_urls:imageUrls})
      if(error)return reply({error:error.message},400)
      return reply({id})
    }
    if(body.action!=='submit')return reply({error:'Unknown request.'},400)
    const input=validateSubmission(body)
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
    const ipHash=await sha256(serviceKey+':'+ip)
    const {data:id,error:reserveError}=await admin.rpc('reserve_accommodation_submission',{p_receipt_hash:receiptHash,p_ip_hash:ipHash,p_email:input.email,p_phone:input.phone,p_website:input.website,p_payload:input.payload})
    if(reserveError)return reply({error:reserveError.message.includes('Too many')?reserveError.message:'Could not save your submission. Please try again.'},400)
    const {data:existing,error:readError}=await admin.from('accommodation_submissions').select('status').eq('id',id).single()
    if(readError)throw new Error('Could not confirm your submission. Please try again.')
    if(existing.status!=='draft')return reply({id,status:existing.status})
    const imageUrls:string[]=[]
    for(const [i,photo] of input.photos.entries()){
      const path=`accommodation-intake/${id}/${i}.${photo.extension}`
      const {error}=await admin.storage.from('listing-images').upload(path,photo.bytes,{contentType:photo.type,upsert:true})
      if(error)throw new Error('A photo could not be uploaded. Your form is kept; please try again.')
      imageUrls.push(admin.storage.from('listing-images').getPublicUrl(path).data.publicUrl)
    }
    const {error:saveError}=await admin.from('accommodation_submissions').update({payload:input.payload,email:input.email,contact_number:input.phone,website:input.website,image_urls:imageUrls,status:'pending'}).eq('id',id).eq('status','draft')
    if(saveError)throw new Error('Could not finish your submission. Please try again.')
    return reply({id,status:'pending'})
  }catch(error){return reply({error:error instanceof Error?error.message:'Could not submit. Please try again.'},400)}
})
