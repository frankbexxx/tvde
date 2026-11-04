import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import '@/index.css'
import '@/i18n'
import { AuthProvider } from '@/context/AuthContext'
import { ActivityLogProvider } from '@/context/ActivityLogContext'
import { ActiveTripProvider } from '@/context/ActiveTripContext'
import { DevToolsCallbackProvider } from '@/context/DevToolsCallbackContext'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { Toaster } from '@/components/ui/sonner'

const params = new URLSearchParams(window.location.search)
const scene = params.get('scene') ?? 'passenger'
const insets = params.get('insets') ?? '0'

if (insets === 'android') {
  document.documentElement.style.setProperty('--safe-area-inset-top', '47px')
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px')
}
if (insets === 'tall') {
  document.documentElement.style.setProperty('--safe-area-inset-top', '80px')
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px')
}

localStorage.clear()
sessionStorage.clear()

const fetches: string[] = []
window.fetch = async (input: RequestInfo | URL) => {
  const url = String(input)
  fetches.push(url)
  if (/^https?:\/\//i.test(url) && !url.includes('127.0.0.1') && !url.includes('localhost')) {
    throw new Error(`pedido externo bloqueado: ${url}`)
  }
  let body: unknown = {}
  if (url.includes('/config')) {
    body = { google_oauth_enabled: false, otp_signup_enabled: false }
  } else if (url.includes('/partner/drivers/')) {
    body = {
      user_id: 'drv-fixture',
      partner_id: 'prt-fixture',
      status: 'rejected',
      is_available: false,
      user: { name: 'Motorista fictício', phone: null },
      last_location: null,
      documents: null,
      vehicle_plate: 'AA-00-AA',
    }
  } else if (url.includes('/partner/trips')) {
    body = []
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
  ; (window as Window & { __p3Fetches?: string[] }).__p3Fetches = fetches

function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ActivityLogProvider>
        <DevToolsCallbackProvider>
          <ActiveTripProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ActiveTripProvider>
        </DevToolsCallbackProvider>
      </ActivityLogProvider>
    </LocaleProvider>
  )
}

async function sceneElement() {
  if (scene === 'passenger') {
    const { AppHeaderBar } = await import('@/components/layout/AppHeaderBar')
    const { ScreenContainer } = await import('@/components/layout/ScreenContainer')
    const { PASSENGER_MAP_FRAME_CLASS, PassengerMapNotices } = await import(
      '@/features/passenger/PassengerMapNotices'
    )
    return (
      <BrowserRouter>
        <Providers>
          <div className="flex h-dvh min-h-0 flex-col bg-background">
            <AppHeaderBar variant="userCompact" />
            <div className="flex min-h-0 flex-1 flex-col">
              <ScreenContainer fullBleed contentVariant="driverImmersive" mainScrollable={false}>
                <div className={PASSENGER_MAP_FRAME_CLASS} data-testid="passenger-main">
                  <div data-testid="passenger-map-stage" className="min-h-0 flex-1 bg-muted/40" />
                  <PassengerMapNotices
                    error="Aviso fictício de erro"
                    historyPollFault
                    onDismissError={() => undefined}
                  />
                </div>
              </ScreenContainer>
            </div>
          </div>
        </Providers>
      </BrowserRouter>
    )
  }

  if (scene === 'driver') {
    const { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } = await import(
      '@/components/ui/dialog'
    )
    const lines = Array.from({ length: 28 }, (_, index) => `Linha fictícia ${index + 1} do histórico do motorista.`)
    return (
      <BrowserRouter>
        <Providers>
          <Dialog open>
            <DialogContent
              safeArea
              data-testid="driver-history-trip-detail"
              overlayClassName="z-[70]"
              className="z-[70] max-w-[min(100vw-1.5rem,520px)]"
            >
              <DialogHeader>
                <DialogTitle>Detalhe da viagem</DialogTitle>
                <DialogDescription>Histórico fictício, longo o suficiente para scroll.</DialogDescription>
              </DialogHeader>
              {lines.map((line) => (
                <p key={line} className="text-sm text-foreground">
                  {line}
                </p>
              ))}
              <button type="button" className="min-h-11 rounded-md border px-3" data-testid="driver-history-last">
                Último controlo
              </button>
            </DialogContent>
          </Dialog>
        </Providers>
      </BrowserRouter>
    )
  }

  if (scene === 'admin') {
    const { AdminTabPending } = await import('@/features/admin/tabs/AdminTabPending')
    return (
      <BrowserRouter>
        <Providers>
          <div className="p-6">
            <AdminTabPending
              pending={[{ phone: 'conta-ficticia', requested_role: 'driver' }]}
              handleApprove={() => undefined}
            />
          </div>
        </Providers>
      </BrowserRouter>
    )
  }

  const { PartnerDriverDetail } = await import('@/features/partner/PartnerDriverDetail')
  return (
    <MemoryRouter initialEntries={['/partner/drivers/drv-fixture']}>
      <Providers>
        <Routes>
          <Route path="/partner/drivers/:userId" element={<PartnerDriverDetail />} />
        </Routes>
      </Providers>
    </MemoryRouter>
  )
}

void sceneElement().then((element) => {
  createRoot(document.getElementById('root')!).render(element)
})
