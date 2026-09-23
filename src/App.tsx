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


function AccommodationGuard({ children }: { children: ReactNode }) {
  const { currentUser, businessProfile, isLoadingAuth } = useApp()
  if (isLoadingAuth) return null
  if (currentUser?.account_type === 'business' && businessProfile?.is_accommodation) {
    return <Navigate to="/accommodation" replace />
  }
  return <>{children}</>
}


function StudentAccommodationGuard({ children }: { children: ReactNode }) {
  const { currentUser, businessProfile, isLoadingAuth } = useApp()
  if (isLoadingAuth) return null
  if (currentUser?.account_type === 'business') {
    if (businessProfile?.is_accommodation) return <Navigate to="/accommodation" replace />
    return <Navigate to="/feed" replace />
  }
  return <>{children}</>
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
<Route path="/post" element={<AccommodationGuard><PostListing /></AccommodationGuard>} />
          <Route path="/post-wanted" element={<AccommodationGuard><PostWanted /></AccommodationGuard>} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/retailer" element={<RetailerLanding />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/space" element={<MySpace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:convId" element={<ChatPage />} />
          <Route path="/retailer/signup" element={<RetailerSignup />} />
          <Route path="/business/post" element={<BusinessPostListing />} />
          <Route path="/business/plan-select" element={<BusinessPlanSelect />} />
          <Route path="/accommodation" element={<AccommodationHome />} />
          <Route path="/accommodation/plan-select" element={<AccommodationPlanSelect />} />
          <Route path="/accommodation/post" element={<AccommodationPostListing />} />
          <Route path="/accommodation/:id" element={<AccommodationDetail />} />
          <Route path="/accommodations" element={<StudentAccommodationGuard><AccommodationMarketplace /></StudentAccommodationGuard>} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/group/:groupId" element={<StudyGroupChat />} />
          <Route path="/groups" element={<StudyGroupsList />} />
          <Route path="/focus" element={<FocusMode />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/qr" element={<QRToolPage />} />
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </HashRouter>
    </AppProvider>
  )
}
