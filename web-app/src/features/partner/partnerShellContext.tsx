import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { PartnerMenuScreen } from './PartnerSideMenu'
import { PARTNER_MENU_DEFAULT_BACK } from './partnerMenuNav'

export type PartnerShellTab = 'home' | 'fleet' | 'inbox' | 'menu'

type PartnerShellContextValue = {
  shellTab: PartnerShellTab
  setShellTab: (tab: PartnerShellTab) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  menuScreen: PartnerMenuScreen
  setMenuScreen: (screen: PartnerMenuScreen) => void
  navigateMenu: (screen: PartnerMenuScreen, backTo?: PartnerMenuScreen) => void
  goBackMenu: () => void
  openMenu: (screen?: PartnerMenuScreen, backTo?: PartnerMenuScreen) => void
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
  const menuBackOverridesRef = useRef<Partial<Record<PartnerMenuScreen, PartnerMenuScreen>>>({})

  const navigateMenu = useCallback((screen: PartnerMenuScreen, backTo?: PartnerMenuScreen) => {
    if (backTo !== undefined) {
      menuBackOverridesRef.current = { ...menuBackOverridesRef.current, [screen]: backTo }
    }
    setMenuScreen(screen)
  }, [])

  const goBackMenu = useCallback(() => {
    const back =
      menuBackOverridesRef.current[menuScreen] ??
      PARTNER_MENU_DEFAULT_BACK[menuScreen] ??
      'root'
    setMenuScreen(back)
  }, [menuScreen])

  const openMenu = useCallback((screen: PartnerMenuScreen = 'root', backTo?: PartnerMenuScreen) => {
    if (backTo !== undefined) {
      menuBackOverridesRef.current = { ...menuBackOverridesRef.current, [screen]: backTo }
    }
    setMenuScreen(screen)
    setMenuOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    menuBackOverridesRef.current = {}
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
        navigateMenu,
        goBackMenu,
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
