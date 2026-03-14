import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PassengerDashboard } from '../features/passenger/PassengerDashboard'
import { DriverDashboard } from '../features/driver/DriverDashboard'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { LoginScreen } from '../features/auth/LoginScreen'
import { DebugMapPage } from '../features/debug/DebugMapPage'
import { RoleSelector } from '../components/RoleSelector'
import { ActivityPanel } from '../components/ActivityPanel'
import { SettingsButton } from '../design-system/components/app/SettingsButton'
import { useAuth } from '../context/AuthContext'

export function AppRoutes() {
  const { pathname } = useLocation()
  const { isLoading, betaMode, isAuthenticated, isAdmin, logout, loadError, loadTokens } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-muted-foreground text-base">A carregar...</p>
        <p className="text-muted-foreground/70 text-sm">Pode demorar na primeira vez</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-base text-center">{loadError}</p>
        <button
          type="button"
          onClick={() => loadTokens()}
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
          <div className="flex items-center gap-2">
            <a
              href="#activity-log-panel"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log
            </a>
            {betaMode && (
              <button
                type="button"
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sair
              </button>
            )}
            <SettingsButton />
            <RoleSelector />
          </div>
        </div>
      </header>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <main className="flex-1 overflow-y-auto min-h-0 min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/passenger" replace />} />
            <Route path="/passenger" element={<PassengerDashboard />} />
            <Route path="/driver" element={<DriverDashboard />} />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/passenger" replace />
                )
              }
            />
            <Route path="/debug/map" element={<DebugMapPage />} />
          </Routes>
        </main>
        <ActivityPanel />
      </div>
    </div>
  )
}
