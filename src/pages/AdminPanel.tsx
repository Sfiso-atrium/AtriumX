import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, ShieldOff, PencilLine, Eye, Handshake, MessageSquareText, Search, Trash2, GraduationCap, Store, Building2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Listing,
  Report,
  AccommodationReport,
  ChatReport,
  Profile,
  Partner,
  Suggestion,
  getAllListingsAdmin,
  getEditedListings,
  getReportsForListings,
  getAccommodationReportsForAdmin,
  clearAccommodationReports,
  getChatReports,
  suspendListingById,
  clearReports,
  acknowledgeListingEdit,
  getAllPartnersAdmin,
  createPartner,
  removePartner,
  searchProfilesByName,
  getSuggestionsAdmin,
  markSuggestionRead,
} from '../services/dataService'
import AccommodationSubmissionQueue from '../components/admin/AccommodationSubmissionQueue'
import BottomNav from '../components/common/BottomNav'
import ChatReportCard from '../components/admin/ChatReportCard'
import AccommodationReportWarningModal from '../components/admin/AccommodationReportWarningModal'
import { SOUTH_AFRICAN_UNIVERSITIES } from '../data/universities'

type Tab = 'accommodationSubmissions' | 'all' | 'edited' | 'reports' | 'chatReports' | 'partners' | 'suggestions'
type StatusFilter = 'all' | 'active' | 'sold' | 'expired' | 'suspended'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { currentUser, showToast, isLoadingAuth } = useApp()
  const [tab, setTab] = useState<Tab>('all')
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [editedListings, setEditedListings] = useState<Listing[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
const [reportedListings, setReportedListings] = useState<Listing[]>([])
  const [reportReasons, setReportReasons] = useState<Record<string, Report[]>>({})
  const [accommodationReports, setAccommodationReports] = useState<AccommodationReport[]>([])
  const [chatReports, setChatReports] = useState<ChatReport[]>([])
  const [partners, setPartners] = useState<Awaited<ReturnType<typeof getAllPartnersAdmin>>>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [partnerSearch, setPartnerSearch] = useState('')
  const [partnerSearchResults, setPartnerSearchResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [warningReport, setWarningReport] = useState<AccommodationReport | null>(null)
  const [browseUniversity, setBrowseUniversity] = useState('')

  useEffect(() => {
    if (!browseUniversity && currentUser?.university && SOUTH_AFRICAN_UNIVERSITIES.includes(currentUser.university)) setBrowseUniversity(currentUser.university)
  }, [browseUniversity, currentUser?.university])

  useEffect(() => {
    if (isLoadingAuth) return
    if (!currentUser) { navigate('/student'); return }
    if (!currentUser.is_admin) { navigate('/feed'); return }

setLoadError(false)
    Promise.all([getAllListingsAdmin(), getEditedListings(), getChatReports(), getAllPartnersAdmin(), getSuggestionsAdmin(), getAccommodationReportsForAdmin()])
      .then(([all, edited, chatReps, partnerList, suggestionList, accommodationReps]) => {
        setAllListings(all)
        setEditedListings(edited)
        setChatReports(chatReps)
        setPartners(partnerList)
        setSuggestions(suggestionList)
        setAccommodationReports(accommodationReps)
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
        setLoadError(true)
        showToast('Failed to load admin data.', 'error')
        setLoading(false)
      })
  }, [currentUser, isLoadingAuth, navigate, showToast])

  const openUniversityView = (view: 'marketplace' | 'business' | 'accommodation') => {
    if (!browseUniversity) {
      showToast('Choose a university first.', 'info')
      return
    }
    const university = encodeURIComponent(browseUniversity)
    if (view === 'accommodation') {
      navigate(`/accommodations?university=${university}`)
      return
    }
    navigate(`/feed?university=${university}&tab=${view}`)
  }

  const handleChatEnded = (conversationId: string) => {
    setChatReports(prev => prev.map(r =>
      r.conversation?.id === conversationId
        ? { ...r, conversation: { ...r.conversation!, is_closed_by_admin: true } }
        : r
    ))
    showToast('Conversation ended.', 'success')
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

  // Listings are live immediately now. Admin moderation still works by
  // suspending a listing from the All Listings tab when necessary.
  const handleSuspend = async (id: string) => {
    setActionId(id)
    const { error } = await suspendListingById(id)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setAllListings(prev => prev.map(l => l.id === id ? { ...l, status: 'suspended' as const } : l))
    showToast('Listing suspended.', 'success')
  }

  const handlePartnerSearch = async (q: string) => {
    setPartnerSearch(q)
    if (q.trim().length < 2) { setPartnerSearchResults([]); return }
    const results = await searchProfilesByName(q)
    setPartnerSearchResults(results.filter(r => !partners.some(p => p.user_id === r.id)))
  }

  const handleGrantPartner = async (profile: Profile) => {
    const { code, error } = await createPartner(profile.id, profile.full_name)
    if (error) { showToast(error, 'error'); return }
    setPartners(prev => [{ user_id: profile.id, referral_code: code!, created_at: new Date().toISOString(), profile, referredCount: 0, totalEarnings: 0 }, ...prev])
    setPartnerSearchResults(prev => prev.filter(r => r.id !== profile.id))
    setPartnerSearch('')
    showToast(`${profile.full_name} is now a partner.`, 'success')
  }

  const handleRevokePartner = async (userId: string) => {
    await removePartner(userId)
    setPartners(prev => prev.filter(p => p.user_id !== userId))
    showToast('Partner status revoked.', 'success')
  }

  const handleMarkSuggestionRead = async (id: string) => {
    await markSuggestionRead(id)
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, is_read: true } : s))
  }

  const handleAccommodationWarningSent = (deadlineAt: string | null) => {
    if (!warningReport) return
    setAccommodationReports(prev => prev.map(report =>
      report.id === warningReport.id
        ? { ...report, status: 'reviewed', report_warning_sent_at: new Date().toISOString(), report_edit_deadline_at: deadlineAt }
        : report
    ))
    setWarningReport(null)
    showToast('Notification sent to the accommodation owner.', 'success')
  }

  const handleClearAccommodationReports = async (accommodationListingId: string) => {
    setActionId(accommodationListingId)
    const { error } = await clearAccommodationReports(accommodationListingId)
    setActionId(null)
    if (error) { showToast(error, 'error'); return }
    setAccommodationReports(prev => prev.filter(report => report.accommodation_listing_id !== accommodationListingId))
    showToast('Accommodation reports cleared.', 'success')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center">
      <p className="text-cream-muted">Loading...</p>
    </div>
  )

  if (loadError) return (
    <div className="min-h-screen bg-slate-deep flex items-center justify-center px-6 text-center">
      <p className="text-cream-muted">Could not load admin data. Refresh the page and try again.</p>
    </div>
  )

