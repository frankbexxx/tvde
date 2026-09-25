import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GoogleOAuthCallback } from '../features/auth/GoogleOAuthCallback'
import { LegalAcceptanceBoundary } from '../features/auth/LegalAcceptanceGate'
import { LoginScreen } from '../features/auth/LoginScreen'
import { AppDownloadLanding } from '../features/public/AppDownloadLanding'
import { AppDownloadRedirect } from '../features/public/AppDownloadRedirect'
import { AppHeaderBar } from '../components/layout/AppHeaderBar'
import { isBackofficeStaffRole, useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'

const PassengerDashboard = lazy(() =>
  import('../features/passenger/PassengerDashboard').then((m) => ({
    default: m.PassengerDashboard,
  })),
)
const DriverDashboard = lazy(() =>
  import('../features/driver/DriverDashboard').then((m) => ({
    default: m.DriverDashboard,
  })),
)
const AdminDashboard = lazy(() =>
  import('../features/admin/AdminDashboard').then((m) => ({
    default: m.AdminDashboard,
  })),
)
const PartnerLayout = lazy(() =>
  import('../features/partner/PartnerLayout').then((m) => ({
    default: m.PartnerLayout,
  })),
)
const PartnerHome = lazy(() =>
  import('../features/partner/PartnerHome').then((m) => ({
    default: m.PartnerHome,
  })),
)
const PartnerDriverDetail = lazy(() =>
  import('../features/partner/PartnerDriverDetail').then((m) => ({
    default: m.PartnerDriverDetail,
  })),
)
const PartnerTripDetail = lazy(() =>
  import('../features/partner/PartnerTripDetail').then((m) => ({
    default: m.PartnerTripDetail,
  })),
)
const DebugMapPage = lazy(() =>
  import('../features/debug/DebugMapPage').then((m) => ({
    default: m.DebugMapPage,
  })),
)

function RouteChunkFallback() {
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-4">
      <Spinner size="lg" />
    </div>
  )
}

function withRouteSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteChunkFallback />}>{node}</Suspense>
}

function RootRedirect() {
  const { appRouteRole, sessionRole } = useAuth()
  const { search } = useLocation()
  if (isBackofficeStaffRole(sessionRole)) return <Navigate to={`/admin${search}`} replace />
  if (sessionRole === 'partner') return <Navigate to="/partner" replace />
  if (appRouteRole === 'partner') return <Navigate to="/partner" replace />
  return <Navigate to={appRouteRole === 'driver' ? '/driver' : '/passenger'} replace />
}

function PassengerOnly({ children }: { children: ReactNode }) {
  const { appRouteRole, sessionRole } = useAuth()
  if (isBackofficeStaffRole(sessionRole)) {
    return <Navigate to="/admin" replace />
  }
  if (appRouteRole === 'partner' && sessionRole === 'partner') {
    return <Navigate to="/partner" replace />
  }
  /** Só enviar para /driver se o JWT for mesmo de motorista (evita 403 e loop com DriverOnly). */
  if (appRouteRole === 'driver' && sessionRole === 'driver') {
    return <Navigate to="/driver" replace />
  }
  return <>{children}</>
}

function DriverOnly({ children }: { children: ReactNode }) {
  const { appRouteRole, sessionRole } = useAuth()
  if (appRouteRole === 'passenger') return <Navigate to="/passenger" replace />
  /** Em BETA o mesmo token preenche passenger/driver/admin; só motoristas podem usar estas APIs. */
  if (sessionRole !== 'driver') {
    if (isBackofficeStaffRole(sessionRole)) return <Navigate to="/admin" replace />
    if (sessionRole === 'partner') return <Navigate to="/partner" replace />
    return <Navigate to="/passenger" replace />
  }
  return <>{children}</>
}

