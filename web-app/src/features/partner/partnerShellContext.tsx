import { createContext, useContext, useState, type ReactNode } from 'react'

export type PartnerShellTab = 'home' | 'fleet' | 'inbox' | 'menu'

type PartnerShellContextValue = {
  shellTab: PartnerShellTab
  setShellTab: (tab: PartnerShellTab) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  inboxUnreadCount: number
  setInboxUnreadCount: (n: number) => void
}

const PartnerShellContext = createContext<PartnerShellContextValue | null>(null)

export function PartnerShellProvider({ children }: { children: ReactNode }) {
  const [shellTab, setShellTab] = useState<PartnerShellTab>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)
  return (
    <PartnerShellContext.Provider
      value={{
        shellTab,
        setShellTab,
        menuOpen,
        setMenuOpen,
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