const activeList =
    tab === 'edited' ? editedListings :
    tab === 'reports' ? reportedListings :
    tab === 'partners' || tab === 'suggestions' || tab === 'accommodationSubmissions' ? [] :
    statusFilter === 'all' ? allListings : allListings.filter(l => l.status === statusFilter)
  return (
    <div className="min-h-screen bg-slate-deep">
      <div className="sticky top-0 z-50 bg-slate-deep border-b border-slate-border h-14 flex items-center px-4">
        <span className="text-cream font-bold text-lg">Admin Panel</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <h1 className="font-serif text-3xl text-cream mb-1">Admin Panel</h1>
        <p className="text-cream-muted text-sm mb-6">Manage listings and reports.</p>

        <section className="mb-6 rounded-2xl border border-slate-border bg-slate-card p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-cream font-bold text-sm">Browse university experiences</p>
              <p className="text-cream-muted text-xs mt-1 leading-relaxed">Admin access is not tied to your account university. Choose any university, then open its student marketplace, business marketplace or accommodation view.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="text-cream text-xs font-semibold">
                University
                <select
                  value={browseUniversity}
                  onChange={e => setBrowseUniversity(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-sm text-cream outline-none focus:border-teal-light"
                >
                  <option value="" disabled>Choose a university</option>
                  {SOUTH_AFRICAN_UNIVERSITIES.map(university => (
                    <option key={university} value={university}>{university}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openUniversityView('marketplace')} disabled={!browseUniversity} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-xs font-bold text-cream hover:border-teal-primary disabled:opacity-40">
                  <GraduationCap size={14} /> Student marketplace
                </button>
                <button type="button" onClick={() => openUniversityView('business')} disabled={!browseUniversity} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-border bg-slate-deep px-3 py-2.5 text-xs font-bold text-cream hover:border-teal-primary disabled:opacity-40">
                  <Store size={14} /> Business marketplace
                </button>
                <button type="button" onClick={() => openUniversityView('accommodation')} disabled={!browseUniversity} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-primary px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">
                  <Building2 size={14} /> Accommodation
                </button>
              </div>
            </div>
          </div>
        </section>

        {tab === 'accommodationSubmissions' && <AccommodationSubmissionQueue />}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setTab('accommodationSubmissions')} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-border text-cream">Accommodation submissions</button>
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
            Reported ({reportedListings.length + accommodationReports.length})
          </button>
          <button
            onClick={() => setTab('chatReports')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'chatReports'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Chat Reports ({chatReports.length})
          </button>
          <button
            onClick={() => setTab('partners')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'partners'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Partners ({partners.length})
          </button>
          <button
            onClick={() => setTab('suggestions')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'suggestions'
                ? 'bg-teal-primary border-teal-light text-cream'
                : 'bg-slate-card border-slate-border text-cream-muted hover:border-teal-primary'
            }`}
          >
            Suggestions ({suggestions.filter(s => !s.is_read).length})
          </button>
        </div>
        {tab === 'all' && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'active', 'sold', 'expired', 'suspended'] as StatusFilter[]).map(s => (
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
{tab === 'chatReports' && (
          chatReports.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-cream-muted text-sm">No chat reports.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chatReports.map(report => (
                <ChatReportCard key={report.id} report={report} onEnded={handleChatEnded} />
              ))}
            </div>
          )
        )}
{tab !== 'accommodationSubmissions' && tab !== 'chatReports' && tab !== 'partners' && tab !== 'suggestions' && (activeList.length === 0 && (tab !== 'reports' || accommodationReports.length === 0) ? (
          <div className="text-center py-16">
            <p className="text-cream-muted text-sm">
              {tab === 'edited' ? 'No listings have unreviewed edits.' :
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
            {tab === 'reports' && accommodationReports.map(report => {
              const busy = actionId === report.accommodation_listing_id
              const deadlineActive = report.report_edit_deadline_at && new Date(report.report_edit_deadline_at).getTime() > Date.now()
              return (
                <div key={`accommodation-${report.id}`} className="bg-slate-card border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-teal-light text-[11px] font-bold uppercase tracking-[0.12em]">Accommodation report</p>
                      <p className="text-cream font-bold text-sm mt-1 truncate">{report.listing_title}</p>
                      <p className="text-cream-muted text-xs mt-0.5">Owner: {report.seller_name || 'Unknown'} · Reported by {report.reporter_name || 'Unknown user'}</p>
                      <p className="text-cream-muted text-xs mt-2 pl-2 border-l-2 border-red-500/40">"{report.reason}"</p>
                      {report.report_required_field && (
                        <p className="text-gold text-xs mt-2">Required correction: {report.report_required_field.replace(/_/g, ' ')}</p>
                      )}
                      {report.report_edit_deadline_at && (
                        <p className={`text-xs mt-1 ${deadlineActive ? 'text-cream-muted' : 'text-red-400'}`}>
                          Correction deadline: {new Date(report.report_edit_deadline_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {report.listing_image_urls?.[0] && <img src={report.listing_image_urls[0]} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => setWarningReport(report)} className="flex items-center gap-1.5 bg-teal-primary hover:bg-teal-light text-white text-xs font-bold px-3 py-2 rounded-xl">
                      <PencilLine size={13} /> {report.report_warning_sent_at ? 'Update correction notice' : 'Request correction'}
                    </button>
                    {report.status === 'reviewed' && !report.report_edit_deadline_at && (
                      <button onClick={() => handleClearAccommodationReports(report.accommodation_listing_id)} disabled={busy} className="flex items-center gap-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-xl">
                        <Flag size={13} /> Clear accommodation reports
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {warningReport && (
        <AccommodationReportWarningModal
          report={warningReport}
          onClose={() => setWarningReport(null)}
          onSent={handleAccommodationWarningSent}
        />
      )}
      <BottomNav />
    </div>
  )
}
