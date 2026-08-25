import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Entrance from './pages/Entrance'
import Feed from './pages/Feed'
import RetailerLanding from './pages/RetailerLanding'
import StudentAuth from './pages/StudentAuth'
import PlanSelect from './pages/PlanSelect'
import PostListing from './pages/PostListing'
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
import FocusMode from './pages/FocusMode'
import Toast from './components/common/Toast'
import AuthPromptModal from './components/common/AuthPromptModal'

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
          <Route path="/feed" element={<Feed />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/plan-select" element={<PlanSelect />} />
<Route path="/post" element={<PostListing />} />
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
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/group/:groupId" element={<StudyGroupChat />} />
          <Route path="/focus" element={<FocusMode />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </HashRouter>
    </AppProvider>
  )
}
