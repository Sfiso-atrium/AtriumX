import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitBusinessApplication } from '../services/dataService'
import Navbar from '../components/common/Navbar'

const BUSINESS_TYPES = [
  'Restaurant', 'Clothing', 'Electronics',
  'Tutoring', 'Printing', 'Salon', 'Other'
]

const PACKAGES = [
  { id: 'noticeboard', label: 'Noticeboard — Free' },
  { id: 'featured', label: 'Featured — R350/week' },
  { id: 'campus_partner', label: 'Campus Partner — R800/month' },
]

export default function RetailerSignup() {
  const [searchParams] = useSearchParams()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [customType, setCustomType] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedPackage, setSelectedPackage] = useState(
    searchParams.get('package') || ''
  )
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const inputClass = "w-full bg-slate-card border border-slate-border rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted focus:outline-none focus:border-teal-light transition-colors"

  const handleSubmit = async () => {
    setError('')
    if (!businessName || !businessType || !contactPerson ||
        !email || !phone || !selectedPackage || !description) {
      setError('All fields are required.')
      return
    }
    if (businessType === 'Other' && !customType) {
      setError('Please specify your business type.')
      return
    }
    setLoading(true)
    const { error: err } = await submitBusinessApplication({
      businessName,
      businessType,
      customBusinessType: businessType === 'Other' ? customType : undefined,
      contactPerson,
      email,
      phone,
      selectedPackage,
      description,
    })
    setLoading(false)
    if (err) { setError(err); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-faint flex items-center justify-center mb-4">
        <span className="text-4xl">✓</span>
      </div>
      <h2 className="text-cream font-bold text-2xl mb-2">Application Submitted</h2>
      <p className="text-cream-muted text-sm max-w-sm">
        We will contact you at {email} within 48 hours.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-deep">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">Register Your Business</h1>
        <p className="text-cream-muted text-sm mb-8">
          We review every application within 48 hours.
        </p>
        <div className="flex flex-col gap-4">
          <input type="text" placeholder="Business Name" value={businessName}
            onChange={e => setBusinessName(e.target.value)} className={inputClass} />

          <select value={businessType}
            onChange={e => setBusinessType(e.target.value)} className={inputClass}>
            <option value="" disabled>Select business type</option>
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {businessType === 'Other' && (
            <input type="text" placeholder="Specify your business type"
              value={customType} onChange={e => setCustomType(e.target.value)}
              className={inputClass} />
          )}

          <input type="text" placeholder="Contact Person Name" value={contactPerson}
            onChange={e => setContactPerson(e.target.value)} className={inputClass} />

          <input type="email" placeholder="Email Address" value={email}
            onChange={e => setEmail(e.target.value)} className={inputClass} />

          <input type="tel" placeholder="Phone Number" value={phone}
            onChange={e => setPhone(e.target.value)} className={inputClass} />

          <select value={selectedPackage}
            onChange={e => setSelectedPackage(e.target.value)} className={inputClass}>
            <option value="" disabled>Select a package</option>
            {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <textarea placeholder="Brief description of your business (max 300 characters)"
            maxLength={300} rows={4} value={description}
            onChange={e => setDescription(e.target.value)}
            className={inputClass + ' resize-none'} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-ember hover:bg-ember-dark disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  )
}
