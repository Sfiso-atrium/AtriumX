import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode
} from 'react'
import { Profile, restoreSession, getUnreadMessageCount } from '../services/dataService'
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

  const setCurrentUser = useCallback((user: Profile | null) => {
    setCurrentUserState(user)
    if (user) {
      getUnreadMessageCount(user.id).then(setUnreadMessageCount)
    } else {
      setUnreadMessageCount(0)
    }
  }, [])

useEffect(() => {
    let mounted = true

    restoreSession().then(profile => {
      if (mounted) {
        setCurrentUser(profile)
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
