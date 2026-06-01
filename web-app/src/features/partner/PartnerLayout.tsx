import { useCallback, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchPartnerInboxMessages } from '../../api/partner'
import { usePolling } from '../../hooks/usePolling'
import { PartnerBottomNav } from './PartnerBottomNav'
import { isPartnerFleetNavScreen } from './partnerMenuNav'
import { PartnerShellProvider, usePartnerShell, type PartnerShellTab } from './partnerShellContext'
import { PartnerWorkspaceProvider } from './partnerWorkspace'

function PartnerLayoutInner() {
  const {
    menuOpen,
    menuScreen,
    openMenu,
    closeMenu,
    inboxUnreadCount,
    setInboxUnreadCount,
  } = usePartnerShell()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onIndex = pathname === '/partner' || pathname === '/partner/'

  const loadUnread = useCallback(async () => {
    const rows = await fetchPartnerInboxMessages()
    return rows.filter((m) => !m.read).length
  }, [])

  const { data: unreadPolled } = usePolling(loadUnread, [loadUnread], menuScreen !== 'inbox', 15_000)

  useEffect(() => {
    if (menuScreen !== 'inbox' && unreadPolled != null) {
      setInboxUnreadCount(unreadPolled)
    }
  }, [menuScreen, unreadPolled, setInboxUnreadCount])

  const navActive = useMemo((): PartnerShellTab => {
    if (!menuOpen) return 'home'
    if (isPartnerFleetNavScreen(menuScreen)) return 'fleet'
    if (menuScreen === 'inbox') return 'inbox'
    return 'menu'
  }, [menuOpen, menuScreen])

  const handleBottomNav = useCallback(
    (tab: PartnerShellTab) => {
      if (tab === 'home') {
        closeMenu()
        if (!onIndex) navigate('/partner')
        return
      }
      if (tab === 'menu') {
        if (menuOpen) {
          closeMenu()
        } else {
          openMenu('root')
        }
        return
      }
      if (tab === 'fleet') {
        openMenu('fleet', 'root')
        if (!onIndex) navigate('/partner')
        return
      }
      if (tab === 'inbox') {
        openMenu('inbox')
        if (!onIndex) navigate('/partner')
      }
    },
    [closeMenu, menuOpen, navigate, onIndex, openMenu]
  )

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col">
      <div className={`flex min-h-0 flex-1 flex-col ${menuOpen ? '' : 'pb-[52px]'}`}>
        <Outlet />
      </div>
      {!menuOpen ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-lg">
          <PartnerBottomNav
            active={navActive}
            onSelect={handleBottomNav}
            inboxUnreadCount={inboxUnreadCount}
          />
        </div>
      ) : null}
    </div>
  )
}

export function PartnerLayout() {
  return (
    <PartnerShellProvider>
      <PartnerWorkspaceProvider>
        <PartnerLayoutInner />
      </PartnerWorkspaceProvider>
    </PartnerShellProvider>
  )
}
