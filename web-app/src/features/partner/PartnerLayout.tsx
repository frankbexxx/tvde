import { useCallback, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchPartnerInboxMessages } from '../../api/partner'
import { usePolling } from '../../hooks/usePolling'
import { PartnerBottomNav } from './PartnerBottomNav'
import { PartnerShellProvider, usePartnerShell, type PartnerShellTab } from './partnerShellContext'

function PartnerLayoutInner() {
  const { shellTab, setShellTab, menuOpen, setMenuOpen, inboxUnreadCount, setInboxUnreadCount } =
    usePartnerShell()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onIndex = pathname === '/partner' || pathname === '/partner/'

  const loadUnread = useCallback(async () => {
    const rows = await fetchPartnerInboxMessages()
    return rows.filter((m) => !m.read).length
  }, [])

  const { data: unreadPolled } = usePolling(loadUnread, [loadUnread], shellTab !== 'inbox', 15_000)

  useEffect(() => {
    if (shellTab !== 'inbox' && unreadPolled != null) {
      setInboxUnreadCount(unreadPolled)
    }
  }, [shellTab, unreadPolled, setInboxUnreadCount])

  const handleBottomNav = (tab: PartnerShellTab) => {
    if (tab === 'menu') {
      setMenuOpen(true)
      return
    }
    setShellTab(tab)
    if (!onIndex) {
      navigate('/partner')
    }
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col">
      <div className={`flex min-h-0 flex-1 flex-col ${menuOpen ? '' : 'pb-[52px]'}`}>
        <Outlet />
      </div>
      {!menuOpen ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-lg">
          <PartnerBottomNav
            active={shellTab}
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
      <PartnerLayoutInner />
    </PartnerShellProvider>
  )
}
