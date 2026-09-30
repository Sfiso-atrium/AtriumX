import AccommodationReviewPage from './pages/AccommodationReview'
import ResidenceDetail from './pages/ResidenceDetail'
import { HashRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Entrance from './pages/Entrance'
import Feed from './pages/Feed'
import RetailerLanding from './pages/RetailerLanding'
import StudentAuth from './pages/StudentAuth'
import PlanSelect from './pages/PlanSelect'
import PaymentResult from './pages/PaymentResult'
import EventsPage from './pages/EventsPage'
import EventDetails from './pages/EventDetails'
import PostEvent from './pages/PostEvent'
import PostListing from './pages/PostListing'
import PostWanted from './pages/PostWanted'
import ListingDetail from './pages/ListingDetail'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import ChatPage from './pages/ChatPage'
import EditProfile from './pages/EditProfile'
import RetailerSignup from './pages/RetailerSignup'
import BusinessPostListing from './pages/BusinessPostListing'
import BusinessPlanSelect from './pages/BusinessPlanSelect'
import MySpace from './pages/MySpace'
import PartnerDashboard from './pages/Partnerdashboard'
import PushPermissionPrompt from './components/common/PushPermissionPrompt'
import StudyGroupChat from './pages/StudyGroupChat'
import StudyGroupsList from './pages/StudyGroupsList'
import FocusMode from './pages/FocusMode'
import NotebookPage from './pages/NotebookPage'
import ToolkitPage from './pages/ToolkitPage'
import QRToolPage from './pages/QRToolPage'
import Toast from './components/common/Toast'
import AuthPromptModal from './components/common/AuthPromptModal'
import AccommodationHome from './pages/AccommodationHome'
import AccommodationPlanSelect from './pages/AccommodationPlanSelect'
import AccommodationMarketplace from './pages/AccommodationMarketplace'
import AccommodationClaim from './pages/AccommodationClaim'
import AccommodationPostListing from './pages/AccommodationPostListing'
import AccommodationDetail from './pages/AccommodationDetail'

function ToastLayer() {
  const { toasts } = useApp()
  return (
    <div className="fixed top-16 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}

function ModalLayer() {
  const { authPromptOpen } = useApp()
  return authPromptOpen ? <AuthPromptModal /> : null
}


function AccommodationGuard({ children, allowAccommodation = false }: { children: ReactNode; allowAccommodation?: boolean }) {
  const { currentUser, businessProfile, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  if (isLoadingAuth) return null
  if (currentUser?.account_type === 'business' && isLoadingBusinessProfile) return null
  if (currentUser?.account_type === 'business' && !businessProfile) {
    return (
      <div className="min-h-screen bg-slate-deep flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-cream font-bold text-lg">Business account details unavailable</p>
          <p className="text-cream-muted text-sm mt-2">Refresh the page. If this continues, contact AtriumX support so your account can be checked.</p>
        </div>
      </div>
    )
  }
  if (!allowAccommodation && currentUser?.account_type === 'business' && businessProfile?.is_accommodation) {
    return <Navigate to="/accommodation" replace />
  }
  return <>{children}</>
}


function StudentAccommodationGuard({ children }: { children: ReactNode }) {
  const { currentUser, businessProfile, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  if (isLoadingAuth) return null
  if (currentUser?.account_type === 'business') {
    if (isLoadingBusinessProfile) return null
    if (businessProfile?.is_accommodation) return <Navigate to="/accommodation" replace />
    return <Navigate to="/feed" replace />
  }
  return <>{children}</>
}


function StudentOnlyGuard({ children }: { children: ReactNode }) {
  const { currentUser, businessProfile, isLoadingAuth, isLoadingBusinessProfile } = useApp()
  if (isLoadingAuth) return null
  if (!currentUser) return <Navigate to="/student" replace />
  if (currentUser.account_type === 'student') return <>{children}</>
  if (currentUser.account_type === 'business') {
    if (isLoadingBusinessProfile) return null
    if (businessProfile?.is_accommodation) return <Navigate to="/accommodation" replace />
    return <Navigate to="/feed" replace />
  }
  return <Navigate to="/" replace />
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-deep flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-cream font-serif text-xl">Page not found</p>
      <p className="text-cream-muted text-sm">That link doesn't lead anywhere yet.</p>
      <button
        onClick={() => navigate('/')}
        className="bg-gold hover:opacity-85 text-black text-sm font-bold px-4 py-2 rounded-lg transition-opacity"
      >
        Back to AtriumX
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ToastLayer />
        <ModalLayer />
        <PushPermissionPrompt />

        <Routes>
          <Route path="/" element={<Entrance />} />
          <Route path="/student" element={<StudentAuth />} />
          <Route path="/feed" element={<AccommodationGuard><Feed /></AccommodationGuard>} />
          <Route path="/listing/:id" element={<AccommodationGuard><ListingDetail /></AccommodationGuard>} />
          <Route path="/plan-select" element={<PlanSelect />} />
          <Route path="/payment/:outcome" element={<PaymentResult />} />
          <Route path="/events" element={<AccommodationGuard><EventsPage /></AccommodationGuard>} />
          <Route path="/event/:id" element={<AccommodationGuard><EventDetails /></AccommodationGuard>} />
          <Route path="/post-event" element={<AccommodationGuard><PostEvent /></AccommodationGuard>} />
          <Route path="/post" element={<StudentOnlyGuard><PostListing /></StudentOnlyGuard>} />
          <Route path="/post-wanted" element={<StudentOnlyGuard><PostWanted /></StudentOnlyGuard>} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/retailer" element={<RetailerLanding />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/space" element={<StudentOnlyGuard><MySpace /></StudentOnlyGuard>} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:convId" element={<ChatPage />} />
          <Route path="/retailer/signup" element={<RetailerSignup />} />
          <Route path="/business/post" element={<AccommodationGuard><BusinessPostListing /></AccommodationGuard>} />
          <Route path="/business/plan-select" element={<AccommodationGuard><BusinessPlanSelect /></AccommodationGuard>} />
          <Route path="/accommodation" element={<AccommodationHome />} />
          <Route path="/accommodation/plan-select" element={<AccommodationPlanSelect />} />
          <Route path="/accommodation/post" element={<AccommodationPostListing />} />
          <Route path="/accommodation/claim" element={<AccommodationClaim />} />
          <Route path="/accommodation/:id" element={<AccommodationDetail />} />
          <Route path="/accommodations/review" element={<AccommodationReviewPage />} />
          <Route path="/accommodations/residence/:id" element={<ResidenceDetail />} />
          <Route path="/accommodations" element={<StudentAccommodationGuard><AccommodationMarketplace /></StudentAccommodationGuard>} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/group/:groupId" element={<StudentOnlyGuard><StudyGroupChat /></StudentOnlyGuard>} />
          <Route path="/groups" element={<StudentOnlyGuard><StudyGroupsList /></StudentOnlyGuard>} />
          <Route path="/focus" element={<StudentOnlyGuard><FocusMode /></StudentOnlyGuard>} />
          <Route path="/toolkit" element={<StudentOnlyGuard><ToolkitPage /></StudentOnlyGuard>} />
          <Route path="/qr" element={<StudentOnlyGuard><QRToolPage /></StudentOnlyGuard>} />
          <Route path="/notebook" element={<StudentOnlyGuard><NotebookPage /></StudentOnlyGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </HashRouter>
    </AppProvider>
  )
}
