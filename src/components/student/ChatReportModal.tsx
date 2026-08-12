import { useState } from 'react'
import { X } from 'lucide-react'
import { reportConversation } from '../../services/dataService'
import { useApp } from '../../context/AppContext'

interface Props {
  conversationId: string
  listingId: string
  onClose: () => void
}

export default function ChatReportModal({ conversationId, listingId, onClose }: Props) {
  const { currentUser, showToast } = useApp()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReport = async () => {
    if (!currentUser) return
    if (!reason.trim()) {
      showToast('Please describe the issue before submitting.', 'error')
      return
    }
    setLoading(true)
    const { error } = await reportConversation(conversationId, listingId, currentUser.id, reason.trim())
    setLoading(false)
    if (error) {
      showToast('Failed to submit report.', 'error')
      return
    }
    showToast('Report submitted. Thank you.', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-card border border-slate-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream font-bold text-lg">Report This Conversation</h2>
          <button onClick={onClose} className="text-cream-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>
        <p className="text-cream-muted text-sm mb-4 leading-relaxed">
          If something in this chat is abusive, harassing, or otherwise breaks
          our community rules, our team will review it.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="What happened? Be specific — this is what our team reviews."
          rows={4}
          maxLength={500}
          className="w-full bg-slate-deep border border-slate-border rounded-xl p-3 text-cream text-sm placeholder:text-cream-muted mb-6 resize-none focus:outline-none focus:border-teal-primary"
        />
        <button
          onClick={handleReport}
          disabled={loading || !reason.trim()}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Submitting...' : 'Confirm Report'}
        </button>
      </div>
    </div>
  )
}
