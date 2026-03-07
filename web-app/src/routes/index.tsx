import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PassengerDashboard } from '../features/passenger/PassengerDashboard'
import { DriverDashboard } from '../features/driver/DriverDashboard'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { LoginScreen } from '../features/auth/LoginScreen'
import { RoleSelector } from '../components/RoleSelector'
import { ActivityPanel } from '../components/ActivityPanel'
import { useAuth } from '../context/AuthContext'

export function AppRoutes() {
  const { pathname } = useLocation()
  const { isLoading, betaMode, isAuthenticated, isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-500 text-base">A carregar...</p>
      </div>
    )
  }

  if (betaMode && !isAuthenticated) {
    const requestedRole = pathname.startsWith('/driver') ? 'driver' : 'passenger'
    return <LoginScreen requestedRole={requestedRole} />
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shrink-0">
        <div className="flex justify-between items-center max-w-md mx-auto px-4 py-3 gap-2">
          <h1 className="text-lg font-bold text-slate-900">TVDE</h1>
          <div className="flex items-center gap-2">
            <a
              href="#activity-log-panel"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Log
            </a>
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
          </Routes>
        </main>
        <ActivityPanel />
      </div>
    </div>
  )
}
