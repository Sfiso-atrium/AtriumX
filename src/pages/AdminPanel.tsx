import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheck as CheckCircle, Circle as XCircle, Flag, ShieldOff, PencilLine, Eye } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Listing,
  Report,
  getPendingListings,
  getAllListingsAdmin,
  getEditedListings,
  getReportsForListings,
  approveListingById,
  rejectListingById,
  suspendListingById,
  clearReports,
  acknowledgeListingEdit,
} from '../services/dataService'
import BottomNav from '../components/common/BottomNav'

type Tab = 'pending' | 'all' | 'edited' | 'reports'
type StatusFilter = 'all' | 'pending' | 'active' | 'sold' | 'expired' | 'suspended'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { currentUser, showToast, isLoadingAuth } = useApp()
  const [tab, setTab] = useState<Tab>('pending')
const [pendingListings, setPendingListings] = useState<Listing[]>([])
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [editedListings, setEditedListings] = useState<Listing[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
const [reportedListings, setReportedListings] = useState<Listing[]>([])
  const [reportReasons, setReportReasons] = useState<Record<string, Report[]>>({})
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/student'); return }
    if (!currentUser.is_admin) { navigate('/feed'); return }

Promise.all([getPendingListings(), getAllListingsAdmin(), getEditedListings()])
      .then(([pending, all, edited]) => {
        setPendingListings(pending)
        setAllListings(all)
        setEditedListings(edited)
        const reported = all.filter(l => l.report_count > 0)
        setReportedListings(reported)
        setLoading(false)
        if (reported.length > 0) {
          getReportsForListings(reported.map(l => l.id)).then(reports => {
            const grouped: Record<string, Report[]> = {}
            reports.forEach(r => {
              grouped[r.listing_id] = [...(grouped[r.listing_id] || []), r]
            })
            setReportReasons(grouped)
          })
        }
      })
      .catch(() => {
        showToast('Failed to load listings.', 'error')
        setLoading(false)
      })
  }, [currentUser, isLoadingAuth, navigate, showToast])

  const handleApprove = async (id: string) => {
    setActionId(id)
    const { error } = await approveListingById(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setPendingListings(prev => prev.filter(l => l.id !== id))
    showToast('Listing approved.', 'success')
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    const { error } = await rejectListingById(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setPendingListings(prev => prev.filter(l => l.id !== id))
    showToast('Listing rejected.', 'success')
  }

const handleClearReports = async (id: string) => {
    setActionId(id)
    const { error } = await clearReports(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setReportedListings(prev => prev.filter(l => l.id !== id))
    setReportReasons(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    showToast('Reports cleared.', 'success')
  }

 const handleAcknowledgeEdit = async (id: string) => {
    setActionId(id)
    const { error } = await acknowledgeListingEdit(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setEditedListings(prev => prev.filter(l => l.id !== id))
    showToast('Marked as reviewed.', 'success')
  }

  // Suspending an already-active listing is distinct from rejecting a
  // pending one — per spec 4.10, suspend does NOT notify the seller, while
  // reject does. suspendListingById() (added in Batch 1) has no
  // notification insert, unlike rejectListingById(). The old code called
  // rejectListingById() here, which meant every "Suspend" click on an
  // active listing incorrectly fired a "listing_rejected" notification.
  const handleSuspend = async (id: string) => {
    setActionId(id)
    const { error } = await suspendListingById(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setAllListings(prev => prev.map(l => l.id === id ? { ...l, status: 'suspended' as const } : l))
    showToast('Listing suspended.', 'success')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Loading...</p>
    </div>
  )

const activeList =
    tab === 'pending' ? pendingListings :
    tab === 'edited' ? editedListings :
    tab === 'reports' ? reportedListings :
    statusFilter === 'all' ? allListings : allListings.filter(l => l.status === statusFilter)
  return (
    <div className="min-h-screen bg-slate-deep">
      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4">
        <span className="text-cream font-bold text-lg">Admin Panel</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">Admin Panel</h1>
        <p className="text-cream-muted text-sm mb-6">Manage listings and reports.</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'pending'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Pending ({pendingListings.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'all'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            All Listings ({allListings.length})
          </button>
<button
            onClick={() => setTab('edited')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'edited'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Edited ({editedListings.length})
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'reports'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Reported ({reportedListings.length})
          </button>
        </div>
        {tab === 'all' && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'pending', 'active', 'sold', 'expired', 'suspended'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-gold text-slate-deep border-gold'
                    : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
{activeList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-cream-muted text-sm">
              {tab === 'pending' ? 'No pending listings.' :
                tab === 'edited' ? 'No listings have unreviewed edits.' :
                tab === 'all' ? 'No listings match this filter.' : 'No reported listings.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeList.map(listing => {
              const seller = listing.seller
              const busy = actionId === listing.id
              return (
                <div
                  key={listing.id}
                  className="bg-slate-card border border-slate-border rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-cream font-bold text-sm truncate">{listing.title}</p>
                      <p className="text-cream-muted text-xs mt-0.5">
                        {seller?.full_name || 'Unknown'} · {listing.residence} · {listing.category}
                      </p>
<p className="text-cream-muted text-xs mt-0.5">
                        R {listing.price} · {listing.plan_tier} plan
                      </p>
                      {tab === 'edited' && listing.edited_at && (
                        <p className="text-gold text-xs font-medium mt-1 flex items-center gap-1">
                          <PencilLine size={11} />
                          Edited {new Date(listing.edited_at).toLocaleString()} · still live
                        </p>
                      )}
{tab === 'reports' && (
                        <div className="mt-1">
                          <p className="text-red-400 text-xs font-medium">
                            {listing.report_count} report{listing.report_count !== 1 ? 's' : ''}
                          </p>
                          {(reportReasons[listing.id] || []).map(r => (
                            <p key={r.id} className="text-cream-muted text-xs mt-1 pl-2 border-l-2 border-red-500/40">
                              "{r.reason}" — {r.reporter?.full_name || 'Unknown user'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    {listing.image_urls?.[0] && (
                      <img
                        src={listing.image_urls[0]}
                        alt=""
                        className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                      />
                    )}
                  </div>

                  <p className="text-cream-muted text-xs leading-relaxed mb-3 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    {tab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(listing.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 bg-teal-primary hover:bg-teal-light disabled:opacity-40 text-cream text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(listing.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </>
                    )}
                    {tab === 'reports' && (
                      <button
                        onClick={() => handleClearReports(listing.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 bg-teal-primary hover:bg-teal-light disabled:opacity-40 text-cream text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        <Flag size={13} />
                        Clear Reports
                      </button>
                    )}
{tab === 'all' && listing.status !== 'suspended' && (
                      <button
                        onClick={() => handleSuspend(listing.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        <ShieldOff size={13} />
                        Suspend
                      </button>
                    )}
                    {tab === 'edited' && (
                      <button
                        onClick={() => handleAcknowledgeEdit(listing.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 bg-teal-primary hover:bg-teal-light disabled:opacity-40 text-cream text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        <Eye size={13} />
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
