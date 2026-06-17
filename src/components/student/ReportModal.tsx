import { useState } from 'react'
import { X } from 'lucide-react'
import { reportListing } from '../../services/dataService'
import { useApp } from '../../context/AppContext'

interface Props {
  listingId: string
  onClose: () => void
}

export default function ReportModal({ listingId, onClose }: Props) {
  const { currentUser, showToast } = useApp()
  const [loading, setLoading] = useState(false)

  const handleReport = async () => {
    if (!currentUser) return
    setLoading(true)
    const { error } = await reportListing(listingId, currentUser.id)
    setLoading(false)
    if (error) {
      showToast('Failed to submit report.', 'error')
      return
    }
    showToast('Report submitted. Thank you.', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-slate-card border border-slate-border rounded-t-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream font-bold text-lg">Report Listing</h2>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <p className="text-cream-muted text-sm mb-6 leading-relaxed">
          If this listing is fraudulent, misleading, or violates community rules,
          our team will review it and may remove it.
        </p>
        <button
          onClick={handleReport}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Submitting...' : 'Confirm Report'}
        </button>
      </div>
    </div>
  )
}
