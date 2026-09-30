import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getSubmissionReceipt, intakeRequest } from '../services/accommodationIntake'
import Navbar from '../components/common/Navbar'

export default function AccommodationClaim(){
  const navigate=useNavigate()
  const {currentUser,businessProfile,isLoadingAuth,isLoadingBusinessProfile}=useApp()
  const [receipt]=useState(getSubmissionReceipt)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const claim=async()=>{setBusy(true);setError('');try{const result=await intakeRequest({action:'claim',id:receipt.id,receipt:receipt.receipt});if(result.error)setError(result.error);else if(result.id)navigate(`/accommodation/${result.id}`,{replace:true})}finally{setBusy(false)}}
  return <div className="min-h-screen bg-slate-deep"><Navbar/><main className="max-w-lg mx-auto px-4 py-10 space-y-5"><h1 className="font-serif text-3xl text-cream">Manage your submission</h1>
    <p className="text-cream-muted">Your submission stays saved while we review it. Creating an account is optional. Once approved, link it here using an accommodation account with the same email address.</p>
    {!receipt.id?<p className="text-cream-muted">No submission receipt was found on this device. Use the browser you submitted from, or contact AtriumX for help.</p>:<p className="text-cream-muted text-xs">Submission reference: {receipt.id}</p>}
    {isLoadingAuth||isLoadingBusinessProfile?<p className="text-cream-muted">Loading account...</p>:!currentUser?<div className="flex gap-3"><button onClick={()=>navigate('/retailer/signup?accommodation=1&submission=1')} className="bg-teal-primary text-white px-4 py-3 rounded-xl">Create account</button><button onClick={()=>navigate('/retailer/signup?accommodation=1&mode=login&submission=1')} className="border border-slate-border text-cream px-4 py-3 rounded-xl">Sign in</button></div>:!businessProfile?.is_accommodation?<p className="text-cream-muted">You are signed in to a different account type. Sign out from your profile, then sign in to your accommodation account.</p>:<button disabled={busy||!receipt.id} onClick={claim} className="bg-teal-primary text-white px-4 py-3 rounded-xl disabled:opacity-40">{busy?'Linking...':'Link approved listing to my account'}</button>}
    {error&&<p role="alert" className="text-red-400">{error}</p>}
    <button onClick={()=>navigate('/accommodations')} className="text-teal-light underline">Browse accommodation</button>
  </main></div>
}
