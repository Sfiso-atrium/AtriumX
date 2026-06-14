// src/App.tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Entrance from './pages/Entrance'
import Feed from './pages/Feed'
import RetailerLanding from './pages/RetailerLanding'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Entrance />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/retailer" element={<RetailerLanding />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
