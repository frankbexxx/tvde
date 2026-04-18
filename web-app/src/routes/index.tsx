import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { PassengerDashboard } from '../features/passenger/PassengerDashboard'
import { DriverDashboard } from '../features/driver/DriverDashboard'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { PartnerDriverDetail } from '../features/partner/PartnerDriverDetail'
import { PartnerHome } from '../features/partner/PartnerHome'
import { PartnerTripDetail } from '../features/partner/PartnerTripDetail'
import { LoginScreen } from '../features/auth/LoginScreen'
import { DebugMapPage } from '../features/debug/DebugMapPage'
import { AppHeaderBar } from '../components/layout/AppHeaderBar'
import { isBackofficeStaffRole, useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'

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
    betaMode,
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
          Isto pode demorar alguns segundos na primeira utilização
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

  if (betaMode && !isAuthenticated) {
    const requestedRole = pathname.startsWith('/partner')
      ? 'partner'
      : pathname.startsWith('/driver')
        ? 'driver'
        : pathname.startsWith('/admin')
          ? 'admin'
          : 'passenger'
    return <LoginScreen requestedRole={requestedRole} />
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto">
      <AppHeaderBar />
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <main className="flex-1 overflow-y-auto min-h-0 min-w-0">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/passenger"
              element={
                <PassengerOnly>
                  <PassengerDashboard />
                </PassengerOnly>
              }
            />
            <Route
              path="/driver"
              element={
                <DriverOnly>
                  <DriverDashboard />
                </DriverOnly>
              }
            />
            <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <AdminDeniedRedirect />
                )
              }
            />
            <Route
              path="/partner"
              element={
                <PartnerGate>
                  <Outlet />
                </PartnerGate>
              }
            >
              <Route index element={<PartnerHome />} />
              <Route path="drivers/:userId" element={<PartnerDriverDetail />} />
              <Route path="trips/:tripId" element={<PartnerTripDetail />} />
            </Route>
            <Route path="/debug/map" element={<DebugMapPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
