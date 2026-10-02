import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { PartnerMenuScreen } from './PartnerSideMenu'
import { PARTNER_MENU_DEFAULT_BACK, partnerRootHighlightKey } from './partnerMenuNav'

export type PartnerTripsReturnScreen = 'trips' | 'trips_summary' | 'trips_list'

function rememberTripsScreen(
  screen: PartnerMenuScreen,
  store: { current: PartnerTripsReturnScreen | null },
) {
  if (screen === 'trips' || screen === 'trips_summary' || screen === 'trips_list') {
    store.current = screen
  }
}

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
  /** Último ecrã de viagens ainda aberto antes do menu fechar. */
  tripsReturnScreen: () => PartnerTripsReturnScreen
  inboxUnreadCount: number
  setInboxUnreadCount: (n: number) => void
  menuRootHighlight: string | null
}

const PartnerShellContext = createContext<PartnerShellContextValue | null>(null)

export function PartnerShellProvider({ children }: { children: ReactNode }) {
  const [shellTab, setShellTab] = useState<PartnerShellTab>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuScreen, setMenuScreen] = useState<PartnerMenuScreen>('root')
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)
  const [menuRootHighlight, setMenuRootHighlight] = useState<string | null>(null)
  const menuBackOverridesRef = useRef<Partial<Record<PartnerMenuScreen, PartnerMenuScreen>>>({})
  const lastTripsScreenRef = useRef<PartnerTripsReturnScreen | null>(null)

  const syncHighlight = useCallback((screen: PartnerMenuScreen) => {
    const key = partnerRootHighlightKey(screen)
    if (key) setMenuRootHighlight(key)
  }, [])

  const navigateMenu = useCallback((screen: PartnerMenuScreen, backTo?: PartnerMenuScreen) => {
    if (backTo !== undefined) {
      menuBackOverridesRef.current = { ...menuBackOverridesRef.current, [screen]: backTo }
    }
    rememberTripsScreen(screen, lastTripsScreenRef)
    syncHighlight(screen)
    setMenuScreen(screen)
  }, [syncHighlight])

  const goBackMenu = useCallback(() => {
    const back =
      menuBackOverridesRef.current[menuScreen] ??
      PARTNER_MENU_DEFAULT_BACK[menuScreen] ??
      'root'
    rememberTripsScreen(back, lastTripsScreenRef)
    setMenuScreen(back)
  }, [menuScreen])

  const openMenu = useCallback((screen: PartnerMenuScreen = 'root', backTo?: PartnerMenuScreen) => {
    if (backTo !== undefined) {
      menuBackOverridesRef.current = { ...menuBackOverridesRef.current, [screen]: backTo }
    }
    rememberTripsScreen(screen, lastTripsScreenRef)
    if (screen === 'root') setMenuRootHighlight(null)
    else syncHighlight(screen)
    setMenuScreen(screen)
    setMenuOpen(true)
  }, [syncHighlight])

  const tripsReturnScreen = useCallback((): PartnerTripsReturnScreen => {
    return lastTripsScreenRef.current ?? 'trips'
  }, [])

  const closeMenu = useCallback(() => {
    menuBackOverridesRef.current = {}
    setMenuScreen('root')
    setMenuOpen(false)
    setShellTab('home')
    setMenuRootHighlight(null)
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
        tripsReturnScreen,
        inboxUnreadCount,
        setInboxUnreadCount,
        menuRootHighlight,
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

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function useOptionalPartnerShell() {
  return useContext(PartnerShellContext)
}