function AdminDeniedRedirect() {
  const { appRouteRole, sessionRole } = useAuth()
  if (sessionRole === 'partner') return <Navigate to="/partner" replace />
  if (appRouteRole === 'partner') return <Navigate to="/partner" replace />
  return <Navigate to={appRouteRole === 'driver' ? '/driver' : '/passenger'} replace />
}

function PartnerGate({ children }: { children: React.ReactNode }) {
  const { isPartnerUser, token } = useAuth()
  if (!token) return <Navigate to="/passenger" replace />
  if (!isPartnerUser) return <Navigate to="/passenger" replace />
  return <>{children}</>
}

export function AppRoutes() {
  const { pathname } = useLocation()
  const {
    isLoading,
    authBootstrapMode,
    isAuthenticated,
    isAdmin,
    loadError,
    loadTokens,
    splashPrimary,
  } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <Spinner size="lg" />
        <p className="text-foreground text-base font-medium text-center">{splashPrimary}</p>
        <p className="text-muted-foreground/90 text-sm text-center max-w-xs">
          Pode demorar alguns segundos na primeira utilização.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-base text-center">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadTokens()}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // LoginScreen: independente de BETA — qualquer bootstrap `login_session` (deployed ou beta).
  if (authBootstrapMode === 'login_session' && !isAuthenticated) {
    if (pathname === '/dl' || pathname === '/app') {
      return <AppDownloadRedirect />
    }
    if (pathname === '/download') {
      return <AppDownloadLanding />
    }
    if (pathname.startsWith('/auth/google/callback')) {
      return <GoogleOAuthCallback />
    }
    const requestedRole = pathname.startsWith('/partner')
      ? 'partner'
      : pathname.startsWith('/driver')
        ? 'driver'
        : pathname.startsWith('/admin')
          ? 'admin'
          : 'passenger'
    return <LoginScreen requestedRole={requestedRole} />
  }

  const immersiveMapShell = pathname.startsWith('/driver') || pathname.startsWith('/passenger')
  const appShellClass = immersiveMapShell
    ? 'min-h-dvh bg-background flex flex-col w-full max-w-none'
    : 'min-h-dvh bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto'

  return (
    <LegalAcceptanceBoundary>
    <div className={appShellClass}>
      <AppHeaderBar
        variant={
          pathname.startsWith('/driver') ||
            pathname.startsWith('/passenger') ||
            pathname.startsWith('/partner')
            ? 'userCompact'
            : 'default'
        }
      />
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${immersiveMapShell ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          {/* Repassa altura aos ecrãs com mapa fillContainer (motorista + passageiro). */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Routes>
              <Route path="/dl" element={<AppDownloadRedirect />} />
              <Route path="/app" element={<AppDownloadRedirect />} />
              <Route path="/download" element={<AppDownloadLanding />} />
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/passenger"
                element={
                  <PassengerOnly>
                    {withRouteSuspense(<PassengerDashboard />)}
                  </PassengerOnly>
                }
              />
              <Route
                path="/driver"
                element={
                  <DriverOnly>
                    {withRouteSuspense(<DriverDashboard />)}
                  </DriverOnly>
                }
              />
              <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
              <Route
                path="/admin"
                element={
                  isAdmin ? (
                    withRouteSuspense(<AdminDashboard />)
                  ) : (
                    <AdminDeniedRedirect />
                  )
                }
              />
              <Route
                path="/partner"
                element={
                  <PartnerGate>
                    {withRouteSuspense(<PartnerLayout />)}
                  </PartnerGate>
                }
              >
                <Route index element={withRouteSuspense(<PartnerHome />)} />
                <Route
                  path="drivers/:userId"
                  element={withRouteSuspense(<PartnerDriverDetail />)}
                />
                <Route
                  path="trips/:tripId"
                  element={withRouteSuspense(<PartnerTripDetail />)}
                />
              </Route>
              <Route
                path="/debug/map"
                element={
                  import.meta.env.DEV
                    ? withRouteSuspense(<DebugMapPage />)
                    : <Navigate to="/" replace />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
    </LegalAcceptanceBoundary>
  )
}
