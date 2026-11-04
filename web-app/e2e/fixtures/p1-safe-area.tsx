import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/index.css'
import '@/i18n'
import { AuthProvider } from '@/context/AuthContext'
import { ActivityLogProvider } from '@/context/ActivityLogContext'
import { ActiveTripProvider } from '@/context/ActiveTripContext'
import { DevToolsCallbackProvider } from '@/context/DevToolsCallbackContext'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { Toaster } from '@/components/ui/sonner'

const params = new URLSearchParams(window.location.search)
const scene = params.get('scene') ?? 'login'

if (params.get('insets') === 'android') {
  document.documentElement.style.setProperty('--safe-area-inset-top', '47px')
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
  const body = url.includes('/config')
    ? { google_oauth_enabled: false, otp_signup_enabled: false }
    : {}
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
;(window as Window & { __p1Fetches?: string[] }).__p1Fetches = fetches

function Frame({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <ActivityLogProvider>
          <DevToolsCallbackProvider>
            <ActiveTripProvider>
              <AuthProvider>{children}</AuthProvider>
            </ActiveTripProvider>
          </DevToolsCallbackProvider>
        </ActivityLogProvider>
        <Toaster />
      </LocaleProvider>
    </BrowserRouter>
  )
}

async function sceneElement() {
  if (scene === 'onboarding') {
    const { GooglePassengerOnboarding } = await import('@/features/auth/GooglePassengerOnboarding')
    return (
      <GooglePassengerOnboarding
        email="pessoa.ficticia@example.com"
        suggestedName={'Nome fictício '.repeat(12)}
        idToken="fixture-token"
        onComplete={async () => undefined}
        onLink={async () => undefined}
        onDone={() => undefined}
        onRestart={() => undefined}
      />
    )
  }
  if (scene === 'profile' || scene === 'settings') {
    const [{ ProfileButton }, { SettingsButton }] = await Promise.all([
      import('@/design-system/components/app/ProfileButton'),
      import('@/design-system/components/app/SettingsButton'),
    ])
    return (
      <Frame>
        <div className="p-4">
          {scene === 'profile' ? <ProfileButton /> : <SettingsButton />}
        </div>
      </Frame>
    )
  }
  if (scene === 'admin') {
    const [{ AdminDashboard }, { AppHeaderBar }] = await Promise.all([
      import('@/features/admin/AdminDashboard'),
      import('@/components/layout/AppHeaderBar'),
    ])
    return (
      <Frame>
        <div className="flex h-dvh min-h-0 flex-col bg-background">
          <AppHeaderBar variant="default" />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="p1-admin-scroll">
            <AdminDashboard />
          </main>
        </div>
      </Frame>
    )
  }
  if (scene === 'planner' || scene === 'driver-map') {
    const [{ MapStage }, { PassengerBottomNav }, { TripPlannerPanel }, insets] = await Promise.all([
      import('@/components/layout/MapStage'),
      import('@/features/passenger/PassengerBottomNav'),
      import('@/features/passenger/TripPlannerPanel'),
      import('@/components/layout/safeAreaInsets'),
    ])
    const nav = (
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40">
        <PassengerBottomNav active="home" onSelect={() => undefined} />
      </div>
    )
    if (scene === 'driver-map') {
      return (
        <div className="relative h-dvh bg-muted" data-testid="p1-driver-map-stage">
          <MapStage className="h-full" testId="p1-driver-map" map={{ showMap: false, mapPlaceholder: 'Mapa fictício' }}>
            <div
              data-testid="p1-driver-inner"
              className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 pointer-events-none"
            >
              <div
                data-testid="p1-driver-bottom"
                className="pointer-events-auto mt-auto rounded-xl bg-background px-3 py-2 text-sm"
              >
                Aviso fictício no fundo do mapa
              </div>
            </div>
          </MapStage>
          {nav}
        </div>
      )
    }
    return (
      <div className="relative h-dvh bg-muted" data-testid="p1-planner-stage">
        <MapStage
          className="h-full"
          testId="p1-map"
          map={{ showMap: false, mapPlaceholder: 'Mapa fictício' }}
          overlayClassName={`relative z-10 flex h-full min-h-0 flex-1 flex-col justify-end px-2 pt-2 ${insets.SCREEN_INSET_SCROLL_CLEARANCE_CLASS} pointer-events-none`}
          bottomOverlay={
            <TripPlannerPanel
              uiState="confirming"
              hasPickup
              hasDropoff
              pickupAddress="Origem fictícia"
              dropoffAddress={'Destino fictício '.repeat(30)}
              pickupAddressLoading={false}
              dropoffAddressLoading={false}
              routeMeta={{ durationSec: 600, distanceM: 3200 }}
              routeMetaLoading={false}
              activeTrip={null}
              onChooseMap={() => undefined}
              onSetDestinationHint={() => undefined}
              onReset={() => undefined}
              onConfirmTrip={() => undefined}
            />
          }
        />
        {nav}
      </div>
    )
  }
  const { LoginScreen } = await import('@/features/auth/LoginScreen')
  return (
    <Frame>
      <LoginScreen requestedRole="passenger" />
    </Frame>
  )
}

const root = document.getElementById('root')
if (root) {
  void sceneElement().then((element) => {
    createRoot(root).render(element)
  })
}
