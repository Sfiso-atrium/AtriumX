import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { useEffect } from 'react'
import Entrance from './pages/Entrance'
import Feed from './pages/Feed'
import RetailerLanding from './pages/RetailerLanding'
import StudentAuth from './pages/StudentAuth'
import PlanSelect from './pages/PlanSelect'
import PostListing from './pages/PostListing'
import ListingDetail from './pages/ListingDetail'
import Profile from './pages/Profile'
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

export default function App() {
  return (
    <AppProvider>
   <HashRouter />
        <ToastLayer />
        <ModalLayer />
        <Routes>
          <Route path="/" element={<Entrance />} />
          <Route path="/student" element={<StudentAuth />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/plan-select" element={<PlanSelect />} />
          <Route path="/post" element={<PostListing />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/retailer" element={<RetailerLanding />} />
        </Routes>
<HashRouter>
    </AppProvider>
  )
}
