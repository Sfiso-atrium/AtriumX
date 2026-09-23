import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode
} from 'react'
import { Profile, BusinessProfile, restoreSession, getBusinessProfile, getUnreadMessageCount, getPartnerStatus, Partner } from '../services/dataService'
import { supabase } from '../services/supabaseClient'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppContextType {
  currentUser: Profile | null
  setCurrentUser: (user: Profile | null) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  unreadMessageCount: number
  setUnreadMessageCount: (n: number) => void
  toasts: Toast[]
  showToast: (message: string, type: Toast['type']) => void
  authPromptOpen: boolean
  setAuthPromptOpen: (open: boolean) => void
  redirectAfterLogin: string | null
  setRedirectAfterLogin: (path: string | null) => void
  isLoadingAuth: boolean
  partner: Partner | null
  businessProfile: BusinessProfile | null
  refreshBusinessProfile: () => Promise<void>
  darkMode: boolean
  toggleDarkMode: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<Profile | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('atriumx_dark') === '1')

  const setCurrentUser = useCallback((user: Profile | null) => {
    setCurrentUserState(user)
    if (user) {
      getUnreadMessageCount(user.id).then(setUnreadMessageCount)
      getPartnerStatus(user.id).then(setPartner)
      if (user.account_type === 'business') getBusinessProfile(user.id).then(setBusinessProfile)
      else setBusinessProfile(null)
    } else {
      setUnreadMessageCount(0)
      setPartner(null)
      setBusinessProfile(null)
    }
  }, [])

  const refreshBusinessProfile = useCallback(async () => {
    if (!currentUser || currentUser.account_type !== 'business') {
      setBusinessProfile(null)
      return
    }
    const profile = await getBusinessProfile(currentUser.id)
    setBusinessProfile(profile)
  }, [currentUser])


useEffect(() => {
    let mounted = true

    restoreSession().then(profile => {
      if (mounted) {
        // Do not let the initial session lookup clear a user who has just
        // completed signup/login while that lookup was still in flight.
        if (profile) setCurrentUser(profile)
        setIsLoadingAuth(false)
      }
    }).catch(() => {
      if (mounted) {
        // Keep any in-memory user established during signup/login; a failed
        // initial session lookup should not send the app back to a blank
        // signed-out route.
        setIsLoadingAuth(false)
      }
    })

  const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (!mounted) return
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setIsLoadingAuth(false)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [setCurrentUser])

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('atriumx_dark', darkMode ? '1' : '0')
  }, [darkMode])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev)
  }, [])

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      activeCategory, setActiveCategory,
      searchQuery, setSearchQuery,
      unreadMessageCount, setUnreadMessageCount,
      toasts, showToast,
      authPromptOpen, setAuthPromptOpen,
      redirectAfterLogin, setRedirectAfterLogin,
      isLoadingAuth,
      partner,
      businessProfile,
      refreshBusinessProfile,
      darkMode, toggleDarkMode,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
