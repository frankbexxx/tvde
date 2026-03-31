import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PassengerDashboard } from '../features/passenger/PassengerDashboard'
import { DriverDashboard } from '../features/driver/DriverDashboard'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { LoginScreen } from '../features/auth/LoginScreen'
import { DebugMapPage } from '../features/debug/DebugMapPage'
import { SettingsButton } from '../design-system/components/app/SettingsButton'
import { ProfileButton } from '../design-system/components/app/ProfileButton'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'

function RootRedirect() {
  const { appRouteRole } = useAuth()
  return <Navigate to={appRouteRole === 'driver' ? '/driver' : '/passenger'} replace />
}

function PassengerOnly({ children }: { children: ReactNode }) {
  const { appRouteRole } = useAuth()
  if (appRouteRole === 'driver') return <Navigate to="/driver" replace />
  return <>{children}</>
}

function DriverOnly({ children }: { children: ReactNode }) {
  const { appRouteRole } = useAuth()
  if (appRouteRole === 'passenger') return <Navigate to="/passenger" replace />
  return <>{children}</>
}

function AdminDeniedRedirect() {
  const { appRouteRole } = useAuth()
  return <Navigate to={appRouteRole === 'driver' ? '/driver' : '/passenger'} replace />
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
    const requestedRole = pathname.startsWith('/driver') ? 'driver' : 'passenger'
    return <LoginScreen requestedRole={requestedRole} />
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0">
        <div className="flex justify-between items-center px-4 py-3 gap-2">
          <h1 className="text-lg font-bold text-foreground">TVDE</h1>
          <div className="flex items-center gap-1 shrink-0">
            <ProfileButton />
            <SettingsButton />
          </div>
        </div>
      </header>
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
            <Route path="/debug/map" element={<DebugMapPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
