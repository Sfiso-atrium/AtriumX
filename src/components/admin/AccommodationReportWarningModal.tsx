import { useMemo, useState } from 'react'
import { X, Send, AlertTriangle } from 'lucide-react'
import { AccommodationReport, sendAccommodationReportWarning } from '../../services/dataService'

interface Props {
  report: AccommodationReport
  onClose: () => void
  onSent: (deadlineAt: string | null) => void
}

const FIELD_OPTIONS = [
  ['title', 'Title'],
  ['monthly_rent', 'Monthly rent'],
  ['address', 'Address'],
  ['description', 'Description'],
  ['amenities', 'Amenities'],
  ['image_urls', 'Photos'],
  ['universities', 'Universities'],
  ['building_count', 'Building count'],
  ['building_addresses', 'Building addresses'],
] as const

export default function AccommodationReportWarningModal({ report, onClose, onSent }: Props) {
  const defaultMessage = useMemo(() => (
`Hello ${report.seller_name || '[OWNER NAME]'},

A report has been submitted regarding your accommodation listing: "${report.listing_title}".

Reason for the report:
${report.reason || '[REASON FOR REPORT]'}

Information that needs to be edited:
[ENTER THE INFORMATION THAT MUST BE CORRECTED HERE]

Please review and edit this information on your accommodation listing within 3 days of receiving this notification. If the information is not edited within 3 days, the listing will be removed from the accommodation feed.

Regards,
[ADMIN NAME]
AtriumX Admin`), [report])

  const [message, setMessage] = useState(defaultMessage)
  const [requiredField, setRequiredField] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || !requiredField) return
    setSaving(true)
    const result = await sendAccommodationReportWarning(report.id, message.trim(), requiredField)
    setSaving(false)
    if (result.error) {
      window.alert(result.error)
      return
    }
    onSent(result.deadlineAt)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-deep border border-slate-border rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-border">
          <div>
            <p className="text-cream font-bold">Notify accommodation owner</p>
            <p className="text-cream-muted text-xs mt-1">{report.listing_title} · {report.seller_name || 'Unknown owner'}</p>
          </div>
          <button onClick={onClose} className="text-cream-muted hover:text-cream" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 text-xs font-bold">Reported reason</p>
                <p className="text-cream-muted text-sm mt-1">{report.reason || '[REASON FOR REPORT]'}</p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-cream text-xs font-bold">Information that must be corrected</span>
            <select
              value={requiredField}
              onChange={e => setRequiredField(e.target.value)}
              className="w-full mt-1.5 bg-slate-card border border-slate-border rounded-xl px-3 py-2.5 text-cream text-sm"
            >
              <option value="">Select the listing information</option>
              {FIELD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-cream text-xs font-bold">Notification message</span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={16}
              className="w-full mt-1.5 bg-slate-card border border-slate-border rounded-2xl px-3 py-3 text-cream text-sm leading-relaxed resize-y"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-border text-cream-muted text-sm font-bold">Cancel</button>
            <button
              onClick={handleSend}
              disabled={saving || !message.trim() || !requiredField}
              className="inline-flex items-center gap-2 bg-teal-primary hover:bg-teal-light disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl text-sm"
            >
              <Send size={14} />
              {saving ? 'Sending...' : 'Send notification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
