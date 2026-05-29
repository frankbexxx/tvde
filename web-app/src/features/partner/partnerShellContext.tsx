import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { PartnerMenuScreen } from './PartnerSideMenu'

export type PartnerShellTab = 'home' | 'fleet' | 'inbox' | 'menu'

type PartnerShellContextValue = {
  shellTab: PartnerShellTab
  setShellTab: (tab: PartnerShellTab) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  menuScreen: PartnerMenuScreen
  setMenuScreen: (screen: PartnerMenuScreen) => void
  openMenu: (screen?: PartnerMenuScreen) => void
  closeMenu: () => void
  inboxUnreadCount: number
  setInboxUnreadCount: (n: number) => void
}

const PartnerShellContext = createContext<PartnerShellContextValue | null>(null)

export function PartnerShellProvider({ children }: { children: ReactNode }) {
  const [shellTab, setShellTab] = useState<PartnerShellTab>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuScreen, setMenuScreen] = useState<PartnerMenuScreen>('root')
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)

  const openMenu = useCallback((screen: PartnerMenuScreen = 'root') => {
    setMenuScreen(screen)
    setMenuOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuScreen('root')
    setMenuOpen(false)
    setShellTab('home')
  }, [])

  return (
    <PartnerShellContext.Provider
      value={{
        shellTab,
        setShellTab,
        menuOpen,
        setMenuOpen,
        menuScreen,
        setMenuScreen,
        openMenu,
        closeMenu,
        inboxUnreadCount,
        setInboxUnreadCount,
      }}
    >
      {children}
    </PartnerShellContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function usePartnerShell() {
  const ctx = useContext(PartnerShellContext)
  if (!ctx) throw new Error('usePartnerShell must be used within PartnerShellProvider')
  return ctx
}
