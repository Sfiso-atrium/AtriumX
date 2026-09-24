import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { AccommodationListing, AccommodationReportField, updateAccommodationReportedField } from '../../services/dataService'

interface Props {
  listing: AccommodationListing
  field: AccommodationReportField
  onClose: () => void
  onSaved: (listing: AccommodationListing) => void
}

const FIELD_LABELS: Record<AccommodationReportField, string> = {
  title: 'Title',
  monthly_rent: 'Monthly rent',
  address: 'Address',
  description: 'Description',
  amenities: 'Amenities',
  image_urls: 'Photos',
  universities: 'Universities',
  building_count: 'Building count',
  building_addresses: 'Building addresses',
}

function initialValue(listing: AccommodationListing, field: AccommodationReportField) {
  if (field === 'amenities' || field === 'universities') return listing[field].join(', ')
  if (field === 'building_addresses' || field === 'image_urls') return listing[field].join('\n')
  if (field === 'monthly_rent') return listing.monthly_rent == null ? '' : String(listing.monthly_rent)
  return String(listing[field] ?? '')
}

export default function AccommodationReportEditModal({ listing, field, onClose, onSaved }: Props) {
  const [value, setValue] = useState(() => initialValue(listing, field))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isMultiline = useMemo(() => ['description', 'building_addresses', 'image_urls'].includes(field), [field])

  const handleSave = async () => {
    setError('')
    if (!value.trim() && field !== 'monthly_rent') {
      setError('Enter the information you want to save.')
      return
    }
    setSaving(true)
    const result = await updateAccommodationReportedField(listing.id, listing.seller_id, field, value)
    setSaving(false)
    if (result.error) { setError(result.error); return }

    const next: AccommodationListing = {
      ...listing,
      ...(field === 'amenities' ? { amenities: value.split(',').map(item => item.trim()).filter(Boolean) } : {}),
      ...(field === 'universities' ? { universities: value.split(',').map(item => item.trim()).filter(Boolean) } : {}),
      ...(field === 'building_addresses' ? { building_addresses: value.split('\n').map(item => item.trim()).filter(Boolean) } : {}),
      ...(field === 'image_urls' ? { image_urls: value.split('\n').map(item => item.trim()).filter(Boolean) } : {}),
      ...(field === 'monthly_rent' ? { monthly_rent: value.trim() ? Number(value) : null } : {}),
      ...(field === 'title' ? { title: value.trim() } : {}),
      ...(field === 'address' ? { address: value.trim() } : {}),
      ...(field === 'description' ? { description: value.trim() } : {}),
      ...(field === 'building_count' ? { building_count: Number(value) } : {}),
      report_warning_sent_at: null,
      report_edit_deadline_at: null,
      report_required_field: null,
    }
    onSaved(next)
  }

  return (
    <div className="fixed inset-0 z-[220] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-deep border border-slate-border rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-border">
          <div>
            <p className="text-cream font-bold">Edit reported information</p>
            <p className="text-cream-muted text-xs mt-1">{FIELD_LABELS[field]}</p>
          </div>
          <button onClick={onClose} className="text-cream-muted hover:text-cream" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-5">
          <p className="text-cream-muted text-sm leading-relaxed mb-4">Edit the specific information identified in the admin notification. Saving the change will clear the 3-day correction deadline.</p>
          {field === 'amenities' && <p className="text-cream-muted text-xs mb-2">Separate multiple amenities with commas.</p>}
          {(field === 'building_addresses' || field === 'image_urls') && <p className="text-cream-muted text-xs mb-2">Enter one item per line.</p>}

          {isMultiline ? (
            <textarea value={value} onChange={e => setValue(e.target.value)} rows={field === 'description' ? 7 : 6} className="w-full bg-slate-card border border-slate-border rounded-2xl px-3 py-3 text-cream text-sm leading-relaxed resize-y" />
          ) : (
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              type={field === 'monthly_rent' || field === 'building_count' ? 'number' : 'text'}
              min={field === 'building_count' ? 1 : undefined}
              className="w-full bg-slate-card border border-slate-border rounded-xl px-3 py-3 text-cream text-sm"
            />
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-border text-cream-muted text-sm font-bold">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-teal-primary hover:bg-teal-light disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
              <Check size={14} />
              {saving ? 'Saving...' : 'Save correction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
